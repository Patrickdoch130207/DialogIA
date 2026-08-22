
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security import OAuth2PasswordRequestForm 
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
import models, schemas, security

router = APIRouter(prefix="/auth", tags=["auth"])

# Indique à Swagger/FastAPI où se trouve l'endpoint de login (pour le bouton
# "Authorize" dans /docs) — n'affecte pas la logique elle-même.
oauth2_scheme_agent = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme_operator = HTTPBearer()

MAX_PIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 10


# ---------------------------------------------------------------------------
# Étape 1 — connexion au compte agent partagé
# ---------------------------------------------------------------------------



@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.User).where(
            models.User.login_username == form_data.username,
            models.User.role == models.UserRole.agent,
        )
    )
    user = result.scalar_one_or_none()

    # Ta logique de sécurité reste intacte
    if not user or not user.hashed_password or not security.verify_secret(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides"
        )

    token = security.create_access_token(
        data={"sub": str(user.id), "type": "agent_session"},
        expires_minutes=security.AGENT_TOKEN_EXPIRE_MINUTES,
    )
    return schemas.TokenResponse(access_token=token)


async def get_current_agent(
    token: str = Depends(oauth2_scheme_agent), db: AsyncSession = Depends(get_db)
) -> models.User:
    payload = security.decode_token(token)
    if payload is None or payload.get("type") not in ("agent_session", "operator_session"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide : sub manquant")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return user


# ---------------------------------------------------------------------------
# Étape 2 — identification de l'opérateur (PIN), à l'intérieur de la session agent
# ---------------------------------------------------------------------------

@router.post("/operator-login", response_model=schemas.TokenResponse)
async def operator_login(
    payload: schemas.OperatorLoginRequest,
    current_agent: models.User = Depends(get_current_agent),  # exige un token agent valide au préalable
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Operator).where(models.Operator.display_name == payload.display_name)
    )
    operator = result.scalar_one_or_none()

    if not operator or not operator.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opérateur introuvable")

    now = datetime.now(timezone.utc)

    # Verrou actif : on refuse AVANT même de vérifier le PIN. Important pour
    # ne pas laisser un attaquant continuer à tester des PIN pendant le blocage.
    if operator.locked_until and operator.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Trop de tentatives, réessaie plus tard",
        )

    if not security.verify_secret(payload.pin, operator.pin_hash):
        operator.failed_attempts += 1
        if operator.failed_attempts >= MAX_PIN_ATTEMPTS:
            operator.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN incorrect")

    # PIN correct : on réinitialise le compteur (sinon une seule erreur
    # ancienne finirait, avec le temps, par accumuler jusqu'au blocage).
    operator.failed_attempts = 0
    operator.locked_until = None
    await db.commit()

    token = security.create_access_token(
        data={
            "sub": str(current_agent.id),
            "operator_id": str(operator.id),
            "type": "operator_session",
        },
        expires_minutes=security.OPERATOR_TOKEN_EXPIRE_MINUTES,
    )
    return schemas.TokenResponse(access_token=token)


async def get_current_operator(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme_operator),
    db: AsyncSession = Depends(get_db)
) -> models.Operator:
    token = credentials.credentials
    payload = security.decode_token(token)
    if payload is None or payload.get("type") != "operator_session":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identification opérateur requise",
        )

    operator_id = payload.get("operator_id")
    if operator_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide : operator_id manquant",
        )

    result = await db.execute(
        select(models.Operator).where(models.Operator.id == operator_id)
    )
    operator = result.scalar_one_or_none()
    if operator is None or not operator.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Opérateur invalide")
    return operator