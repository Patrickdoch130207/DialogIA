import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  clearStoredIdentity,
  getStoredClientId,
  getStoredConversationId,
  setStoredClientId,
  setStoredConversationId,
} from "../../lib/clientStorage";
import { postCreateClient } from "../../api/client";
import { getConversation, getOrCreateConversation } from "../../api/conversations";
import { WelcomeScreen } from "../../features/client/WelcomeScreen";
import { ConversationScreen } from "../../features/client/ConversationScreen";
import { RecordingScreen } from "../../features/client/RecordingScreen";
import type { Conversation, Message } from "../../types";

type ClientAppStatus = "checking" | "welcome" | "starting" | "ready" | "error";

export default function ClientApp() {
  const [status, setStatus] = useState<ClientAppStatus>("checking");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // On load: only READ localStorage, never call the API automatically.
  useEffect(() => {
    const storedClientId = getStoredClientId();
    const storedConversationId = getStoredConversationId();

    if (!storedClientId || !storedConversationId) {
      setStatus("welcome");
      return;
    }

    let isMounted = true;
    getConversation(storedConversationId)
      .then(({ conversation: detail, messages: history }) => {
        if (!isMounted) return;
        setConversation(detail);
        setMessages(history);
        setStatus("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        // Stored ids are stale/invalid (e.g. conversation was deleted server-side) — start fresh.
        clearStoredIdentity();
        setStatus("welcome");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStart = async () => {
    setStatus("starting");
    setError(null);
    try {
      const client = await postCreateClient();
      setStoredClientId(client.id);

      const created = await getOrCreateConversation(client.id);
      setStoredConversationId(created.id);

      const { conversation: detail, messages: history } = await getConversation(created.id);
      setConversation(detail);
      setMessages(history);
      setStatus("ready");
    } catch {
      setError("Impossible de démarrer la conversation. Vérifiez votre connexion.");
      setStatus("welcome");
    }
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-text-muted">Chargement…</p>
      </div>
    );
  }

  if (status === "welcome" || status === "starting") {
    return <WelcomeScreen onStart={handleStart} isStarting={status === "starting"} error={error} />;
  }

  if (status === "error" || !conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <p className="text-center text-sm text-danger">
          {error ?? "Une erreur inattendue est survenue."}
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        index
        element={
          <ConversationScreen
            conversationId={conversation.id}
            messages={messages}
            onMessageSent={(message) => setMessages((prev) => [...prev, message])}
          />
        }
      />
      <Route
        path="record"
        element={
          <RecordingScreen
            conversationId={conversation.id}
            onMessageSent={(message) => setMessages((prev) => [...prev, message])}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}