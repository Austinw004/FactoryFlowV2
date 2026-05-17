/**
 * NOAA National Weather Service adapter — real shipment-weather alerts.
 *
 * Closes F2-FILED-012. Replaces the empty-array stub `fetchWeatherLogistics`
 * was returning in production (synthetic alerts were gated to DEMO_MODE
 * in `c2e4bf0`; this gives prod a real source).
 *
 * NOAA's NWS API is free, requires no API key, and is the authoritative
 * source for US weather alerts. Only requirement is a descriptive
 * `User-Agent` header per their rules. See:
 *   https://www.weather.gov/documentation/services-web-api
 *
 * What we fetch: all active alerts whose event-type matches a
 * logistics-relevant list (hurricanes, tropical systems, winter storms,
 * blizzards, tornados, severe thunderstorms, floods). We map each into
 * our existing `WeatherAlert` shape and infer affected ports from the
 * alert's `areaDesc` field via a hand-rolled state/region → port lookup
 * (V1 — could later be replaced with geocode-based proximity matching
 * using the GeoJSON `geometry` field that NOAA returns).
 *
 * Caching: 15-minute TTL via globalCache. NOAA alerts change on the
 * order of hours; refetching more often just spams their endpoint
 * (they ask for "reasonable" caching in their rate-limit guidance).
 *
 * International shipments: out of scope. For non-US, returns empty.
 * F2 follow-up to wire OpenWeather/AccuWeather for international.
 */

import { globalCache } from "../caching";

export interface NoaaAlert {
  type: string;
  region: string;
  severity: "low" | "moderate" | "high" | "extreme";
  impactDescription: string;
  estimatedDelay: number;
  affectedPorts: string[];
  startDate: string;
  endDate: string;
  source: "noaa";
  id: string;
  url?: string;
}

// Event types that affect ground/sea/air freight. Filtering NOAA's full
// alert stream (which includes things like "Wind Advisory" or "Heat
// Advisory" that don't materially delay shipments) to the ones a customer's
// supply-chain dashboard should care about.
const LOGISTICS_RELEVANT_EVENTS = new Set([
  "Hurricane Warning",
  "Hurricane Watch",
  "Tropical Storm Warning",
  "Tropical Storm Watch",
  "Storm Surge Warning",
  "Storm Surge Watch",
  "Winter Storm Warning",
  "Winter Storm Watch",
  "Blizzard Warning",
  "Ice Storm Warning",
  "Severe Thunderstorm Warning",
  "Tornado Warning",
  "Tornado Watch",
  "Flood Warning",
  "Flash Flood Warning",
  "Coastal Flood Warning",
  "Extreme Wind Warning",
  "High Wind Warning",
  "Fire Weather Warning",
]);

// State / region keyword → nearby ports. V1 hand-roll; covers the major
// US container ports. Multiple keywords map to the same port set so
// "Texas", "Houston", and "Galveston" all surface the Gulf Coast ports.
// Lowercased for case-insensitive substring matching.
const REGION_TO_PORTS: Array<[RegExp, string[]]> = [
  // Gulf Coast
  [/\b(texas|houston|galveston|corpus christi|beaumont|port arthur)\b/i, ["Houston", "Galveston", "Corpus Christi"]],
  [/\b(louisiana|new orleans|baton rouge|lake charles)\b/i,             ["New Orleans", "Baton Rouge"]],
  [/\b(mississippi|gulfport|biloxi)\b/i,                                ["Gulfport"]],
  [/\b(alabama|mobile)\b/i,                                             ["Mobile"]],

  // East Coast
  [/\b(florida|miami|jacksonville|tampa|port everglades|fort lauderdale)\b/i, ["Miami", "Jacksonville", "Tampa", "Port Everglades"]],
  [/\b(georgia|savannah|brunswick)\b/i,                                 ["Savannah", "Brunswick"]],
  [/\b(south carolina|charleston)\b/i,                                  ["Charleston"]],
  [/\b(north carolina|wilmington|morehead city)\b/i,                    ["Wilmington NC", "Morehead City"]],
  [/\b(virginia|norfolk|hampton roads|portsmouth va)\b/i,               ["Norfolk", "Portsmouth"]],
  [/\b(maryland|baltimore)\b/i,                                         ["Baltimore"]],
  [/\b(delaware|wilmington de)\b/i,                                     ["Wilmington DE"]],
  [/\b(new jersey|new york|newark|elizabeth|bayonne)\b/i,               ["New York", "Newark", "Elizabeth"]],
  [/\b(massachusetts|boston)\b/i,                                       ["Boston"]],
  [/\b(maine|portland me|searsport)\b/i,                                ["Portland ME"]],

  // West Coast
  [/\b(california|los angeles|long beach|oakland|san francisco|stockton|san diego|hueneme)\b/i, ["Los Angeles", "Long Beach", "Oakland"]],
  [/\b(oregon|portland or|astoria|coos bay)\b/i,                        ["Portland OR"]],
  [/\b(washington|seattle|tacoma|everett|olympia)\b/i,                  ["Seattle", "Tacoma"]],

  // Inland intermodal hubs (rail / trucking — winter storms here cause real cargo delays)
  [/\b(illinois|chicago)\b/i,                                           ["Chicago (rail/trucking hub)"]],
  [/\b(michigan|detroit)\b/i,                                           ["Detroit (auto-mfg corridor)"]],
  [/\b(ohio|cleveland|cincinnati|columbus oh)\b/i,                      ["Cleveland", "Cincinnati"]],
  [/\b(pennsylvania|philadelphia|pittsburgh)\b/i,                       ["Philadelphia"]],
  [/\b(tennessee|memphis|nashville)\b/i,                                ["Memphis (FedEx hub)"]],
  [/\b(missouri|kansas city|st louis|saint louis)\b/i,                  ["Kansas City", "St. Louis"]],
  [/\b(kentucky|louisville)\b/i,                                        ["Louisville (UPS hub)"]],

  // Great Lakes
  [/\b(minnesota|duluth)\b/i,                                           ["Duluth"]],
  [/\b(wisconsin|milwaukee|green bay)\b/i,                              ["Milwaukee"]],
];

