import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

/**
 * /status — public status page.
 *
 * This page does live client-side health checks against a small set of
 * public endpoints so an enterprise evaluator can see at a glance whether
 * the platform is up. It is NOT a replacement for a third-party uptime
 * service (Statuspage.io, status.io, Betterstack). Recommend wiring one
 * in for:
 *   - Historic uptime %
 *   - Incident timeline and post-mortems
 *   - Scheduled-maintenance notices
 *   - Email/SMS subscriber list
 *
 * For now, this page is honest about what it does and what it doesn't.
 */

type ProbeState = "checking" | "ok" | "degraded" | "down";

interface Probe {
  label: string;
  path: string;
  description: string;
}

const PROBES: Probe[] = [
  {
    label: "API · core",
    path: "/api/health",
    description: "Primary backend, serves the dashboard and all data routes.",
  },
  {
    label: "App · frontend",
    path: "/",
    description: "Marketing site and authenticated web app shell.",
  },
];

interface ProbeResult {
  state: ProbeState;
  latencyMs: number | null;
  checkedAt: Date | null;
}

async function probe(path: string): Promise<ProbeResult> {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const res = await fetch(path, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    const latency = Math.round(end - start);
    if (res.ok) {
      return { state: latency > 2000 ? "degraded" : "ok", latencyMs: latency, checkedAt: new Date() };
    }
    return { state: "down", latencyMs: latency, checkedAt: new Date() };
  } catch {
    return { state: "down", latencyMs: null, checkedAt: new Date() };
  }
}

function indicatorColor(state: ProbeState): string {
  switch (state) {
    case "ok":
      return "bg-green-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
      return "bg-red-500";
    case "checking":
    default:
      return "bg-muted animate-pulse";
  }
}

function stateLabel(state: ProbeState): string {
  switch (state) {
    case "ok":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Unreachable";
    case "checking":
    default:
      return "Checking…";
  }
}

export default function Status() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<Record<string, ProbeResult>>(() =>
    Object.fromEntries(
      PROBES.map((p) => [p.path, { state: "checking" as ProbeState, latencyMs: null, checkedAt: null }]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        PROBES.map(async (p) => [p.path, await probe(p.path)] as const),
      );
      if (cancelled) return;
      setResults(Object.fromEntries(entries));
    };
    run();
    const interval = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const overall: ProbeState = useMemo(() => {
    const states = Object.values(results).map((r) => r.state);
    if (states.every((s) => s === "ok")) return "ok";
    if (states.some((s) => s === "down")) return "down";
    if (states.some((s) => s === "degraded")) return "degraded";
    return "checking";
  }, [results]);

  const overallCopy = {
    ok: {
      headline: "All systems operational.",
      subline: "Every endpoint we check is responding normally.",
    },
    degraded: {
      headline: "Partial degradation.",
      subline: "At least one endpoint is slow or intermittent. Investigating.",
    },
    down: {
      headline: "Outage detected.",
      subline: "One or more endpoints are unreachable. We're on it — email support@prescient-labs.com for updates.",
    },
    checking: {
      headline: "Running checks…",
      subline: "Probing endpoints now.",
    },
  }[overall];

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="Status — Prescient Labs"
        description="Live operational status for Prescient Labs. Real-time checks on the core API and web app."
        canonicalUrl="https://prescient-labs.com/status"
      />

      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      <header className="border-b hair relative z-10">
        <div className="max-w-7xl mx-auto px-10 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-3"
            data-testid="button-home"
          >
            <div className="w-2 h-2 bg-signal"></div>
            <span className="text-sm tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </button>
          <nav className="hidden md:flex items-center gap-10 text-sm text-soft">
            <a href="/#platform" className="hover:text-bone transition">Platform</a>
            <a href="/pricing" className="hover:text-bone transition">Pricing</a>
            <a href="/security" className="hover:text-bone transition">Security</a>
            <a href="/contact" className="hover:text-bone transition">Contact</a>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-10 pt-24 pb-16 relative z-10">
        <div className="eyebrow mb-8">Status</div>

        <div className="flex items-start gap-5 mb-12" data-testid="overall-status">
          <div className={`w-4 h-4 rounded-full mt-2 ${indicatorColor(overall)}`}></div>
          <div>
            <h1 className="text-4xl md:text-5xl display leading-tight">{overallCopy.headline}</h1>
            <p className="text-soft mt-3 max-w-xl leading-relaxed">{overallCopy.subline}</p>
          </div>
        </div>

        <div className="border hair bg-panel">
          {PROBES.map((p, idx) => {
            const r = results[p.path];
            return (
              <div
                key={p.path}
                className={`px-6 py-5 flex items-center justify-between ${idx > 0 ? "border-t hair" : ""}`}
                data-testid={`probe-${p.label.toLowerCase().replace(/\W+/g, "-")}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${indicatorColor(r.state)}`}></div>
                  <div>
                    <div className="text-base text-bone">{p.label}</div>
                    <div className="text-xs text-muted mt-1">{p.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-xs text-soft">{stateLabel(r.state)}</div>
                  <div className="mono text-xs text-muted mt-1">
                    {r.latencyMs != null ? `${r.latencyMs}ms` : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-xs mono text-muted">
          Checks run every 30 seconds from your browser. Refresh to re-probe immediately.
        </div>

        {/* Honest disclosure — better than faking 99.99% uptime */}
        <div className="mt-16 border-t hair pt-10">
          <div className="eyebrow mb-4">About this page</div>
          <p className="text-soft text-sm leading-relaxed max-w-2xl mb-4">
            This page runs live checks from your browser against two public endpoints. It does <em>not</em> yet publish historic uptime, incident timelines, or subscribe-for-notifications — those ship alongside our Statuspage.io integration in the next release.
          </p>
          <p className="text-soft text-sm leading-relaxed max-w-2xl">
            For active incidents, subscribe to <a href="mailto:status@prescient-labs.com" className="text-bone hover:text-signal transition">status@prescient-labs.com</a>. For urgent enterprise outages, your dedicated Slack channel is the fastest path.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-10 py-14 border-t hair flex items-center justify-between text-sm text-muted relative z-10 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-signal"></div>
          <span className="tracking-[0.18em] font-medium">PRESCIENT LABS</span>
        </div>
        <nav className="flex items-center gap-6 text-xs">
          <a href="/pricing" className="hover:text-bone transition">Pricing</a>
          <a href="/security" className="hover:text-bone transition">Security</a>
          <a href="/status" className="hover:text-bone transition">Status</a>
          <a href="/contact" className="hover:text-bone transition">Contact</a>
          <a href="/terms" className="hover:text-bone transition">Terms</a>
          <a href="/privacy" className="hover:text-bone transition">Privacy</a>
        </nav>
        <div className="mono text-xs">© 2026</div>
      </footer>
    </div>
  );
}
