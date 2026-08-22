from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
import models, schemas
from auth_routes import get_current_agent

router = APIRouter(prefix="/training-samples", tags=["training-samples"])


@router.get("", response_model=List[schemas.TrainingSampleOut])
async def list_training_samples(
    annotated: Optional[bool] = None,
    current_agent: models.User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """List training samples, optionally filtered by annotation status."""
    query = select(models.TrainingSample)
    if annotated is True:
        query = query.where(models.TrainingSample.final_transcription.isnot(None))
    elif annotated is False:
        query = query.where(models.TrainingSample.final_transcription.is_(None))
    query = query.order_by(models.TrainingSample.created_at.asc())

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats", response_model=schemas.TrainingSampleStats)
async def get_training_samples_stats(
    current_agent: models.User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Get annotation progress statistics."""
    total_result = await db.execute(select(func.count()).select_from(models.TrainingSample))
    total = total_result.scalar()

    annotated_result = await db.execute(
        select(func.count())
        .select_from(models.TrainingSample)
        .where(models.TrainingSample.final_transcription.isnot(None))
    )
    annotated = annotated_result.scalar()

    return schemas.TrainingSampleStats(total=total, annotated=annotated, pending=total - annotated)


@router.patch("/{sample_id}", response_model=schemas.TrainingSampleOut)
async def update_training_sample(
    sample_id: str,
    payload: schemas.TrainingSampleUpdate,
    current_agent: models.User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Submit the corrected transcription for a training sample."""
    result = await db.execute(select(models.TrainingSample).where(models.TrainingSample.id == sample_id))
    sample = result.scalar_one_or_none()
    if sample is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Échantillon introuvable")

    sample.final_transcription = payload.final_transcription
    await db.commit()
    await db.refresh(sample)
    return sample