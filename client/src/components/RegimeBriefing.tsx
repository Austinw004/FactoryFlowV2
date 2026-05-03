/**
 * RegimeBriefing — the prescriptive top-of-dashboard panel that turns the
 * current FDR regime into a concrete procurement directive a Plant Director
 * can act on. Replaces a static description with: directive, reasoning,
 * three ranked actions, and a quantitative expectation. Matches the
 * dashboard's typographic system (eyebrow / hero / soft text).
 */
import { ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { getRegimeGuidance, type RegimeGuidance } from "@/lib/regimeGuidance";
import { InfoTooltip } from "@/components/InfoTooltip";

interface RegimeBriefingProps {
  regime: string | undefined;
  fdr: number;
  confidence?: number;
  skuCount: number;
}

const TONE_ICON: Record<RegimeGuidance["tone"], React.ComponentType<{ className?: string }>> = {
  stable: ShieldCheck,
  warming: TrendingUp,
  tense: AlertTriangle,
  opportunity: Zap,
  neutral: ShieldCheck,
};

export function RegimeBriefing({ regime, fdr, confidence, skuCount }: RegimeBriefingProps) {
  const [, setLocation] = useLocation();
  const guidance = getRegimeGuidance(regime);
  const ToneIcon = TONE_ICON[guidance.tone];

  // Pick the page that best matches the top action so the headline CTA
  // takes the customer to where they would actually execute on it.
  const primaryRoute = (() => {
    switch (guidance.tone) {
      case "warming":
        return "/procurement";
      case "tense":
        return "/inventory";
      case "opportunity":
        return "/multi-tier-mapping";
      default:
        return "/procurement";
    }
  })();

  const confidencePct = confidence != null && Number.isFinite(confidence)
    ? Math.round(confidence * 100)
    : null;

  return (
    <section
      className="mb-16"
      data-testid="regime-briefing"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="eyebrow">State of operations</span>
        <span className="dot regime-accent-bg regime-accent-rule" style={{ borderWidth: 1, borderStyle: 'solid' }} />
        <span className="text-xs uppercase tracking-[0.18em] regime-accent-text font-medium">
          {guidance.label}
        </span>
        {confidencePct != null && (
          <span className="mono text-[10px] text-muted">{confidencePct}% confidence</span>
        )}
      </div>

      <h1 className="hero text-5xl mb-5">{guidance.headline}</h1>

      <p className="text-soft max-w-2xl leading-relaxed">
        {guidance.meaning}
      </p>

      <div className="mt-6 max-w-3xl regime-accent-bg border-l-2 regime-accent-rule pl-5 py-4">
        <div className="flex items-start gap-3">
          <ToneIcon className="h-4 w-4 mt-1 regime-accent-text shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <div className="eyebrow mb-2">Recommended actions · next 30 days</div>
              <ol className="space-y-1.5 text-sm">
                {guidance.actions.map((action, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="mono text-xs text-muted tabular-nums shrink-0 mt-0.5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-bone leading-relaxed">{action}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted leading-relaxed pt-2 border-t border-line/50">
              <span className="font-medium uppercase tracking-wider text-[10px] shrink-0 pt-0.5">
                Why
              </span>
              <span className="flex-1">{guidance.reasoning}</span>
              <InfoTooltip term="fdr" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs text-muted">
        <span>
          Tracking <span className="text-bone font-medium">{skuCount.toLocaleString()}</span> SKU{skuCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden>·</span>
        <span>
          FDR <span className="mono text-bone">{Number.isFinite(fdr) ? fdr.toFixed(2) : "—"}</span>
        </span>
        <span aria-hidden>·</span>
        <span className="text-bone">{guidance.expectation}</span>
        <button
          type="button"
          onClick={() => setLocation(primaryRoute)}
          className="ml-auto text-xs uppercase tracking-[0.14em] regime-accent-text hover:text-bone transition flex items-center gap-1.5"
          data-testid="button-regime-primary-action"
        >
          Take action <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}
