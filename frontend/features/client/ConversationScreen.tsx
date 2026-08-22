import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "../../components/ui/layout/ClientLayout";
import { MessageBubble } from "../../components/ui/MessageBubble";
import { Badge } from "../../components/ui/Badge";
import { postIncomingMessage } from "../../api/conversations";
import type { Message } from "../../types";

interface ConversationScreenProps {
  conversationId: string;
  messages: Message[];
  onMessageSent: (message: Message) => void;
}

interface DayGroup {
  dayKey: string;
  date: Date;
  items: Message[];
}

function groupByDay(messages: Message[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dayKey = date.toDateString();
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.items.push(message);
    } else {
      groups.push({ dayKey, date, items: [message] });
    }
  }
  return groups;
}

function formatDayLabel(date: Date): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function ConversationScreen({ conversationId, messages, onMessageSent }: ConversationScreenProps) {
  const navigate = useNavigate();
  const dayGroups = groupByDay(messages);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const message = await postIncomingMessage(conversationId, file);
      onMessageSent(message);
    } catch {
      setUploadError("Échec de l'envoi du fichier. Réessayez.");
    } finally {
      setIsUploading(false);
    }
  };

  const footer = (
    <div className="flex flex-col items-center gap-2.5 px-5 py-5 sm:gap-3 sm:py-6">
      <button
        type="button"
        onClick={() => navigate("/record")}
        disabled={isUploading}
        aria-label="Parler en fon"
        className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/35 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-[96px] sm:w-[96px]"
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="sm:h-8 sm:w-8">
          <rect x="9" y="2" width="8" height="14" rx="4" fill="white" />
          <path d="M4 12a9 9 0 0 0 18 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="13" y1="21" x2="13" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text sm:text-base">Ðɔ xó nú mǐ</p>
        <p className="text-xs text-text-faint sm:text-sm">Appuyez et parlez en fon</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" className="shrink-0">
          <path
            d="M7.5 10V2M7.5 2L4.5 5M7.5 2L10.5 5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 10v1.5A1.5 1.5 0 0 0 3.5 13h8a1.5 1.5 0 0 0 1.5-1.5V10"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="underline decoration-border underline-offset-4">
          {isUploading ? "Envoi du fichier…" : "ou importer un fichier audio"}
        </span>
      </button>

      {uploadError && <p className="text-center text-xs text-danger">{uploadError}</p>}
    </div>
  );

  return (
    <ClientLayout onOpenProfile={() => navigate("/profile")} footer={footer}>
      <div className="flex justify-center px-5 py-3 sm:py-4">
        <Badge tone="info" dot>
          Mǐ sè fɔngbè · Vos audios en fon sont compris
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-3 sm:px-8">
        {dayGroups.length === 0 && (
          <p className="mt-10 text-center text-sm text-text-faint">
            Aucun message pour l'instant. Appuyez sur le micro pour commencer.
          </p>
        )}
        {dayGroups.map((group) => (
          <div key={group.dayKey} className="flex flex-col gap-3.5">
            <p className="text-center text-[11px] text-text-faint">{formatDayLabel(group.date)}</p>
            {group.items.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        ))}
      </div>
    </ClientLayout>
  );
}