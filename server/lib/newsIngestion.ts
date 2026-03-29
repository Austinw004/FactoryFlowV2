/**
 * Real News Ingestion & Verification System (RSS-only, no API keys)
 * All articles must originate from real external sources.
 * Zero hallucinated or fabricated content allowed.
 */

import { createHash } from "crypto";
import { db } from "../db";
import { sql, desc, eq } from "drizzle-orm";
import { newsArticles } from "@shared/schema";

// ─── RSS Feed Registry ────────────────────────────────────────────────────────

export const RSS_FEEDS: Array<{ url: string; sourceName: string; credibilityWeight: number }> = [
  { url: "https://feeds.reuters.com/reuters/businessNews",              sourceName: "Reuters",       credibilityWeight: 1.0 },
  { url: "https://feeds.reuters.com/reuters/technologyNews",            sourceName: "Reuters Tech",  credibilityWeight: 1.0 },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/",      sourceName: "MarketWatch",   credibilityWeight: 0.9 },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",      sourceName: "CNBC Economy",  credibilityWeight: 0.9 },
  { url: "https://www.federalreserve.gov/feeds/press_all.xml",         sourceName: "Federal Reserve", credibilityWeight: 1.0 },
  { url: "https://news.google.com/rss/search?q=supply+chain+manufacturing+disruption&hl=en-US&gl=US&ceid=US:en",
                                                                        sourceName: "Google News SC",credibilityWeight: 0.8 },
  { url: "https://news.google.com/rss/search?q=commodities+inflation+logistics&hl=en-US&gl=US&ceid=US:en",
                                                                        sourceName: "Google News Cmd",credibilityWeight: 0.8 },
  { url: "https://news.google.com/rss/search?q=manufacturing+production+factory&hl=en-US&gl=US&ceid=US:en",
                                                                        sourceName: "Google News Mfg",credibilityWeight: 0.8 },
  { url: "https://news.google.com/rss/search?q=trade+tariff+import+export&hl=en-US&gl=US&ceid=US:en",
                                                                        sourceName: "Google News Trade",credibilityWeight: 0.8 },
  { url: "https://finance.yahoo.com/news/rssindex",                    sourceName: "Yahoo Finance", credibilityWeight: 0.8 },
  { url: "https://rss.cnn.com/rss/money_news_economy.rss",             sourceName: "CNN Money",     credibilityWeight: 0.85 },
  { url: "https://www.economist.com/finance-and-economics/rss.xml",    sourceName: "The Economist", credibilityWeight: 0.95 },
];

// ─── Approved source domains for validation ───────────────────────────────────

