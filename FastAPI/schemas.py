
import uuid
from pydantic import BaseModel, Field,ConfigDict,model_validator
from datetime import datetime
from typing import Optional
from typing import List



class OperatorLoginRequest(BaseModel):
    display_name: str
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
    
class ClientUpdate(BaseModel):
    first_name : Optional[str] = None
    last_name : Optional[str] = None
    phone_number: Optional[str] = None
    
class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_number: Optional[int]
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    preferred_language: Optional[str]
    created_at: datetime
    display_label: str = ""
    
    @model_validator(mode="after")
    def calculer_label(self):
        if self.first_name or self.last_name:
            self.display_label = f"{self.first_name or ''} {self.last_name or ''}".strip()
        else:
            self.display_label = f"Client {self.display_number:03d}" if self.display_number else "Client"
        return self
    
class MessageOut(BaseModel):
        
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    direction: str
    detected_language: str
    raw_transcription: Optional[str]
    confidence_score: Optional[float]
    translated_text: Optional[str]
    audio_path: Optional[str]
    tts_audio_path: Optional[str]
    status: Optional[str]
    created_at: datetime


class MessageIncomingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    detected_language: str
    raw_transcription: Optional[str]
    confidence_score: Optional[float]
    translated_text: Optional[str]
    status: Optional[str]
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    agent_id: Optional[uuid.UUID]
    status: str
    created_at: datetime
    updated_at: datetime
    client: ClientOut
    messages: List[MessageOut] = []
    
    model_config = ConfigDict(from_attributes=True)
    
    
class ConversationStatusUpdate(BaseModel):
    status : str
    
class MessageOutgoingRequest(BaseModel):
    text : str
    
    
class MessageOutgoingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    translated_text : Optional[str]
    tts_audio_path : Optional[str]
    created_at : datetime
    
class TrainingSampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    message_id: uuid.UUID
    audio_path: str
    raw_transcription: Optional[str]
    final_transcription: Optional[str]
    created_at: datetime


class TrainingSampleUpdate(BaseModel):
    final_transcription: str


class TrainingSampleStats(BaseModel):
    total: int
    annotated: int
    pending: int