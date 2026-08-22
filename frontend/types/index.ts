export type Language = "fon" | "fr";

export type UserRole = "client" | "agent";

export type MessageDirection = "incoming" | "outgoing";

export type MessageStatus = "auto_validated" | "manual_review_required" | null;

// All primary/foreign key ids are UUID strings, NOT auto-incrementing integers.
// displayNumber is the one exception: a separate Integer + Sequence used only
// for the human-facing "Client 001" label, per the backend schema.

export interface Client {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  displayNumber: number;
  /** Computed by the backend: name if provided, else "Client {displayNumber:03d}". */
  displayLabel: string;
  preferredLanguage: Language;
  createdAt: string;
}

export interface Operator {
  id: string;
  displayName: string;
  isActive: boolean;
}

export interface Conversation {
  id: string;
  clientId: string;
  agentId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  /** Internal traceability only — never expose this to the client UI. */
  handledByOperatorId: string | null;
  direction: MessageDirection;
  /** Path served via GET /audio/{path}. */
  audioPath: string;
  detectedLanguage: Language | null;
  rawTranscription: string | null;
  confidenceScore: number | null;
  translatedText: string | null;
  ttsAudioPath: string | null;
  status: MessageStatus;
  createdAt: string;
}