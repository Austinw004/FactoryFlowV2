type EventName = 
  | "page_view"
  | "feature_used"
  | "allocation_run"
  | "forecast_generated"
  | "ai_query"
  | "sample_data_loaded"
  | "tour_completed"
  | "pdf_exported"
  | "settings_changed";

interface AnalyticsEvent {
  name: EventName;
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
}

const EVENTS_STORAGE_KEY = "prescient_analytics_events";
const MAX_STORED_EVENTS = 100;

class Analytics {
  private enabled: boolean = true;
  private queue: AnalyticsEvent[] = [];

  track(name: EventName, properties?: Record<string, string | number | boolean>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date().toISOString(),
    };

    this.queue.push(event);
    this.persistEvents();

    if (typeof window !== "undefined" && import.meta.env.DEV) {
      console.debug("[Analytics]", name, properties);
    }
  }

  pageView(pageName: string) {
    this.track("page_view", { page: pageName });
  }

  featureUsed(featureName: string, details?: Record<string, string | number>) {
    this.track("feature_used", { feature: featureName, ...details });
  }

  private persistEvents() {
    try {
      const existing = this.getStoredEvents();
      const combined = [...existing, ...this.queue].slice(-MAX_STORED_EVENTS);
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(combined));
      this.queue = [];
    } catch (error) {
      console.warn("[Analytics] Failed to persist events:", error);
    }
  }

  private getStoredEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getEventsSummary(): { totalEvents: number; eventsByType: Record<string, number> } {
    const events = this.getStoredEvents();
    const eventsByType: Record<string, number> = {};
    
    events.forEach((event) => {
      eventsByType[event.name] = (eventsByType[event.name] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      eventsByType,
    };
  }

  clearEvents() {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

export const analytics = new Analytics();
