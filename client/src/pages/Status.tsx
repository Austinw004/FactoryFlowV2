import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

/**
 * /status — public status page.
 *
 * Two layers of truth:
 *   1. Live client-side probes every 30s against /api/health and /.
 *      These reflect "is it up RIGHT NOW, from your browser".
 *   2. Server-side probe history (30 days, 1h buckets) served by
 *      /api/status/summary + /api/status/history. Shows the uptime bar
 *      and 30-day uptime %.
 *
 * No external status provider. We own the numbers. When we ship durable
 * retention for incidents and scheduled maintenance, it replaces the
 * in-memory ring buffer server-side — the client doesn't change.
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

interface HistoryBucket {
  ts: number;
  status: "ok" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
}

interface HistoryPayload {
  windowHours: number;
  buckets: {
    api: HistoryBucket[];
    app: HistoryBucket[];
    db: HistoryBucket[];
  };
  meta: {
    startedAt: number;
    storageKind: string;
    retentionHours: number;
    note: string;
  };
}

interface SummaryPayload {
  uptime: {
    api: { uptimePct: number | null; sampleCount: number; windowHours: number };
    app: { uptimePct: number | null; sampleCount: number; windowHours: number };
    db: { uptimePct: number | null; sampleCount: number; windowHours: number };
  };
  meta: {
    startedAt: number;
    storageKind: string;
    retentionHours: number;
    note: string;
  };
  generatedAt: string;
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

function indicatorColor(state: ProbeState | HistoryBucket["status"]): string {
  switch (state) {
    case "ok":
      return "bg-green-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
      return "bg-red-500";
    case "unknown":
      return "bg-muted/40";
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

function formatUptime(pct: number | null): string {
  if (pct == null) return "—";
  if (pct >= 99.995) return "99.99%";
  return `${pct.toFixed(2)}%`;
}

export default function Status() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<Record<string, ProbeResult>>(() =>
    Object.fromEntries(
      PROBES.map((p) => [p.path, { state: "checking" as ProbeState, latencyMs: null, checkedAt: null }]),
    ),
  );
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

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

  // Fetch the server-side history once on mount, then every 5 min.
  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const [h, s] = await Promise.all([
          fetch("/api/status/history", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
          fetch("/api/status/summary", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        if (h) setHistory(h);
        if (s) setSummary(s);
      } catch {
        // Best-effort — the status page still works without history.
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 5 * 60 * 1000);
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

  // Map client probe paths to server-side probe names for the uptime bar.
  const probeNameForPath: Record<string, "api" | "app"> = {
    "/api/health": "api",
    "/": "app",
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="Status — Prescient Labs"
        description="Live operational status for Prescient Labs. Real-time checks on the core API and web app, 30-day uptime bar."
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
            const probeName = probeNameForPath[p.path];
            const buckets = probeName && history ? history.buckets[probeName] : [];
            const uptimePct = probeName && summary ? summary.uptime[probeName]?.uptimePct : null;

            return (
              <div
                key={p.path}
                className={`px-6 py-5 ${idx > 0 ? "border-t hair" : ""}`}
                data-testid={`probe-${p.label.toLowerCase().replace(/\W+/g, "-")}`}
              >
                <div className="flex items-center justify-between">
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

                {/* 30-day uptime bar — shows one pip per hour, coloured by worst-case bucket status */}
                {buckets.length > 0 && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="mono text-[10px] text-muted uppercase tracking-wider">30-day uptime</div>
                      <div className="mono text-[10px] text-soft">
                        {formatUptime(uptimePct ?? null)}
                      </div>
                    </div>
                    <div
                      className="flex gap-[1px] h-6 w-full"
                      data-testid={`uptime-bar-${probeName}`}
                    >
                      {buckets.map((b, i) => (
                        <div
                          key={`${probeName}-${i}`}
                          className={`flex-1 min-w-0 ${indicatorColor(b.status)}`}
                          title={`${new Date(b.ts).toLocaleString()} · ${b.status}${
                            b.latencyMs != null ? ` · ${b.latencyMs}ms` : ""
                          }`}
                        ></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2 mono text-[10px] text-muted">
                      <span>30 days ago</span>
                      <span>now</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-xs mono text-muted">
          Live probes run every 30 seconds from your browser. Uptime bar refreshes every 5 minutes.
        </div>

        {summary?.meta?.note && (
          <div className="mt-4 text-xs text-muted max-w-2xl leading-relaxed">
            {summary.meta.note}
          </div>
        )}

        {/* Honest disclosure — we want enterprise buyers to see exactly what this page is and isn't */}
        <div className="mt-16 border-t hair pt-10">
          <div className="eyebrow mb-4">About this page</div>
          <p className="text-soft text-sm leading-relaxed max-w-2xl mb-4">
            We publish live probes from your browser plus a 30-day uptime bar fed from server-side self-checks every 5 minutes. We do <em>not</em> yet publish incident timelines, subscriber notifications, or scheduled-maintenance notices — those ship alongside durable probe-history retention in the next release.
          </p>
          <p className="text-soft text-sm leading-relaxed max-w-2xl">
            For active incidents, email <a href="mailto:status@prescient-labs.com" className="text-bone hover:text-signal transition">status@prescient-labs.com</a>. Enterprise customers on the Performance or Tenant VPC tier have a dedicated Slack channel for the fastest path.
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
          <a href="/trust" className="hover:text-bone transition">Trust</a>
          <a href="/status" className="hover:text-bone transition">Status</a>
          <a href="/contact" className="hover:text-bone transition">Contact</a>
          <a href="/terms" className="hover:text-bone transition">Terms</a>
          <a href="/privacy" className="hover:text-bone transition">Privacy</a>
          <a href="mailto:info@prescient-labs.com" className="hover:text-bone transition">info@prescient-labs.com</a>
        </nav>
        <div className="mono text-xs">© 2026</div>
      </footer>
    </div>
  );
}