export const APPROVED_DOMAINS = new Set([
  "reuters.com", "bloomberg.com", "cnbc.com", "marketwatch.com",
  "wsj.com", "ft.com", "cnn.com", "bbc.com", "bbc.co.uk", "ap.org", "apnews.com",
  "yahoo.com", "finance.yahoo.com", "google.com", "news.google.com",
  "federalreserve.gov", "bls.gov", "commerce.gov", "census.gov",
  "supplychainbrain.com", "logisticsmgmt.com", "industryweek.com",
  "freightwaves.com", "joc.com", "economist.com", "fortune.com",
  "axios.com", "forbes.com", "businessinsider.com", "nytimes.com",
  "theguardian.com", "washingtonpost.com", "politico.com",
  "thebalancemoney.com", "investopedia.com", "tradingeconomics.com",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export type NewsCategory = "macro" | "supply_chain" | "commodities" | "manufacturing" | "geopolitics";
export type NewsSentiment = "positive" | "neutral" | "negative";

export interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  feedCredibility: number;
}

export interface EnrichedNewsItem {
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  description: string;
  category: NewsCategory;
  sentiment: NewsSentiment;
  relevanceScore: number;         // [0, 1]
  region: string;
  relatedEntities: string[];
  hash: string;
  provenance: "RSS_V1";
}

export interface NewsAuditStats {
  totalFetched: number;
  totalRejected: number;
  totalDeduped: number;
  totalStored: number;
  feedsAttempted: number;
  feedsFailed: number;
  cacheAge: number | null;        // ms since last refresh, null if never
  lastRefreshed: string | null;
}

// ─── Keywords ────────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  supply_chain: [
    "supply chain", "logistics", "shipping", "freight", "port", "container",
    "warehouse", "inventory", "procurement", "supplier", "sourcing", "customs",
    "import", "export", "trade route", "distribution", "fulfillment",
  ],
  commodities: [
    "steel", "aluminum", "aluminium", "copper", "nickel", "zinc", "iron ore",
    "semiconductor", "chip", "rare earth", "lithium", "cobalt", "crude oil",
    "natural gas", "lumber", "cotton", "wheat", "soybean", "commodity",
    "raw material", "precious metal", "gold", "silver",
  ],
  manufacturing: [
    "manufacturing", "factory", "production", "plant", "assembly", "machining",
    "industrial", "automotive", "aerospace", "electronics", "textile",
    "output", "capacity", "throughput", "forging", "casting", "fabrication",
  ],
  geopolitics: [
    "tariff", "sanction", "trade war", "trade dispute", "geopolit", "embargo",
    "ban", "restriction", "treaty", "diplomatic", "border", "military",
    "conflict", "coup", "election", "regulation", "compliance",
  ],
  macro: [
    "inflation", "gdp", "recession", "interest rate", "federal reserve", "central bank",
    "monetary policy", "fiscal", "deficit", "debt", "unemployment", "cpi", "pmi",
    "economic outlook", "growth", "currency", "exchange rate", "market",
  ],
};

const SENTIMENT_POSITIVE = [
  "growth", "recovery", "surge", "improve", "gain", "rise", "increase",
  "stabilize", "reopen", "agreement", "deal", "boost", "positive", "strong",
  "expansion", "record high", "advance", "breakthrough",
];

const SENTIMENT_NEGATIVE = [
  "disruption", "shortage", "crisis", "collapse", "decline", "fall", "drop",
  "strike", "shutdown", "closure", "ban", "sanction", "recession", "risk",
  "warning", "concern", "delay", "halt", "surge in cost", "inflation", "default",
  "bankruptcy", "layoff", "loss", "downturn", "contraction",
];

const REGION_KEYWORDS: Record<string, string[]> = {
  "US":           ["united states", " us ", "usa", "america", "washington", "federal"],
  "China":        ["china", "chinese", "beijing", "shanghai", "prc"],
  "Europe":       ["europe", "european", "eu", "germany", "france", "uk", "britain"],
  "Asia-Pacific": ["asia", "japan", "korea", "taiwan", "vietnam", "india", "asean"],
  "Middle East":  ["middle east", "saudi", "iran", "iraq", "uae", "opec", "gulf"],
  "Global":       [],
};

// ─── RSS XML Parser (no external dependencies) ───────────────────────────────

function extractTagContent(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataM = cdataRe.exec(xml);
  if (cdataM) return cdataM[1].trim();
  const normalRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const normalM = normalRe.exec(xml);
  if (normalM) return decodeXmlEntities(normalM[1].trim());
  return "";
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")  // strip residual HTML tags
    .trim();
}

