import { HTMLAttributes } from "react";

type BadgeTone = "info" | "neutral" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: "border-accent-border bg-accent-bg text-accent-text",
  neutral: "border-border bg-white text-text-muted",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  info: "bg-primary",
  neutral: "bg-text-faint",
  success: "bg-success",
  warning: "bg-amber-500",
  danger: "bg-danger",
};

export function Badge({ tone = "neutral", dot = false, className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${DOT_CLASSES[tone]}`} />}
      {children}
    </span>
  );
}