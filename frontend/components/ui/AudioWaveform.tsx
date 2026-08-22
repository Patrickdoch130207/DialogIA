import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  stream: MediaStream | null;
  isActive: boolean;
  className?: string;
}

// Visual language: scrolling amplitude bars, like WhatsApp/Samsung's voice
// recorder — not a continuous oscilloscope line.
const BAR_COUNT = 45;
const BAR_INTERVAL_MS = 90; // how often a new bar is appended (controls scroll speed)
const MIN_BAR_HEIGHT_RATIO = 0.08;
const GAIN = 3.2; // boosts quiet mic input so bars aren't flat by default

export function AudioWaveform({ stream, isActive, className = "" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const lastAppendRef = useRef(0);

  useEffect(() => {
    if (!isActive || !stream) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    historyRef.current = new Array(BAR_COUNT).fill(0);
    lastAppendRef.current = performance.now();

    const readAmplitude = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      return Math.sqrt(sumSquares / bufferLength); // RMS loudness, roughly 0..1
    };

    const draw = (now: number) => {
      frameRef.current = requestAnimationFrame(draw);

      if (now - lastAppendRef.current >= BAR_INTERVAL_MS) {
        lastAppendRef.current = now;
        const amplitude = Math.min(1, readAmplitude() * GAIN);
        const history = historyRef.current;
        history.push(amplitude);
        if (history.length > BAR_COUNT) history.shift();
      }

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const history = historyRef.current;
      const gap = width / BAR_COUNT;
      const barWidth = Math.max(2, gap * 0.5);

      history.forEach((value, index) => {
        const ratio = Math.max(MIN_BAR_HEIGHT_RATIO, value);
        const barHeight = height * ratio;
        const x = index * gap + (gap - barWidth) / 2;
        const y = (height - barHeight) / 2;

        // Older bars (further left) fade out slightly, like WhatsApp's recorder.
        const opacity = 0.35 + (index / BAR_COUNT) * 0.65;
        ctx.fillStyle = `rgba(37, 99, 235, ${opacity})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      source.disconnect();
      void audioContext.close();
    };
  }, [isActive, stream]);

  return <canvas ref={canvasRef} className={className} />;
}