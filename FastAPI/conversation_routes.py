from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import uuid as uuid_lib
from typing import List
from auth_routes import get_current_agent
from database import get_db
import models, schemas
from audio_utils import convertir_audio_16khz_mono, sauvegarder_audio
from ai_pipeline import transcrire_fon, traduire, synthetiser_fon


router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=schemas.ConversationOut)
async def get_or_create_conversation(
    client_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the client's conversation, or create it if it doesn't exist."""

    result = await db.execute(
        select(models.Conversation)
        .options(
            selectinload(models.Conversation.client),
            selectinload(models.Conversation.messages),
        )
        .where(models.Conversation.client_id == client_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    client_check = await db.execute(select(models.User).where(models.User.id == client_id))
    if client_check.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable")

    conversation = models.Conversation(client_id=client_id, status=models.ConversationStatus.open)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation, attribute_names=["client", "agent", "messages"])
    return conversation

@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with its client info and message history."""
    result = await db.execute(
        select(models.Conversation)
        .options(
            selectinload(models.Conversation.client),
            selectinload(models.Conversation.messages),
        )
        .where(models.Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation introuvable")
    return conversation

@router.get("", response_model=List[schemas.ConversationOut])
async def list_conversations(
    current_agent: models.User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations, ordered by most recently updated first."""
    result = await db.execute(
        select(models.Conversation)
        .options(
            selectinload(models.Conversation.client),
            selectinload(models.Conversation.messages),
        )
        .order_by(models.Conversation.updated_at.desc())
    )
    return result.scalars().all()

@router.post("/{conversation_id}/messages/incoming", response_model=schemas.MessageIncomingResponse)
async def recevoir_message_client(
    conversation_id: str,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Receive a client's audio message, transcribe and translate it."""

    result = await db.execute(
        select(models.Conversation)
        .options(selectinload(models.Conversation.client))
        .where(models.Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation introuvable")

    message_id = str(uuid_lib.uuid4())
    contenu_original = await audio.read()
    extension_originale = audio.filename.split(".")[-1] if audio.filename else "webm"

    chemin_original = sauvegarder_audio(
        contenu_original, conversation_id, message_id, "incoming", "original", extension_originale
    )

    audio_16khz = convertir_audio_16khz_mono(contenu_original)
    sauvegarder_audio(audio_16khz, conversation_id, message_id, "incoming", "16khz", "wav")

    langue = "fon"

    raw_transcription, confidence_score = transcrire_fon(audio_16khz)
    translated_text = traduire(raw_transcription, "fon_Latn", "fra_Latn")
    message_status = "auto_validated" if confidence_score > 0.85 else "manual_review_required"

    nouveau_message = models.Message(
        id=message_id,
        conversation_id=conversation_id,
        sender_id=conversation.client_id,
        direction=models.MessageDirection.incoming,
        audio_path=chemin_original,
        detected_language=langue,
        raw_transcription=raw_transcription,
        confidence_score=confidence_score,
        translated_text=translated_text,
        status=message_status,
    )
    db.add(nouveau_message)
    await db.commit()
    await db.refresh(nouveau_message)

    training_sample = models.TrainingSample(
        message_id=nouveau_message.id,
        audio_path=chemin_original,
        raw_transcription=raw_transcription,
    )
    db.add(training_sample)
    await db.commit()

    return nouveau_message

from auth_routes import get_current_operator

@router.post("/{conversation_id}/messages/outgoing", response_model=schemas.MessageOutgoingResponse)
async def envoyer_message_agent(
    conversation_id: str,
    payload: schemas.MessageOutgoingRequest,
    current_operator: models.Operator = Depends(get_current_operator),
    db: AsyncSession = Depends(get_db),
):
    """Send the operator's French reply, translate it to fon and synthesize audio."""

    result = await db.execute(
        select(models.Conversation).where(models.Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation introuvable")

    agent_result = await db.execute(select(models.User).where(models.User.role == models.UserRole.agent))
    agent_user = agent_result.scalar_one_or_none()
    if agent_user is None:
        raise HTTPException(status_code=500, detail="Compte agent introuvable en base")

    if conversation.agent_id is None:
        conversation.agent_id = agent_user.id

    message_id = str(uuid_lib.uuid4())

    translated_text = traduire(payload.text, "fra_Latn", "fon_Latn")

    audio_tts = synthetiser_fon(translated_text)
    chemin_tts = sauvegarder_audio(audio_tts, conversation_id, message_id, "outgoing", "tts", "wav")

    nouveau_message = models.Message(
        id=message_id,
        conversation_id=conversation_id,
        sender_id=agent_user.id,
        handled_by_operator_id=current_operator.id,
        direction=models.MessageDirection.outgoing,
        detected_language="fr",
        translated_text=translated_text,
        tts_audio_path=chemin_tts,
    )
    db.add(nouveau_message)
    await db.commit()
    await db.refresh(nouveau_message)

    return nouveau_message