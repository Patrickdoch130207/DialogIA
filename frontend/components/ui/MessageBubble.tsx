import { AudioPlayer } from "./AudioPlayer";
import { Badge } from "./Badge";
import { buildAudioUrl } from "../../lib/audio";
import type { Message } from "../../types";

type MessagePerspective = "client" | "agent";

interface MessageBubbleProps {
  message: Message;
  /** Whose screen is rendering this — flips alignment and labels. Defaults to "client". */
  perspective?: MessagePerspective;
  /** True while an optimistic client message hasn't been confirmed by the server yet. */
  pending?: boolean;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function MessageBubble({ message, perspective = "client", pending = false }: MessageBubbleProps) {
  // Backend `direction` is relative to the SYSTEM, not either party:
  // "incoming"  = audio the client sent in (POST .../messages/incoming)
  // "outgoing"  = the agent's reply sent back out (POST .../messages/outgoing)
  const isFromClient = message.direction === "incoming";
  // "Self" (right-aligned, primary color) flips depending on who's looking at the screen.
  const isSelf = perspective === "client" ? isFromClient : !isFromClient;

  // Client audio plays the raw recording; agent replies play the synthesized fon audio
  // (which can briefly be null right after sending while synthesis runs).
  const rawPath = isFromClient ? message.audioPath : message.ttsAudioPath;
  const playbackUrl = rawPath ? buildAudioUrl(rawPath) : null;

  // The translated caption is useful to show except when it's your own voice you just
  // recorded (you already know what you said). Agents see it on both sides — the client's
  // French translation is the whole point of their screen, and their own fon translation
  // is a useful sanity check on what just got synthesized.
  const showCaption = message.translatedText && !(perspective === "client" && isSelf);

  const label =
    perspective === "client"
      ? !isFromClient
        ? "Agent"
        : null
      : isFromClient
        ? "Client"
        : "Vous";

  return (
    <div className={`flex max-w-[78%] flex-col gap-1.5 ${isSelf ? "self-end items-end" : "self-start items-start"}`}>
      {label && (
        <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-text-faint">{label}</span>
      )}

      <div
        className={
          isSelf
            ? "rounded-[18px] rounded-br-[4px] bg-primary px-3.5 py-3 text-white"
            : "rounded-[18px] rounded-bl-[4px] border border-border bg-white px-3.5 py-3 text-text"
        }
      >
        {playbackUrl ? (
          <AudioPlayer audioUrl={playbackUrl} tone={isSelf ? "onPrimary" : "onSurface"} />
        ) : (
          <p className={`text-xs italic ${isSelf ? "text-white/80" : "text-text-faint"}`}>
            Synthèse vocale en cours…
          </p>
        )}

        {showCaption && (
          <p
            className={`mt-2.5 border-t pt-2 text-xs leading-relaxed ${
              isSelf ? "border-white/25 text-white/85" : "border-dashed border-border text-text-muted"
            }`}
          >
            {message.translatedText}
          </p>
        )}

        {perspective === "agent" && isFromClient && message.confidenceScore !== null && (
          <div className="mt-2 flex justify-end">
            <Badge tone={message.confidenceScore >= 0.85 ? "success" : "warning"} dot>
              {Math.round(message.confidenceScore * 100)}%
            </Badge>
          </div>
        )}
      </div>

      <div
        className={`flex items-center gap-1.5 px-1 text-[10px] text-text-faint ${isSelf ? "flex-row-reverse" : ""}`}
      >
        <span>{formatTime(message.createdAt)}</span>
        {isSelf && perspective === "client" && pending && <span className="italic">Envoi…</span>}
        {isSelf && perspective === "client" && !pending && (
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        )}
      </div>
    </div>
  );
}