function parseRssItems(xml: string, sourceName: string, feedCredibility: number): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title       = extractTagContent(block, "title");
    const link        = extractTagContent(block, "link")
      || (() => { const lm = /<link[^>]*>([^<]+)/i.exec(block); return lm ? lm[1].trim() : ""; })();
    const pubDate     = extractTagContent(block, "pubDate")
      || extractTagContent(block, "dc:date")
      || extractTagContent(block, "published");
    const description = extractTagContent(block, "description")
      || extractTagContent(block, "summary")
      || extractTagContent(block, "content");
    const source = sourceName;

    if (title && link) {
      items.push({ title, link, pubDate, source, description, feedCredibility });
    }
  }
  return items;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function validateNewsItem(item: RawNewsItem): void {
  if (!item.title || item.title.trim().length < 20) {
    throw new Error(`INVALID_NEWS_ITEM: title too short or empty (${item.title?.length ?? 0} chars)`);
  }
  if (!item.link || !item.link.startsWith("http")) {
    throw new Error(`INVALID_NEWS_ITEM: link must start with http (got "${item.link?.slice(0, 40)}")`);
  }
  if (item.pubDate) {
    const parsed = new Date(item.pubDate);
    if (isNaN(parsed.getTime())) {
      throw new Error(`INVALID_NEWS_ITEM: unparseable pubDate "${item.pubDate}"`);
    }
    if (Date.now() - parsed.getTime() > SEVEN_DAYS_MS) {
      throw new Error(`INVALID_NEWS_ITEM: article older than 7 days (pubDate="${item.pubDate}")`);
    }
  }
  if (!item.source || item.source.trim().length === 0) {
    throw new Error("INVALID_NEWS_ITEM: source is empty");
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeHash(title: string, source: string): string {
  return createHash("sha256")
    .update(normalizeTitle(title) + "|" + source.toLowerCase())
    .digest("hex");
}

function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const getBigrams = (s: string): Set<string> => {
    const bg = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
    return bg;
  };
  const ba = getBigrams(a);
  const bb = getBigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersection = 0;
  for (const g of ba) if (bb.has(g)) intersection++;
  return (2 * intersection) / (ba.size + bb.size);
}

export function dedupeNews(items: RawNewsItem[]): RawNewsItem[] {
  const hashSeen = new Set<string>();
  const kept: RawNewsItem[] = [];
  const normalizedTitles: string[] = [];

  for (const item of items) {
    const h = computeHash(item.title, item.source);
    if (hashSeen.has(h)) continue;   // exact duplicate

    // Fuzzy duplicate check: if any kept title has ≥ 85% bigram similarity → skip
    const norm = normalizeTitle(item.title);
    let fuzzyDup = false;
    for (const existing of normalizedTitles) {
      if (bigramSimilarity(norm, existing) >= 0.85) {
        fuzzyDup = true;
        break;
      }
    }
    if (fuzzyDup) continue;

    hashSeen.add(h);
    normalizedTitles.push(norm);
    kept.push(item);
  }

  return kept;
}

// ─── Relevance Scoring ────────────────────────────────────────────────────────

const RELEVANCE_KEYWORDS = [
  "supply chain", "manufacturing", "procurement", "logistics", "inventory",
  "inflation", "commodity", "raw material", "tariff", "shipping", "port",
  "factory", "production", "supplier", "shortage", "disruption", "freight",
];

export function scoreNews(item: RawNewsItem, context?: { skuIds?: string[]; materials?: string[] }): number {
  const text = `${item.title} ${item.description}`.toLowerCase();

  // Keyword relevance (0-0.50)
  let keywordScore = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) keywordScore += 1 / RELEVANCE_KEYWORDS.length;
  }
  keywordScore = Math.min(0.5, keywordScore);

  // Recency (0-0.30): full score if < 1 day, linear decay to 7 days
  let recencyScore = 0;
  if (item.pubDate) {
    const ageMs = Date.now() - new Date(item.pubDate).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    recencyScore = Math.max(0, (7 - ageDays) / 7) * 0.30;
  } else {
    recencyScore = 0.10; // assume mid-week if no date
  }

  // Source credibility (0-0.10)
  const credScore = item.feedCredibility * 0.10;

  // Entity matching (0-0.10): match SKUs or materials in text
  let entityScore = 0;
  if (context?.materials) {
    for (const mat of context.materials) {
      if (text.includes(mat.toLowerCase())) { entityScore = 0.10; break; }
    }
  }

  return Math.min(1.0, keywordScore + recencyScore + credScore + entityScore);
}

// ─── Enrichment ──────────────────────────────────────────────────────────────

function detectCategory(text: string): NewsCategory {
  let bestCategory: NewsCategory = "macro";
  let bestScore = 0;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [NewsCategory, string[]][]) {
    let score = 0;
    for (const kw of kws) if (text.includes(kw)) score++;
    if (score > bestScore) { bestScore = score; bestCategory = cat; }
  }
  return bestCategory;
}