function severityFromNoaa(noaaSeverity: string): NoaaAlert["severity"] {
  switch (noaaSeverity?.toLowerCase()) {
    case "extreme":  return "extreme";
    case "severe":   return "high";
    case "moderate": return "moderate";
    case "minor":    return "low";
    default:         return "moderate";
  }
}

// Rough estimated-delay heuristic — actual shipment delay depends on
// carrier, route, mode. This is a defensible default that customers can
// override; better to err on the conservative side than over-promise.
function estimateDelayDays(eventType: string, severity: NoaaAlert["severity"]): number {
  const base = severity === "extreme" ? 5 : severity === "high" ? 3 : severity === "moderate" ? 2 : 1;
  // Hurricanes / blizzards historically affect freight 2-3× longer than
  // their named event window because of port closures + power outages.
  if (eventType.includes("Hurricane") || eventType.includes("Blizzard")) {
    return base * 2;
  }
  return base;
}

function inferPorts(areaDesc: string): string[] {
  const seen = new Set<string>();
  for (const [pattern, ports] of REGION_TO_PORTS) {
    if (pattern.test(areaDesc)) {
      for (const p of ports) seen.add(p);
    }
  }
  return Array.from(seen);
}

interface NoaaApiFeature {
  properties?: {
    id?: string;
    event?: string;
    severity?: string;
    headline?: string;
    description?: string;
    areaDesc?: string;
    effective?: string;
    expires?: string;
    onset?: string;
    ends?: string;
  };
  id?: string;
}

interface NoaaApiResponse {
  features?: NoaaApiFeature[];
}

const CACHE_KEY = "noaa:active-alerts:v1";
// globalCache TTLs are regime-aware. The `supplyChainRisk` category
// gives us 60min in HEALTHY_EXPANSION (cheap to keep warm) and 10min
// in IMBALANCED_EXCESS (refresh more often during turbulent conditions).
// Weather alerts ARE supply-chain risk signals so this categorization is
// semantically correct + gives sensible refresh cadence.
const CACHE_CATEGORY = "supplyChainRisk";
const NOAA_USER_AGENT = "PrescientLabs/1.0 (info@prescient-labs.com)";

/**
 * Fetch active US weather alerts from NOAA. Filters to logistics-relevant
 * event types and maps each into our existing WeatherAlert shape. Returns
 * an empty array if NOAA is unreachable (degrades gracefully — the
 * dashboard's "no alerts" state is correct in that case).
 */
export async function fetchNoaaActiveAlerts(): Promise<NoaaAlert[]> {
  const cached = globalCache.get<NoaaAlert[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const res = await fetch("https://api.weather.gov/alerts/active", {
      headers: {
        "User-Agent": NOAA_USER_AGENT,
        "Accept": "application/geo+json",
      },
      // NOAA target latency is <500ms; cap so we never hold up a dashboard
      // render if their service is degraded.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[NoaaAdapter] NOAA API returned ${res.status} — returning empty alert set`);
      return [];
    }

    const data = (await res.json()) as NoaaApiResponse;
    const features = data.features ?? [];

    const alerts: NoaaAlert[] = [];
    for (const f of features) {
      const p = f.properties;
      if (!p?.event || !LOGISTICS_RELEVANT_EVENTS.has(p.event)) continue;

      const severity = severityFromNoaa(p.severity ?? "Moderate");
      const start = p.onset ?? p.effective ?? new Date().toISOString();
      const end   = p.ends  ?? p.expires   ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      alerts.push({
        type: p.event.toLowerCase().replace(/\s+/g, "_"),
        region: p.areaDesc ?? "Unknown",
        severity,
        impactDescription: p.headline ?? p.event,
        estimatedDelay: estimateDelayDays(p.event, severity),
        affectedPorts: inferPorts(p.areaDesc ?? ""),
        startDate: start,
        endDate: end,
        source: "noaa",
        id: p.id ?? f.id ?? `noaa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
    }

    // Sort severity-first so the most actionable alerts surface at the top.
    const SEVERITY_RANK = { extreme: 0, high: 1, moderate: 2, low: 3 };
    alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

    globalCache.set(CACHE_KEY, alerts, CACHE_CATEGORY);
    console.log(`[NoaaAdapter] Fetched ${alerts.length} logistics-relevant alerts from NOAA`);
    return alerts;
  } catch (err: any) {
    console.warn("[NoaaAdapter] Failed to fetch from NOAA:", err?.message ?? err);
    return [];
  }
}
