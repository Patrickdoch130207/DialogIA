import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "../../components/ui/layout/ClientLayout";
import { AudioWaveform } from "../../components/ui/AudioWaveform";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { postIncomingMessage } from "../../api/conversations";
import type { Message } from "../../types";

interface RecordingScreenProps {
  conversationId: string;
  onMessageSent: (message: Message) => void;
}

function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RecordingScreen({ conversationId, onMessageSent }: RecordingScreenProps) {
  const navigate = useNavigate();
  const recorder = useAudioRecorder();
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Arriving on this screen means "start talking" — mirrors the mockup, which shows
  // the recording already in progress rather than a separate "press to start" step.
  useEffect(() => {
    void recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStopAndSend = async () => {
    const blob = await recorder.stop();
    if (!blob) {
      navigate("/");
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const message = await postIncomingMessage(conversationId, blob);
      onMessageSent(message);
      navigate("/");
    } catch {
      setSendError("Échec de l'envoi. Réessayez.");
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    recorder.cancel();
    navigate("/");
  };

  return (
    <ClientLayout>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <span className="font-round text-4xl font-semibold text-text sm:text-5xl">
          {formatDuration(recorder.elapsedSeconds)}
        </span>

        <AudioWaveform
          stream={recorder.stream}
          isActive={recorder.isRecording}
          className="h-32 w-full max-w-md sm:h-40"
        />

        <div className="text-center">
          <p className="text-[16px] font-semibold text-text sm:text-lg">
            {isSending ? "Envoi en cours…" : "Ðo xóɖɔ wɛ a ɖè…"}
          </p>
          <p className="mt-1 text-[13px] text-text-faint sm:text-sm">
            {isSending ? "Merci de patienter" : "Enregistrement en cours"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStopAndSend}
            disabled={isSending}
            className="flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:px-10 sm:text-base"
          >
            {isSending ? "Envoi…" : "Arrêter et envoyer"}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSending}
            className="flex h-12 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-text-muted transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:px-8 sm:text-base"
          >
            Annuler
          </button>
        </div>

        {(recorder.error || sendError) && (
          <p className="text-center text-xs text-danger sm:text-sm">
            {recorder.error ?? sendError}
          </p>
        )}
      </div>
    </ClientLayout>
  );
}