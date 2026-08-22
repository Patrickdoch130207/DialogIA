import { useEffect, useRef, useState } from "react";

type AudioPlayerTone = "onSurface" | "onPrimary";

interface AudioPlayerProps {
  audioUrl: string;
  /** Shown before the audio metadata has loaded (e.g. message.durationSeconds from the API). */
  fallbackDurationSeconds?: number;
  tone?: AudioPlayerTone;
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const TONE_STYLES: Record<AudioPlayerTone, { button: string; track: string; fill: string; time: string }> = {
  onSurface: {
    button: "bg-accent-bg text-primary",
    track: "#E1E9F4",
    fill: "#9FB4D0",
    time: "text-text-muted",
  },
  onPrimary: {
    button: "bg-white/20 text-white",
    track: "rgba(255,255,255,.25)",
    fill: "rgba(255,255,255,.9)",
    time: "text-white",
  },
};

export function AudioPlayer({ audioUrl, fallbackDurationSeconds = 0, tone = "onSurface" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handleTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
      setCurrentSeconds(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentSeconds(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play();
      setIsPlaying(true);
    }
  };

  const styles = TONE_STYLES[tone];
  const displayedTime = formatDuration(
    isPlaying || progress > 0 ? currentSeconds : duration ?? fallbackDurationSeconds
  );

  return (
    <div className="flex items-center gap-2.5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Mettre en pause" : "Écouter"}
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${styles.button}`}
      >
        {isPlaying ? (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="4" height="14" rx="1" />
            <rect x="8" y="0" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="currentColor"
            aria-hidden="true"
            style={{ marginLeft: 2 }}
          >
            <polygon points="0,0 14,7 0,14" />
          </svg>
        )}
      </button>

      <div className="relative h-5 flex-1 overflow-hidden rounded-full" style={{ background: styles.track }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
          style={{
            width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
            backgroundImage: `repeating-linear-gradient(90deg, ${styles.fill} 0 3px, transparent 3px 6px)`,
          }}
        />
      </div>

      <span className={`font-mono text-[11px] ${styles.time}`}>{displayedTime}</span>
    </div>
  );
}