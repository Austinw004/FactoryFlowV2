// Tiny status dot — used in dozens of places to indicate "this thing is
// healthy / warning / critical / inactive" at a glance. Replaces inline
// `<div className="h-2 w-2 rounded-full bg-good" />` patterns
// scattered across DigitalTwin, IntegrationChecklist, AuditTrail,
// WebhookIntegrations, PlatformAnalytics, and others.
//
// Tones map to palette tokens:
//   ok      → good   (muted green)
//   warning → signal (Anthropic burnt-orange)
//   error   → bad    (muted red)
//   muted   → muted  (greyed out / inactive)
//   live    → good with pulse animation (for live-updating connections)
//
// Sizes are constrained to xs / sm / md so usage stays consistent.

interface StatusDotProps {
  tone?: "ok" | "warning" | "error" | "muted" | "live";
  size?: "xs" | "sm" | "md";
  className?: string;
  testId?: string;
  "aria-label"?: string;
}

const TONE_CLASS: Record<string, string> = {
  ok:      "bg-good",
  warning: "bg-signal",
  error:   "bg-bad",
  muted:   "bg-muted",
  live:    "bg-good animate-pulse",
};

const SIZE_CLASS: Record<string, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

export function StatusDot({
  tone = "muted",
  size = "sm",
  className,
  testId,
  "aria-label": ariaLabel,
}: StatusDotProps) {
  const toneClass = TONE_CLASS[tone] ?? TONE_CLASS.muted;
  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.sm;
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass} ${toneClass} ${className ?? ""}`.trim()}
      aria-label={ariaLabel}
      data-testid={testId ?? `status-dot-${tone}`}
    />
  );
}
