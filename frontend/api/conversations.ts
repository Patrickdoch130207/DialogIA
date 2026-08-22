import type { Conversation, Message } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface ConversationResponse {
  id: string;
  client_id: string;
  agent_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapConversation(raw: ConversationResponse): Conversation {
  return {
    id: raw.id,
    clientId: raw.client_id,
    agentId: raw.agent_id,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * POST /conversations?client_id={clientId}
 * Get-or-create: a client has exactly one conversation, ever. Safe to call on every
 * app load — returns the existing conversation if one already exists for this client.
 */
export async function getOrCreateConversation(clientId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations?client_id=${clientId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Échec de la récupération de la conversation (${response.status})`);
  }

  const raw: ConversationResponse = await response.json();
  return mapConversation(raw);
}

// Shape returned by the backend for a single message (matches schemas.MessageOut, snake_case).
interface MessageResponse {
  id: string;
  conversation_id: string;
  sender_id: string;
  handled_by_operator_id: string | null;
  direction: "incoming" | "outgoing";
  audio_path: string;
  detected_language: "fon" | "fr" | null;
  raw_transcription: string | null;
  confidence_score: number | null;
  translated_text: string | null;
  tts_audio_path: string | null;
  status: "auto_validated" | "manual_review_required" | null;
  created_at: string;
}

function mapMessage(raw: MessageResponse): Message {
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderId: raw.sender_id,
    handledByOperatorId: raw.handled_by_operator_id,
    direction: raw.direction,
    audioPath: raw.audio_path,
    detectedLanguage: raw.detected_language,
    rawTranscription: raw.raw_transcription,
    confidenceScore: raw.confidence_score,
    translatedText: raw.translated_text,
    ttsAudioPath: raw.tts_audio_path,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

interface ConversationDetailResponse extends ConversationResponse {
  client: { display_label: string };
  messages: MessageResponse[];
}

/**
 * GET /conversations/{conversationId}
 * Now public (route updated to drop the agent-only dependency). Returns the
 * conversation together with its full message history via selectinload.
 */
export async function getConversation(
  conversationId: string
): Promise<{ conversation: Conversation; clientLabel: string; messages: Message[] }> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);

  if (!response.ok) {
    throw new Error(`Échec du chargement de la conversation (${response.status})`);
  }

  const raw: ConversationDetailResponse = await response.json();
  return {
    conversation: mapConversation(raw),
    clientLabel: raw.client.display_label,
    messages: raw.messages.map(mapMessage),
  };
}

interface ConversationListResponse extends ConversationResponse {
  client: { display_label: string };
  messages: MessageResponse[];
}

export interface ConversationListItem {
  id: string;
  clientLabel: string;
  status: string;
  updatedAt: string;
  lastMessage: { preview: string; createdAt: string; confidenceScore: number | null } | null;
}

function buildPreview(message: MessageResponse): string {
  return message.translated_text || message.raw_transcription || "(audio)";
}

/**
 * GET /conversations
 * Agent-only list, ordered by most recently updated. Requires the operator's
 * bearer token (get_current_agent also accepts operator_session tokens).
 * Throws an Error with message "UNAUTHORIZED" on a 401 so callers can clear
 * the stale session and redirect to login.
 */
export async function listConversations(operatorToken: string): Promise<ConversationListItem[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!response.ok) {
    throw new Error(`Échec du chargement des conversations (${response.status})`);
  }

  const raw: ConversationListResponse[] = await response.json();
  return raw.map((item) => {
    const sortedMessages = [...item.messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const last = sortedMessages[sortedMessages.length - 1] ?? null;
    return {
      id: item.id,
      clientLabel: item.client.display_label,
      status: item.status,
      updatedAt: item.updated_at,
      lastMessage: last
        ? { preview: buildPreview(last), createdAt: last.created_at, confidenceScore: last.confidence_score }
        : null,
    };
  });
}

/**
 * POST /conversations/{conversationId}/messages/outgoing
 * Sends the operator's French reply; backend translates to fon and synthesizes audio.
 * Response is intentionally narrow (schemas.MessageOutgoingResponse) — fields not
 * returned (senderId, handledByOperatorId, ...) aren't used by the message UI anyway.
 */
export async function postOutgoingMessage(
  conversationId: string,
  operatorToken: string,
  text: string
): Promise<Message> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages/outgoing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${operatorToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!response.ok) {
    throw new Error(`Échec de l'envoi de la réponse (${response.status})`);
  }

  const raw: {
    id: string;
    translated_text: string | null;
    tts_audio_path: string | null;
    created_at: string;
  } = await response.json();

  return {
    id: raw.id,
    conversationId,
    senderId: "",
    handledByOperatorId: null,
    direction: "outgoing",
    audioPath: "",
    detectedLanguage: "fr",
    rawTranscription: null,
    confidenceScore: null,
    translatedText: raw.translated_text,
    ttsAudioPath: raw.tts_audio_path,
    status: null,
    createdAt: raw.created_at,
  };
}

/**
 * POST /conversations/{conversationId}/messages/incoming
 * Sends the client's recorded fon audio; the backend transcribes and translates it,
 * then returns the created Message.
 */
export async function postIncomingMessage(conversationId: string, audioBlob: Blob): Promise<Message> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "message.webm");

  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages/incoming`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Échec de l'envoi du message (${response.status})`);
  }

  const raw: MessageResponse = await response.json();
  return mapMessage(raw);
}