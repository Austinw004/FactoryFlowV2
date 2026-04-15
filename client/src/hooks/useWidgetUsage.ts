import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * useWidgetUsage — tracks how often a user interacts with each dashboard widget
 * (click, expand, drill-in) and exposes a role-aware ordering function.
 *
 * Storage: localStorage, scoped per user role. Usage never leaves the browser.
 * This is intentional — we want personalization without user configuration and
 * without creating another server-side dataset to govern.
 *
 * Ordering rule:
 *   1. Pinned widgets first (user-pinned, sticky).
 *   2. Role-preferred widgets next (role has a default weight map).
 *   3. Then by observed interaction count (descending), recency tiebreaker.
 *   4. Unknown widgets retain their declared order at the tail.
 */

const STORAGE_KEY = "prescient_widget_usage_v1";
const PINS_KEY = "prescient_widget_pins_v1";

type UsageRecord = {
  count: number;
  lastUsedAt: number;
};

type UsageMap = Record<string, UsageRecord>;

type PinsSet = string[];

// Default role weights — higher = more likely to appear near the top when the
// user hasn't built up enough usage data to personalize on their own.
const ROLE_WEIGHTS: Record<string, Record<string, number>> = {
  ceo: {
    regime: 100,
    fdr: 95,
    "materials-at-risk": 90,
    "quick-wins": 85,
    "allocation-table": 80,
    "activity-feed": 50,
  },
  operator: {
    "allocation-table": 100,
    "materials-at-risk": 95,
    "activity-feed": 90,
    "forecast-chart": 80,
    regime: 40,
    fdr: 30,
  },
  finance: {
    "budget-gauge": 100,
    "allocation-table": 95,
    regime: 85,
    fdr: 80,
    "forecast-chart": 70,
  },
  procurement: {
    "materials-at-risk": 100,
    "quick-wins": 95,
    "allocation-table": 90,
    "forecast-chart": 80,
    regime: 50,
  },
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / disabled storage — fail silently */
  }
}

// ----- cross-instance subscription so multiple mounted widgets stay in sync ---
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function readUsage(): UsageMap {
  return safeRead<UsageMap>(STORAGE_KEY, {});
}
function readPins(): PinsSet {
  return safeRead<PinsSet>(PINS_KEY, []);
}

function getSnapshot(): { usage: UsageMap; pins: PinsSet } {
  return { usage: readUsage(), pins: readPins() };
}

export function useWidgetUsage(role?: string) {
  // useSyncExternalStore keeps all consumers in lockstep without an external
  // state library.
  const { usage, pins } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const track = useCallback((widgetId: string) => {
    if (!widgetId) return;
    const current = readUsage();
    const existing = current[widgetId] ?? { count: 0, lastUsedAt: 0 };
    current[widgetId] = {
      count: existing.count + 1,
      lastUsedAt: Date.now(),
    };
    safeWrite(STORAGE_KEY, current);
    emit();
  }, []);

  const togglePin = useCallback((widgetId: string) => {
    const current = readPins();
    const next = current.includes(widgetId)
      ? current.filter((id) => id !== widgetId)
      : [...current, widgetId];
    safeWrite(PINS_KEY, next);
    emit();
  }, []);

  const clearUsage = useCallback(() => {
    safeWrite(STORAGE_KEY, {});
    emit();
  }, []);

  /**
   * Sort widget ids by: pinned → role weight → interaction count → recency → declared order.
   */
  const orderWidgets = useCallback(
    (widgetIds: string[]): string[] => {
      const weights = role ? ROLE_WEIGHTS[role.toLowerCase()] ?? {} : {};
      const pinSet = new Set(pins);
      const indexOf = new Map(widgetIds.map((id, i) => [id, i]));

      return [...widgetIds].sort((a, b) => {
        const aPinned = pinSet.has(a) ? 1 : 0;
        const bPinned = pinSet.has(b) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        const aWeight = weights[a] ?? 0;
        const bWeight = weights[b] ?? 0;
        if (aWeight !== bWeight) return bWeight - aWeight;

        const aUse = usage[a]?.count ?? 0;
        const bUse = usage[b]?.count ?? 0;
        if (aUse !== bUse) return bUse - aUse;

        const aRecent = usage[a]?.lastUsedAt ?? 0;
        const bRecent = usage[b]?.lastUsedAt ?? 0;
        if (aRecent !== bRecent) return bRecent - aRecent;

        return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
      });
    },
    [role, usage, pins],
  );

  return {
    usage,
    pins,
    track,
    togglePin,
    clearUsage,
    orderWidgets,
    isPinned: useCallback((id: string) => pins.includes(id), [pins]),
  };
}

/**
 * Convenience hook: use inside a widget to log an interaction.
 *
 *   const trackClick = useTrackInteraction("materials-at-risk");
 *   <Card onClick={trackClick} />
 */
export function useTrackInteraction(widgetId: string) {
  const { track } = useWidgetUsage();
  useEffect(() => {
    // Passive "view" signal with dampening: count once per mount, not per render.
    track(widgetId + ":view");
  }, [widgetId, track]);
  return useCallback(() => track(widgetId), [track, widgetId]);
}