function detectSentiment(text: string): NewsSentiment {
  let pos = 0;
  let neg = 0;
  for (const w of SENTIMENT_POSITIVE) if (text.includes(w)) pos++;
  for (const w of SENTIMENT_NEGATIVE) if (text.includes(w)) neg++;
  if (pos > neg + 1) return "positive";
  if (neg > pos + 1) return "negative";
  return "neutral";
}

function detectRegion(text: string): string {
  for (const [region, kws] of Object.entries(REGION_KEYWORDS)) {
    if (kws.length === 0) continue;
    for (const kw of kws) if (text.includes(kw)) return region;
  }
  return "Global";
}

function detectRelatedEntities(text: string, context?: { materials?: string[]; skuIds?: string[] }): string[] {
  const entities: string[] = [];
  if (context?.materials) {
    for (const m of context.materials) if (text.includes(m.toLowerCase())) entities.push(m);
  }
  // Known commodities as entities
  const knownMaterials = ["steel", "aluminum", "copper", "lithium", "cobalt", "semiconductor", "oil", "gas"];
  for (const m of knownMaterials) if (text.includes(m) && !entities.includes(m)) entities.push(m);
  return entities.slice(0, 5);
}

export function enrichNewsItem(
  item: RawNewsItem,
  relevanceScore: number,
  context?: { materials?: string[]; skuIds?: string[] },
): EnrichedNewsItem {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
  return {
    title: item.title,
    link: item.link,
    pubDate,
    source: item.source,
    description: item.description,
    category: detectCategory(text),
    sentiment: detectSentiment(text),
    relevanceScore,
    region: detectRegion(text),
    relatedEntities: detectRelatedEntities(text, context),
    hash: computeHash(item.title, item.source),
    provenance: "RSS_V1",
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutes

interface NewsCache {
  items: EnrichedNewsItem[];
  fetchedAt: number;
  stats: Omit<NewsAuditStats, "cacheAge" | "lastRefreshed">;
}

let _cache: NewsCache | null = null;

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchOneFeed(
  feed: (typeof RSS_FEEDS)[number],
  timeoutMs = 8000,
): Promise<RawNewsItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "PrescientLabs/1.0 RSS-Reader" },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRssItems(xml, feed.sourceName, feed.credibilityWeight);
  } catch (err: any) {
    console.warn(`[NewsIngestion] Feed failed: ${feed.sourceName} — ${err.message}`);
    return [];
  }
}

