import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioRecorderResult {
  isRecording: boolean;
  elapsedSeconds: number;
  error: string | null;
  /** The raw mic stream while recording — null otherwise. Used to drive live visualizations. */
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      chunksRef.current = [];

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopResolveRef.current?.(blob);
        stopResolveRef.current = null;
        cleanupStream();
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      intervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } catch {
      setError("Micro inaccessible. Vérifiez les autorisations de votre navigateur.");
      cleanupStream();
    }
  }, [cleanupStream]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRecording(false);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRecording(false);
    setElapsedSeconds(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cleanupStream();
    };
  }, [cleanupStream]);

  return { isRecording, elapsedSeconds, error, stream, start, stop, cancel };
}