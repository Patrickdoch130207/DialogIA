import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY manquant dans le .env")
if len(SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY trop courte (minimum 32 caractères recommandé)")

ALGORITHM = "HS256"

AGENT_TOKEN_EXPIRE_MINUTES = 60 * 8
OPERATOR_TOKEN_EXPIRE_MINUTES = 60 * 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_secret(secret: str) -> str:
    """Hash un mot de passe ou un PIN avant stockage en base."""
    return pwd_context.hash(secret)


def verify_secret(secret: str, hashed: str) -> bool:
    """Compare une valeur en clair (saisie par l'utilisateur) à son hash stocké."""
    return pwd_context.verify(secret, hashed)


def create_access_token(data: dict, expires_minutes: int) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None