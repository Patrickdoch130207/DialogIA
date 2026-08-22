
import enum
import uuid

from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    Sequence,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

# Adapte ce chemin d'import à l'endroit où tu as déclaré `Base` dans ton database.py
from database import Base


# ---------------------------------------------------------------------------
# ENUMS
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    client = "client"
    agent = "agent"  # un seul enregistrement de ce rôle : le compte agent partagé


class Language(str, enum.Enum):
    fon = "fon"
    fr = "fr"


class MessageDirection(str, enum.Enum):
    incoming = "incoming"   # client -> agent
    outgoing = "outgoing"   # agent -> client


class MessageStatus(str, enum.Enum):
    auto_validated = "auto_validated"                 # score > 85%, transcription fiable
    manual_review_required = "manual_review_required"  # score < 85%, transcription douteuse mais transmise


class ConversationStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"


# ---------------------------------------------------------------------------
# USERS — clients + le compte agent unique partagé
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    first_name = Column(String(100), nullable=True) 
    last_name = Column(String(100), nullable=True)
    phone_number = Column(String(30), unique=True, nullable=True)
    display_number = Column(Integer, Sequence('client_display_number_seq'),unique=True,nullable=True)

    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.client)

    # Pour un client : déduit automatiquement de la langue détectée sur son 1er message
    # (pas demandé). Nullable tant qu'aucun message n'a encore été reçu.
    preferred_language = Column(SAEnum(Language), nullable=True)

    # Uniquement pertinent pour l'unique ligne role=agent : identifiants de connexion
    # du compte partagé (mot de passe hashé, jamais en clair).
    login_username = Column(String(100), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relations
    conversations_as_client = relationship(
        "Conversation", back_populates="client", foreign_keys="Conversation.client_id", lazy="selectin"
    )
    conversations_as_agent = relationship(
        "Conversation", back_populates="agent", foreign_keys="Conversation.agent_id", lazy="selectin"
    )
    messages = relationship("Message", back_populates="sender", lazy="selectin")


# ---------------------------------------------------------------------------
# OPERATORS — identité interne (qui, physiquement, répond au nom du compte
# agent partagé). Jamais exposée au client. Créés uniquement par toi (seeder).
# ---------------------------------------------------------------------------

class Operator(Base):
    __tablename__ = "operators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_name = Column(String(100), nullable=False)

    # PIN personnel (4 chiffres par défaut), hashé — jamais stocké en clair.
    pin_hash = Column(String(255), nullable=False)

    # Rate limiting anti-bruteforce sur le PIN (voir security.py / auth_routes.py)
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    messages_handled = relationship("Message", back_populates="handled_by_operator", lazy="selectin")


# ---------------------------------------------------------------------------
# CONVERSATIONS (un fil = une plainte / un avis client)
# ---------------------------------------------------------------------------

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    status = Column(SAEnum(ConversationStatus), nullable=False, default=ConversationStatus.open)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations
    client = relationship("User", back_populates="conversations_as_client", foreign_keys=[client_id], lazy="selectin")
    agent = relationship("User", back_populates="conversations_as_agent", foreign_keys=[agent_id], lazy="selectin")
    messages = relationship(
        "Message", back_populates="conversation", order_by="Message.created_at", lazy="selectin"
    )


# ---------------------------------------------------------------------------
# MESSAGES — recentrée sur le besoin opérationnel temps réel uniquement.
# (le dataset d'entraînement vit désormais à part, dans training_samples)
# ---------------------------------------------------------------------------

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Traçabilité interne uniquement (jamais exposée au client) — qui, dans
    # l'équipe, a traité ce message sortant. Nullable : reste vide pour les
    # messages entrants (client -> agent), rempli seulement pour les sortants.
    handled_by_operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id"), nullable=True)

    direction = Column(SAEnum(MessageDirection), nullable=False)

    # --- Audio & pipeline STT ---
    audio_path = Column(String(500), nullable=True)  # nullable : un fr direct peut ne pas nécessiter de fichier stocké séparément si non pertinent
    detected_language = Column(SAEnum(Language), nullable=False)

    # Ce que l'agent lit immédiatement pour traiter la plainte (usage temps réel,
    # pas d'entraînement — cette donnée est dupliquée dans training_samples).
    raw_transcription = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)  # pertinent seulement si detected_language == fon

    # --- Traduction / TTS (flux sortant) ---
    translated_text = Column(Text, nullable=True)
    tts_audio_path = Column(String(500), nullable=True)

    status = Column(SAEnum(MessageStatus), nullable=True)  # nullable : non pertinent pour le français direct

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relations
    conversation = relationship("Conversation", back_populates="messages", lazy="selectin")
    sender = relationship("User", back_populates="messages", lazy="selectin")
    handled_by_operator = relationship("Operator", back_populates="messages_handled", lazy="selectin")
    training_sample = relationship(
        "TrainingSample", back_populates="message", uselist=False, lazy="selectin"
    )


# ---------------------------------------------------------------------------
# TRAINING_SAMPLES — dataset d'entraînement, découplé de messages.
# Uniquement pour les messages en fon (le français n'a jamais besoin d'être
# annoté). Créé automatiquement dès l'enregistrement du message fon.
# ---------------------------------------------------------------------------

class TrainingSample(Base):
    __tablename__ = "training_samples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False, unique=True)

    # Dupliqués volontairement (indépendance vis-à-vis du cycle de vie de `messages`)
    audio_path = Column(String(500), nullable=False)
    raw_transcription = Column(Text, nullable=True)   # ce que MMS-ASR a produit, si succès

    # Rempli uniquement lors de l'annotation manuelle. Vide = pas encore annoté.
    final_transcription = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    message = relationship("Message", back_populates="training_sample", lazy="selectin")