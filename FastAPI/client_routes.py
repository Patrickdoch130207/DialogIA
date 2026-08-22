from fastapi import APIRouter,Depends, HTTPException,status
from sqlalchemy import select,func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
import models,schemas
from auth_routes import get_current_agent


router = APIRouter(prefix="/clients", tags=["clients"])



@router.post("", response_model=schemas.ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(db: AsyncSession = Depends(get_db)):
    client = models.User(role=models.UserRole.client)  # display_number omis -> la séquence l'assigne
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client



@router.patch("/{client_id}", response_model=schemas.ClientOut)
async def update_client(
    client_id: str,
    payload: schemas.ClientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.User).where(models.User.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=schemas.ClientOut)
async def get_client(
    client_id :str,
    current_agent: models.User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.User).where(
            
            models.User.id == client_id,models.User.role == models.UserRole.client
        )
    )
    
    client = result.scalar_one_or_none()
    if client is None : 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail= "Client introuvable" )
    
    return client