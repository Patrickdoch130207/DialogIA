import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgentLayout } from "../../components/ui/layout/AgentLayout";
import { MessageBubble } from "../../components/ui/MessageBubble";
import { getConversation, postOutgoingMessage } from "../../api/conversations";
import { clearAgentSession, getOperatorName, getOperatorToken } from "../../lib/agentStorage";
import type { Message } from "../../types";

export function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const operatorName = getOperatorName();

  const [clientLabel, setClientLabel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    getConversation(id)
      .then(({ clientLabel: label, messages: history }) => {
        if (!isMounted) return;
        setClientLabel(label);
        setMessages(history);
      })
      .catch(() => {
        if (isMounted) setLoadError("Impossible de charger cette conversation.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !replyText.trim()) return;

    const operatorToken = getOperatorToken();
    if (!operatorToken) {
      navigate("/agent/operator-login", { replace: true });
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const message = await postOutgoingMessage(id, operatorToken, replyText.trim());
      setMessages((prev) => [...prev, message]);
      setReplyText("");
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        clearAgentSession();
        navigate("/agent/login", { replace: true });
        return;
      }
      setSendError("Échec de l'envoi. Réessayez.");
    } finally {
      setIsSending(false);
    }
  };

  const footer = (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 px-5 py-4 sm:px-8">
      <textarea
        value={replyText}
        onChange={(event) => setReplyText(event.target.value)}
        placeholder="Écrivez votre réponse en français…"
        rows={1}
        disabled={isSending}
        className="h-11 flex-1 resize-none rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={isSending || !replyText.trim()}
        className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );

  return (
    <AgentLayout operatorName={operatorName ?? undefined} footer={footer}>
      <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-3.5 sm:px-8">
        <button
          type="button"
          onClick={() => navigate("/agent")}
          aria-label="Retour à la liste"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-text">{clientLabel || "Conversation"}</p>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4 sm:px-8">
        {isLoading && <p className="text-sm text-text-muted">Chargement…</p>}
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {!isLoading &&
          !loadError &&
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} perspective="agent" />
          ))}
        {sendError && <p className="text-center text-xs text-danger">{sendError}</p>}
      </div>
    </AgentLayout>
  );
}