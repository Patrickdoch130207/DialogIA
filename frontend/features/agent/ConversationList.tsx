import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgentLayout } from "../../components/ui/layout/AgentLayout";
import { Badge } from "../../components/ui/Badge";
import { listConversations } from "../../api/conversations";
import { clearAgentSession, getOperatorName, getOperatorToken } from "../../lib/agentStorage";
import type { ConversationListItem } from "../../api/conversations";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function confidenceBadge(score: number | null) {
  if (score === null) return null;
  const percent = Math.round(score * 100);
  const tone = score >= 0.85 ? "success" : "warning";
  return (
    <Badge tone={tone} dot>
      {percent}%
    </Badge>
  );
}

export function ConversationList() {
  const navigate = useNavigate();
  const operatorName = getOperatorName();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const operatorToken = getOperatorToken();
    if (!operatorToken) {
      navigate("/agent/operator-login", { replace: true });
      return;
    }

    let isMounted = true;
    listConversations(operatorToken)
      .then((items) => {
        if (isMounted) setConversations(items);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          clearAgentSession();
          navigate("/agent/login", { replace: true });
          return;
        }
        setError("Impossible de charger les conversations.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <AgentLayout operatorName={operatorName ?? undefined}>
      <div className="flex items-center justify-between px-5 py-5 sm:px-8">
        <p className="text-lg font-semibold text-text">Conversations</p>
        <p className="text-xs text-text-faint">{conversations.length} au total</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 sm:px-8">
        {isLoading && <p className="text-sm text-text-muted">Chargement…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        {!isLoading && !error && conversations.length === 0 && (
          <p className="text-sm text-text-faint">Aucune conversation pour l'instant.</p>
        )}

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => navigate(`/agent/conversations/${conversation.id}`)}
              className="flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface sm:px-6"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-semibold text-accent-text">
                {conversation.clientLabel.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{conversation.clientLabel}</p>
                <p className="truncate text-xs text-text-faint">
                  {conversation.lastMessage?.preview ?? "Aucun message"}
                </p>
              </div>

              {conversation.lastMessage && confidenceBadge(conversation.lastMessage.confidenceScore)}

              <span className="shrink-0 text-xs text-text-faint">
                {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AgentLayout>
  );
}