export async function fetchNewsFeeds(
  context?: { materials?: string[]; skuIds?: string[] },
): Promise<{
  items: EnrichedNewsItem[];
  stats: Omit<NewsAuditStats, "cacheAge" | "lastRefreshed">;
}> {
  const results = await Promise.allSettled(RSS_FEEDS.map((f) => fetchOneFeed(f)));
  const feedsFailed = results.filter((r) => r.status === "rejected").length;

  let allRaw: RawNewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") allRaw.push(...r.value);
  }

  let totalFetched = allRaw.length;
  let totalRejected = 0;

  // Validate
  const validated: RawNewsItem[] = [];
  for (const item of allRaw) {
    try {
      validateNewsItem(item);
      validated.push(item);
    } catch {
      totalRejected++;
    }
  }

  // Hard guard — no fallback content ever
  if (validated.length === 0) {
    throw new Error("NO_VALID_NEWS_SOURCES: all feeds returned zero valid articles");
  }

  // Deduplicate
  const deduped = dedupeNews(validated);
  const totalDeduped = validated.length - deduped.length;

  // Score + enrich
  const enriched: EnrichedNewsItem[] = deduped
    .map((item) => {
      const score = scoreNews(item, context);
      return enrichNewsItem(item, score, context);
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    items: enriched,
    stats: {
      totalFetched,
      totalRejected,
      totalDeduped,
      totalStored: 0,    // filled after DB write
      feedsAttempted: RSS_FEEDS.length,
      feedsFailed,
    },
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistNewsItems(items: EnrichedNewsItem[]): Promise<number> {
  let stored = 0;
  for (const item of items) {
    try {
      await db
        .insert(newsArticles)
        .values({
          title:          item.title,
          link:           item.link,
          source:         item.source,
          pubDate:        item.pubDate,
          description:    item.description ?? null,
          category:       item.category,
          sentiment:      item.sentiment,
          relevanceScore: item.relevanceScore,
          region:         item.region,
          relatedEntities: item.relatedEntities,
          hash:           item.hash,
          provenance:     item.provenance,
        })
        .onConflictDoNothing();
      stored++;
    } catch (err: any) {
      // Unique hash conflict → already exists; ignore
      if (!err.message?.includes("unique") && !err.message?.includes("duplicate")) {
        console.warn(`[NewsIngestion] persist error for "${item.title.slice(0, 40)}": ${err.message}`);
      }
    }
  }
  return stored;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function refreshNews(
  context?: { materials?: string[]; skuIds?: string[] },
  force = false,
): Promise<{ items: EnrichedNewsItem[]; stats: NewsAuditStats }> {
  // Serve from cache if fresh
  if (!force && _cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return {
      items: _cache.items,
      stats: {
        ..._cache.stats,
        cacheAge: Date.now() - _cache.fetchedAt,
        lastRefreshed: new Date(_cache.fetchedAt).toISOString(),
      },
    };
  }

  const { items, stats } = await fetchNewsFeeds(context);
  const stored = await persistNewsItems(items);

  const fullStats: Omit<NewsAuditStats, "cacheAge" | "lastRefreshed"> = { ...stats, totalStored: stored };
  _cache = { items, fetchedAt: Date.now(), stats: fullStats };

  console.log(
    `[NewsIngestion] Refresh complete: fetched=${fullStats.totalFetched} ` +
      `rejected=${fullStats.totalRejected} deduped=${fullStats.totalDeduped} ` +
      `stored=${fullStats.totalStored} feedsFailed=${fullStats.feedsFailed}`,
  );

  return {
    items,
    stats: { ...fullStats, cacheAge: 0, lastRefreshed: new Date().toISOString() },
  };
}

export async function getTopNews(
  opts: {
    limit?: number;
    category?: NewsCategory;
    sentiment?: NewsSentiment;
    context?: { materials?: string[]; skuIds?: string[] };
  } = {},
): Promise<EnrichedNewsItem[]> {
  const { limit = 20, category, sentiment, context } = opts;

  // Try cache first; fall back to DB on cold start
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    let items = _cache.items;
    if (category) items = items.filter((i) => i.category === category);
    if (sentiment) items = items.filter((i) => i.sentiment === sentiment);
    return items.slice(0, limit);
  }

  // DB fallback — return stored articles
  const rows = await db
    .select()
    .from(newsArticles)
    .where(
      sql`${newsArticles.pubDate} >= now() - interval '7 days'`,
    )
    .orderBy(desc(newsArticles.relevanceScore))
    .limit(limit);

  return rows.map((r) => ({
    title:           r.title,
    link:            r.link,
    pubDate:         r.pubDate,
    source:          r.source,
    description:     r.description ?? "",
    category:        r.category as NewsCategory,
    sentiment:       r.sentiment as NewsSentiment,
    relevanceScore:  r.relevanceScore,
    region:          r.region ?? "Global",
    relatedEntities: r.relatedEntities ?? [],
    hash:            r.hash,
    provenance:      "RSS_V1" as const,
  }));
}

export function getCacheStats(): { cacheAge: number | null; lastRefreshed: string | null } {
  if (!_cache) return { cacheAge: null, lastRefreshed: null };
  return {
    cacheAge: Date.now() - _cache.fetchedAt,
    lastRefreshed: new Date(_cache.fetchedAt).toISOString(),
  };
}

export function clearCache(): void {
  _cache = null;
}
