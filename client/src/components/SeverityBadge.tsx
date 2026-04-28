// Shared severity badge for alert / risk / finding rendering.
//
// Replaces inline `getSeverityBadge` helpers that were duplicated across
// PredictiveMaintenance, EventMonitoring, Compliance, SupplyChain,
// SupplyChainNetwork, SmartInsightsPanel, ActivityFeed — each with its own
// rainbow palette (bg-orange-600 / bg-yellow-600 / etc) which violated the
// design's no-rainbow rule.
//
// Severity levels map to palette tokens:
//   critical → bad full intensity   (top-of-stack alarm)
//   high     → bad with /20 alpha   (still serious, less loud)
//   medium   → signal               (warm, "watch this")
//   low      → muted                (informational)
//
// This deliberately uses three tones of "bad/signal/muted" instead of the
// four-color rainbow. Operations dashboards routinely render dozens of
// severity badges per screen and the rainbow treatment makes the screen
// feel chaotic; the design's calmer palette communicates the same
// hierarchy with less visual cost.

import { Badge } from "@/components/ui/badge";

export type Severity = "critical" | "high" | "medium" | "low" | string;

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  testId?: string;
}

// Both the standard 4-level scheme (critical / high / medium / low) and
// the audit-finding scheme (critical / major / minor / observation) map
// onto the same four palette tones. We accept either spelling and fall
// through to "medium" defaults if the input is unrecognized.
const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  major: "Major",
  medium: "Medium",
  minor: "Minor",
  low: "Low",
  observation: "Observation",
  info: "Info",
};

const SEVERITY_TONE: Record<string, string> = {
  critical:    "bg-bad/30 text-bad border-bad/40",
  high:        "bg-bad/15 text-bad border-bad/25",
  major:       "bg-bad/15 text-bad border-bad/25",
  medium:      "bg-signal/20 text-signal border-signal/30",
  minor:       "bg-signal/15 text-signal border-signal/25",
  low:         "bg-muted/20 text-muted-foreground border-muted/25",
  observation: "bg-muted/15 text-muted-foreground border-muted/20",
  info:        "bg-muted/15 text-muted-foreground border-muted/20",
};

export function SeverityBadge({ severity, className, testId }: SeverityBadgeProps) {
  const key = severity.toLowerCase();
  const label = SEVERITY_LABEL[key] ?? severity;
  const tone =
    SEVERITY_TONE[key] ?? "bg-muted/20 text-muted-foreground border-muted/25";

  return (
    <Badge
      variant="outline"
      className={`${tone} ${className ?? ""}`.trim()}
      data-testid={testId ?? `badge-severity-${key}`}
    >
      {label}
    </Badge>
  );
}

// Convenience for places previously using the local getSeverityBadge
// function. Drop-in replacement signature.
export function getSeverityBadge(severity: Severity) {
  return <SeverityBadge severity={severity} />;
}
