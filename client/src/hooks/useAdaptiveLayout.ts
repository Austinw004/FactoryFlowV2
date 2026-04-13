import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

/**
 * Adaptive Layout System
 *
 * Tracks widget interaction frequency and reorders dashboard widgets
 * based on user role and usage patterns. Personalized without configuration.
 */

interface WidgetInteraction {
  widgetId: string;
  count: number;
  lastInteracted: number;
}

interface AdaptivePreferences {
  userId: string;
  widgetOrder: string[];
  interactions: WidgetInteraction[];
  collapsedWidgets: string[];
  lastUpdated: number;
}

const STORAGE_KEY = "prescient_adaptive_layout";
const DECAY_FACTOR = 0.95; // Older interactions count for less
const INTERACTION_WEIGHT = 10; // Points per interaction
const RECENCY_WEIGHT = 5; // Bonus points for recent interactions

// Role-based default widget priorities
const ROLE_PRIORITIES: Record<string, Record<string, number>> = {
  ceo: {
    "kpi-overview": 100,
    "regime-status": 95,
    "intelligence-panel": 90,
    "market-tracker": 85,
    "quick-wins": 80,
    "industry-insights": 75,
    "allocations": 60,
    "activity-feed": 50,
    "demand-trend": 45,
  },
  operations: {
    "allocations": 100,
    "kpi-overview": 95,
    "regime-status": 80,
    "intelligence-panel": 90,
    "demand-trend": 85,
    "market-tracker": 60,
    "activity-feed": 70,
    "quick-wins": 65,
    "industry-insights": 50,
  },
  procurement: {
    "market-tracker": 100,
    "regime-status": 95,
    "kpi-overview": 90,
    "intelligence-panel": 85,
    "quick-wins": 80,
    "allocations": 75,
    "industry-insights": 70,
    "demand-trend": 60,
    "activity-feed": 50,
  },
  engineering: {
    "demand-trend": 100,
    "allocations": 95,
    "kpi-overview": 90,
    "intelligence-panel": 85,
    "regime-status": 70,
    "activity-feed": 75,
    "market-tracker": 60,
    "quick-wins": 55,
    "industry-insights": 50,
  },
  default: {
    "kpi-overview": 100,
    "regime-status": 90,
    "intelligence-panel": 85,
    "allocations": 80,
    "market-tracker": 75,
    "quick-wins": 70,
    "demand-trend": 65,
    "industry-insights": 60,
    "activity-feed": 50,
  },
};

function getPreferences(userId: string): AdaptivePreferences {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    userId,
    widgetOrder: [],
    interactions: [],
    collapsedWidgets: [],
    lastUpdated: Date.now(),
  };
}

function savePreferences(prefs: AdaptivePreferences) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${prefs.userId}`, JSON.stringify(prefs));
  } catch {}
}

function calculateScore(
  widgetId: string,
  interactions: WidgetInteraction[],
  role: string,
): number {
  const rolePriority = ROLE_PRIORITIES[role]?.[widgetId] || ROLE_PRIORITIES.default[widgetId] || 25;
  const interaction = interactions.find((i) => i.widgetId === widgetId);

  if (!interaction) return rolePriority;

  const hoursSinceInteraction = (Date.now() - interaction.lastInteracted) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, RECENCY_WEIGHT * Math.pow(DECAY_FACTOR, hoursSinceInteraction));
  const interactionScore = Math.min(interaction.count * INTERACTION_WEIGHT, 50); // Cap at 50

  return rolePriority + interactionScore + recencyBonus;
}

export function useAdaptiveLayout() {
  const { user } = useAuth();
  const userId = user?.id || "anonymous";
  const [prefs, setPrefs] = useState<AdaptivePreferences>(() => getPreferences(userId));

  // Detect role from user data
  const userRole = (() => {
    const title = (user as any)?.jobTitle?.toLowerCase() || "";
    const dept = (user as any)?.department?.toLowerCase() || "";

    if (title.includes("ceo") || title.includes("chief") || title.includes("president") || title.includes("owner")) return "ceo";
    if (title.includes("operations") || dept.includes("operations") || title.includes("plant")) return "operations";
    if (title.includes("procurement") || title.includes("purchasing") || title.includes("supply")) return "procurement";
    if (title.includes("engineer") || dept.includes("engineering") || title.includes("technical")) return "engineering";
    return "default";
  })();

  // Reload prefs when user changes
  useEffect(() => {
    setPrefs(getPreferences(userId));
  }, [userId]);

  const trackInteraction = useCallback(
    (widgetId: string) => {
      setPrefs((prev) => {
        const existing = prev.interactions.find((i) => i.widgetId === widgetId);
        const updated = existing
          ? prev.interactions.map((i) =>
              i.widgetId === widgetId ? { ...i, count: i.count + 1, lastInteracted: Date.now() } : i,
            )
          : [...prev.interactions, { widgetId, count: 1, lastInteracted: Date.now() }];

        const newPrefs = { ...prev, interactions: updated, lastUpdated: Date.now() };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [],
  );

  const toggleCollapse = useCallback(
    (widgetId: string) => {
      setPrefs((prev) => {
        const collapsed = prev.collapsedWidgets.includes(widgetId)
          ? prev.collapsedWidgets.filter((id) => id !== widgetId)
          : [...prev.collapsedWidgets, widgetId];

        const newPrefs = { ...prev, collapsedWidgets: collapsed, lastUpdated: Date.now() };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [],
  );

  const getWidgetOrder = useCallback(
    (widgetIds: string[]): string[] => {
      return [...widgetIds].sort((a, b) => {
        const scoreA = calculateScore(a, prefs.interactions, userRole);
        const scoreB = calculateScore(b, prefs.interactions, userRole);
        return scoreB - scoreA;
      });
    },
    [prefs.interactions, userRole],
  );

  const isCollapsed = useCallback(
    (widgetId: string): boolean => {
      return prefs.collapsedWidgets.includes(widgetId);
    },
    [prefs.collapsedWidgets],
  );

  return {
    userRole,
    trackInteraction,
    toggleCollapse,
    getWidgetOrder,
    isCollapsed,
    interactions: prefs.interactions,
  };
}
