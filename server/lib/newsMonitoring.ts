import axios from "axios";
import { GeopoliticalRiskEngine, type GeopoliticalEvent } from "./geopoliticalRisk";
import { storage as globalStorage } from "../storage";
import type { IStorage } from "../storage";
import { CredentialService } from "./credentialService";
import { validateNewsArticle } from "./newsGuard";
import { fetchNewsFeeds, getTopNews, refreshNews } from "./newsIngestion";

export interface NewsAlert {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: Date;
  category: NewsCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relevanceScore: number;
  affectedRegions: string[];
  affectedCommodities: string[];
  keywords: string[];
  fdrImpact?: number;
  fdrContext?: string;
  recommendations?: Array<{
    action: string;
    priority: string;
    timeline: string;
    fdrContext: string;
  }>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  processedAt: Date;
}

export type NewsCategory = 
  | 'port_closure'
  | 'trade_dispute'
  | 'natural_disaster'
  | 'regulatory_change'
  | 'supplier_distress'
  | 'supply_chain_disruption'
  | 'commodity_shortage'
  | 'labor_strike'
  | 'geopolitical_tension'
  | 'economic_crisis';

interface NewsArticle {
  title: string;
  description: string;
  content?: string;
  source: { name: string };
  url: string;
  publishedAt: string;
}

const SUPPLY_CHAIN_KEYWORDS = {
  port_closure: [
    'port closure', 'port shutdown', 'port strike', 'shipping disruption',
    'container backlog', 'port congestion', 'maritime strike', 'dock workers strike',
    'harbor shutdown', 'terminal closure'
  ],
  trade_dispute: [
    'trade war', 'tariff', 'trade dispute', 'trade sanction', 'import ban',
    'export restriction', 'trade embargo', 'customs duty', 'anti-dumping',
    'trade negotiation', 'trade agreement'
  ],
  natural_disaster: [
    'earthquake', 'tsunami', 'hurricane', 'typhoon', 'flood', 'wildfire',
    'volcanic eruption', 'drought', 'storm damage', 'cyclone', 'tornado',
    'natural disaster supply chain'
  ],
  regulatory_change: [
    'regulation change', 'new regulation', 'compliance requirement', 'environmental regulation',
    'import regulation', 'export control', 'trade policy', 'regulatory approval',
    'FDA approval', 'EPA regulation', 'EU regulation', 'trade law'
  ],
  supplier_distress: [
    'bankruptcy', 'insolvency', 'financial distress', 'company collapse',
    'supplier bankruptcy', 'manufacturer shutdown', 'factory closure',
    'business failure', 'credit downgrade', 'debt default', 'layoffs'
  ],
  supply_chain_disruption: [
    'supply chain disruption', 'supply shortage', 'production halt',
    'factory shutdown', 'manufacturing delay', 'component shortage',
    'raw material shortage', 'logistics disruption', 'freight delay'
  ],
  commodity_shortage: [
    'commodity shortage', 'raw material shortage', 'steel shortage',
    'aluminum shortage', 'chip shortage', 'semiconductor shortage',
    'rare earth shortage', 'lithium shortage', 'copper shortage'
  ],
  labor_strike: [
    'labor strike', 'workers strike', 'union strike', 'industrial action',
    'walkout', 'work stoppage', 'labor dispute', 'wage negotiation'
  ],
  geopolitical_tension: [
    'geopolitical tension', 'political instability', 'civil unrest',
    'military conflict', 'border dispute', 'diplomatic crisis',
    'sanctions', 'political crisis', 'coup', 'election crisis'
  ],
  economic_crisis: [
    'currency crisis', 'economic recession', 'inflation surge',
    'interest rate hike', 'market crash', 'financial crisis',
    'economic downturn', 'GDP decline', 'hyperinflation'
  ]
};

const REGION_KEYWORDS: Record<string, string[]> = {
  'China': ['china', 'chinese', 'beijing', 'shanghai', 'shenzhen', 'guangzhou', 'prc'],
  'United States': ['united states', 'us', 'usa', 'american', 'washington', 'biden', 'congress'],
  'Europe': ['europe', 'european', 'eu', 'brussels', 'germany', 'france', 'italy', 'spain', 'uk', 'britain'],
  'Asia Pacific': ['asia', 'pacific', 'japan', 'korea', 'taiwan', 'vietnam', 'indonesia', 'thailand', 'malaysia', 'singapore'],
  'Middle East': ['middle east', 'saudi', 'iran', 'iraq', 'israel', 'uae', 'qatar', 'kuwait', 'opec'],
  'Latin America': ['latin america', 'brazil', 'mexico', 'argentina', 'chile', 'colombia', 'peru'],
  'India': ['india', 'indian', 'delhi', 'mumbai', 'bangalore'],
  'Africa': ['africa', 'african', 'nigeria', 'south africa', 'egypt', 'kenya', 'morocco']
};

const COMMODITY_KEYWORDS: Record<string, string[]> = {
  'Steel': ['steel', 'iron ore', 'blast furnace'],
  'Aluminum': ['aluminum', 'aluminium', 'bauxite'],
  'Copper': ['copper'],
  'Semiconductors': ['semiconductor', 'chip', 'wafer', 'fab', 'tsmc', 'intel', 'samsung'],
  'Rare Earths': ['rare earth', 'lithium', 'cobalt', 'neodymium'],
  'Oil & Gas': ['oil', 'gas', 'petroleum', 'crude', 'natural gas', 'lng'],
  'Chemicals': ['chemical', 'polymer', 'resin', 'plastic'],
  'Automotive Parts': ['automotive', 'car parts', 'vehicle', 'ev battery'],
  'Electronics': ['electronics', 'components', 'pcb', 'capacitor', 'resistor'],
  'Textiles': ['textile', 'cotton', 'fabric', 'apparel']
};

export interface CompanyContext {
  industry?: string;
  materials: string[];
  supplierRegions: string[];
}

export interface NewsAlertResult {
  alerts: NewsAlert[];
  dataSource: 'newsapi' | 'unavailable';
  unavailableReason?: string;
}

export class NewsMonitoringService {
  private apiKey: string | undefined;
  private storage: IStorage;
  private companyId: string | undefined;
  private riskEngine: GeopoliticalRiskEngine;
  private cache: Map<string, NewsAlert[]> = new Map();
  private lastFetch: Date = new Date(0);
  private credentialsInitialized: boolean = false;

  constructor(storage: IStorage, companyId?: string) {
    this.storage = storage;
    this.companyId = companyId;
    this.riskEngine = new GeopoliticalRiskEngine(storage);
    // API key initialized via CredentialService only - no env fallback
  }

  async initializeCredentials(): Promise<void> {
    if (this.credentialsInitialized) return;
    
    if (this.companyId) {
      try {
        const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'newsapi');
        if (credentials?.apiKey) {
          this.apiKey = credentials.apiKey;
          console.log(`[NewsMonitoring] Using centralized CredentialService for company ${this.companyId}`);
        }
      } catch (error) {
        console.log('[NewsMonitoring] CredentialService lookup failed, credentials not available');
      }
    }
    // Strict CredentialService-only mode - no environment variable fallback
    this.credentialsInitialized = true;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.initializeCredentials();
      if (!this.apiKey) {
      return { success: true, message: 'Using RSS feeds (no API key required). Add News API key for enhanced coverage.' };
      }
      
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { apiKey: this.apiKey, country: 'us', pageSize: 1 },
        timeout: 10000
      });
      
      if (response.data.status === 'ok') {
        console.log('[NewsMonitoring] Connection test successful');
        return { success: true, message: 'News API connection verified' };
      }
      return { success: false, message: 'News API returned unexpected status' };
    } catch (error: any) {
      console.error('[NewsMonitoring] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async syncNewsAlertsAsDemandSignals(companyId: string, currentFDR: number = 1.0): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      await this.initializeCredentials();
      const result = await this.fetchSupplyChainNewsWithMeta(currentFDR);

      for (const alert of result.alerts.slice(0, 50)) {
        try {
          await globalStorage.createDemandSignal({
            companyId,
            signalType: 'news_alert',
            signalDate: alert.publishedAt,
            quantity: alert.relevanceScore,
            unit: 'relevance_score',
            channel: 'news',
            confidence: alert.relevanceScore,
            priority: alert.severity === 'critical' || alert.severity === 'high' ? 'high' : 
                      alert.severity === 'medium' ? 'medium' : 'low',
            attributes: {
              source: alert.source,
              category: alert.category,
              severity: alert.severity,
              affectedRegions: alert.affectedRegions,
              affectedCommodities: alert.affectedCommodities,
              fdrImpact: alert.fdrImpact,
              dataSource: result.dataSource
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Alert ${alert.id}: ${err.message}`);
        }
      }

      console.log(`[NewsMonitoring] Synced ${synced} news alerts as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[NewsMonitoring] News sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }

  async fetchSupplyChainNewsWithMeta(currentFDR: number = 1.0, companyContext?: CompanyContext): Promise<NewsAlertResult> {
    // Integration Integrity Mandate: Never show fabricated content
    // If real news data is unavailable, we must honestly report that state
    if (!this.apiKey) {
      // Try RSS feeds first (no API key required)
      try {
        console.log('[NewsMonitoring] No API key - using RSS feeds as primary news source');
        const rssResult = await fetchNewsFeeds();
                const rssArticles = (rssResult as any)?.items || [];
        if (rssArticles && rssArticles.length > 0) {
          const alerts = rssArticles.slice(0, 20).map((article: any) => ({
            id: article.id || Math.random().toString(36).substr(2, 9),
            title: article.title,
            description: article.description || article.title,
            source: article.source || 'RSS Feed',
            url: article.url || '',
            publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
            category: 'supply_chain',
            severity: 'medium',
            relevanceScore: article.relevanceScore || 0.7,
            regions: [],
            commodities: [],
          }));
          return { alerts, dataSource: 'newsapi' };
        }
      } catch (rssError) {
        console.warn('[NewsMonitoring] RSS feed fetch failed:', (rssError as any).message);
      }
      return {
        alerts: [],
        dataSource: 'unavailable',
        unavailableReason: 'News feeds temporarily unavailable. Will retry automatically.'
      };
    }

    try {
      const alerts = await this.fetchRealNews(currentFDR, companyContext);
      return {
        alerts,
        dataSource: 'newsapi'
      };
    } catch (error: any) {
      console.error('[NewsMonitoring] Real news fetch failed:', error.message);
      // Integration Integrity Mandate: Report failure honestly, don't substitute fake data
      return {
        alerts: [],
        dataSource: 'unavailable',
        unavailableReason: `News API temporarily unavailable: ${error.message}`
      };
    }
  }

  // Legacy method for backward compatibility - returns just alerts
  async fetchSupplyChainNews(currentFDR: number = 1.0): Promise<NewsAlert[]> {
    const result = await this.fetchSupplyChainNewsWithMeta(currentFDR);
    return result.alerts;
  }

  private async fetchRealNews(currentFDR: number, companyContext?: CompanyContext): Promise<NewsAlert[]> {
    if (!this.apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    const cacheKey = `news_${new Date().toISOString().split('T')[0]}_${companyContext?.industry || 'general'}`;
    const timeSinceLastFetch = Date.now() - this.lastFetch.getTime();
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    
    if (this.cache.has(cacheKey) && timeSinceLastFetch < TWELVE_HOURS_MS) {
      return this.cache.get(cacheKey)!;
    }

    const alerts: NewsAlert[] = [];
    
    // Build personalized queries based on company context
    let queries = [
      'supply chain disruption manufacturing',
      'trade war tariff import export',
      'port closure shipping container',
      'factory shutdown production halt',
      'geopolitical sanctions trade',
      'natural disaster supply chain',
      'labor strike factory',
      'economic crisis manufacturing',
      'regulatory change import export',
      'supplier bankruptcy'
    ];
    
    // Add material-specific queries
    if (companyContext?.materials && companyContext.materials.length > 0) {
      const topMaterials = companyContext.materials.slice(0, 5);
      for (const material of topMaterials) {
        queries.push(`${material} shortage supply chain`);
        queries.push(`${material} price manufacturing`);
      }
    }
    
    // Add region-specific queries
    if (companyContext?.supplierRegions && companyContext.supplierRegions.length > 0) {
      for (const region of companyContext.supplierRegions.slice(0, 3)) {
        queries.push(`${region} supply chain disruption`);
      }
    }
    
    // Add industry-specific queries
    if (companyContext?.industry) {
      queries.push(`${companyContext.industry} supply chain news`);
      queries.push(`${companyContext.industry} manufacturing disruption`);
    }
    
    // Limit total queries to avoid rate limits
    queries = queries.slice(0, 15);

    try {
      for (const query of queries) {
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: query,
            apiKey: this.apiKey,
            sortBy: 'publishedAt',
            pageSize: 10,
            language: 'en',
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          timeout: 10000
        });

        if (response.data.articles) {
          for (const article of response.data.articles) {
            const alert = await this.processArticle(article, currentFDR);
            if (alert && alert.relevanceScore >= 50) {
              alerts.push(alert);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const uniqueAlerts = this.deduplicateAlerts(alerts);
      uniqueAlerts.sort((a, b) => {
        if (a.severity !== b.severity) {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.relevanceScore - a.relevanceScore;
      });

      this.cache.set(cacheKey, uniqueAlerts);
      this.lastFetch = new Date();
      
      return uniqueAlerts;
    } catch (error: any) {
      console.error('Error fetching news:', error.message);
      // Integration Integrity Mandate: Don't fall back to fabricated content
      throw error; // Let the caller handle the unavailable state
    }
  }

  private async processArticle(article: NewsArticle, currentFDR: number): Promise<NewsAlert | null> {
    try {
      validateNewsArticle(article);
    } catch (err: any) {
      console.warn(`[NewsGuard] Article rejected: ${err.message} url=${article?.url}`);
      return null;
    }

    const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    
    const category = this.detectCategory(text);
    if (!category) return null;

    const severity = this.calculateSeverity(text, category);
    const relevanceScore = this.calculateRelevance(text);
    const regions = this.detectRegions(text);
    const commodities = this.detectCommodities(text);
    const keywords = this.extractKeywords(text);

    const eventType = this.categoryToEventType(category);
    const geopoliticalEvent: GeopoliticalEvent = {
      eventType,
      region: regions[0] || 'Global',
      severity,
      description: article.description || article.title,
      commoditiesAffected: commodities,
      suppliersAffected: [],
      startDate: new Date(article.publishedAt)
    };

    const riskAssessment = await this.riskEngine.assessRisk(geopoliticalEvent, currentFDR);

    return {
      id: this.generateId(article.title, article.publishedAt),
      title: article.title,
      description: article.description || '',
      source: article.source.name,
      sourceUrl: article.url,
      publishedAt: new Date(article.publishedAt),
      category,
      severity,
      relevanceScore,
      affectedRegions: regions,
      affectedCommodities: commodities,
      keywords,
      fdrImpact: riskAssessment.fdrImpact,
      fdrContext: riskAssessment.procurementImpact,
      recommendations: riskAssessment.recommendations,
      riskLevel: riskAssessment.riskLevel,
      processedAt: new Date()
    };
  }

  private detectCategory(text: string): NewsCategory | null {
    let maxMatches = 0;
    let detectedCategory: NewsCategory | null = null;

    for (const [category, keywords] of Object.entries(SUPPLY_CHAIN_KEYWORDS)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category as NewsCategory;
      }
    }

    return maxMatches > 0 ? detectedCategory : null;
  }

  private calculateSeverity(text: string, category: NewsCategory): 'low' | 'medium' | 'high' | 'critical' {
    const criticalWords = ['major', 'severe', 'critical', 'emergency', 'crisis', 'collapse', 'catastrophic', 'devastating'];
    const highWords = ['significant', 'substantial', 'serious', 'escalating', 'widespread', 'extensive'];
    const mediumWords = ['moderate', 'ongoing', 'developing', 'potential', 'emerging'];

    let criticalCount = criticalWords.filter(w => text.includes(w)).length;
    let highCount = highWords.filter(w => text.includes(w)).length;
    let mediumCount = mediumWords.filter(w => text.includes(w)).length;

    const highSeverityCategories: NewsCategory[] = ['natural_disaster', 'geopolitical_tension', 'supplier_distress'];
    if (highSeverityCategories.includes(category)) {
      criticalCount += 1;
    }

    if (criticalCount >= 2) return 'critical';
    if (criticalCount >= 1 || highCount >= 2) return 'high';
    if (highCount >= 1 || mediumCount >= 2) return 'medium';
    return 'low';
  }

  private calculateRelevance(text: string): number {
    let score = 0;
    
    const supplyChainTerms = ['supply chain', 'manufacturing', 'supplier', 'procurement', 'logistics', 'inventory'];
    for (const term of supplyChainTerms) {
      if (text.includes(term)) score += 15;
    }
    
    const impactTerms = ['disruption', 'shortage', 'delay', 'closure', 'impact', 'affect'];
    for (const term of impactTerms) {
      if (text.includes(term)) score += 10;
    }
    
    let categoryMatches = 0;
    for (const keywords of Object.values(SUPPLY_CHAIN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) categoryMatches++;
      }
    }
    score += Math.min(40, categoryMatches * 5);

    return Math.min(100, score);
  }

  private detectRegions(text: string): string[] {
    const regions: string[] = [];
    for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          if (!regions.includes(region)) {
            regions.push(region);
          }
          break;
        }
      }
    }
    return regions.length > 0 ? regions : ['Global'];
  }

  private detectCommodities(text: string): string[] {
    const commodities: string[] = [];
    for (const [commodity, keywords] of Object.entries(COMMODITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          if (!commodities.includes(commodity)) {
            commodities.push(commodity);
          }
          break;
        }
      }
    }
    return commodities;
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    for (const categoryKeywords of Object.values(SUPPLY_CHAIN_KEYWORDS)) {
      for (const keyword of categoryKeywords) {
        if (text.includes(keyword.toLowerCase()) && !keywords.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }
    return keywords.slice(0, 5);
  }

  private categoryToEventType(category: NewsCategory): 'trade_war' | 'sanctions' | 'natural_disaster' | 'political_instability' | 'currency_crisis' {
    const mapping: Record<NewsCategory, 'trade_war' | 'sanctions' | 'natural_disaster' | 'political_instability' | 'currency_crisis'> = {
      port_closure: 'trade_war',
      trade_dispute: 'trade_war',
      natural_disaster: 'natural_disaster',
      regulatory_change: 'sanctions',
      supplier_distress: 'political_instability',
      supply_chain_disruption: 'natural_disaster',
      commodity_shortage: 'trade_war',
      labor_strike: 'political_instability',
      geopolitical_tension: 'political_instability',
      economic_crisis: 'currency_crisis'
    };
    return mapping[category] || 'political_instability';
  }

  private generateId(title: string, date: string): string {
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `news_${Math.abs(hash)}_${new Date(date).getTime()}`;
  }

  private deduplicateAlerts(alerts: NewsAlert[]): NewsAlert[] {
    const seen = new Set<string>();
    return alerts.filter(alert => {
      const key = alert.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async getPersonalizedAlerts(currentFDR: number, companyContext?: CompanyContext): Promise<NewsAlert[]> {
    // Get curated industry alerts and filter/prioritize based on company context
    const allAlerts = await this.getCuratedAlerts(currentFDR);
    
    if (!companyContext || (!companyContext.materials.length && !companyContext.supplierRegions.length && !companyContext.industry)) {
      return allAlerts;
    }
    
    // Industry-to-commodity mapping for relevance scoring
    const industryMaterials: Record<string, string[]> = {
      'electronics': ['copper', 'aluminum', 'lithium', 'cobalt', 'rare earth', 'silicon', 'semiconductors', 'electronics'],
      'automotive': ['steel', 'aluminum', 'copper', 'lithium', 'cobalt', 'rubber', 'automotive parts'],
      'aerospace': ['titanium', 'aluminum', 'nickel', 'steel', 'carbon fiber', 'cobalt'],
      'machinery': ['steel', 'iron', 'copper', 'aluminum', 'zinc'],
      'chemicals': ['natural gas', 'oil', 'ethylene', 'propylene', 'chlorine', 'chemicals'],
      'food_beverage': ['wheat', 'corn', 'sugar', 'coffee', 'cocoa', 'palm oil'],
      'textiles': ['cotton', 'polyester', 'nylon', 'wool', 'textiles'],
      'construction': ['steel', 'cement', 'lumber', 'copper', 'aluminum', 'glass']
    };
    
    // Get relevant commodities for this company
    const relevantCommodities = new Set<string>();
    companyContext.materials.forEach(m => relevantCommodities.add(m.toLowerCase()));
    
    if (companyContext.industry) {
      const industryComms = industryMaterials[companyContext.industry.toLowerCase()] || [];
      industryComms.forEach(c => relevantCommodities.add(c.toLowerCase()));
    }
    
    // Score and filter alerts based on relevance
    const scoredAlerts = allAlerts.map(alert => {
      let relevanceBoost = 0;
      
      // Check commodity match
      const alertCommodities = alert.affectedCommodities.map(c => c.toLowerCase());
      const matchingCommodities = alertCommodities.filter(c => 
        Array.from(relevantCommodities).some(rc => c.includes(rc) || rc.includes(c))
      );
      if (matchingCommodities.length > 0) {
        relevanceBoost += matchingCommodities.length * 15;
      }
      
      // Check region match
      const matchingRegions = alert.affectedRegions.filter(r => 
        companyContext.supplierRegions.some(sr => 
          r.toLowerCase().includes(sr.toLowerCase()) || sr.toLowerCase().includes(r.toLowerCase())
        )
      );
      if (matchingRegions.length > 0) {
        relevanceBoost += matchingRegions.length * 10;
      }
      
      return {
        ...alert,
        relevanceScore: Math.min(100, alert.relevanceScore + relevanceBoost),
        isDirectlyRelevant: relevanceBoost > 0
      };
    });
    
    // Sort by relevance (directly relevant first, then by score)
    return scoredAlerts.sort((a, b) => {
      if (a.isDirectlyRelevant && !b.isDirectlyRelevant) return -1;
      if (!a.isDirectlyRelevant && b.isDirectlyRelevant) return 1;
      if (a.severity !== b.severity) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.relevanceScore - a.relevanceScore;
    });
  }

  private async getCuratedAlerts(currentFDR: number): Promise<NewsAlert[]> {
    console.log('[NewsMonitoring] No curated alerts available - requires authenticated news sources');
    return [];
  }

  private async _REMOVED_getCuratedAlerts_fabricated(currentFDR: number): Promise<NewsAlert[]> {
    const simulatedEvents: Array<{
      title: string;
      description: string;
      category: NewsCategory;
      severity: 'low' | 'medium' | 'high' | 'critical';
      regions: string[];
      commodities: string[];
    }> = [
      {
        title: "Major Port Congestion at Shanghai Impacts Global Shipping",
        description: "Container backlog at Shanghai port reaches critical levels, with delays expected to extend 2-3 weeks for eastbound cargo. Shipping companies warn of rate increases.",
        category: 'port_closure',
        severity: 'high',
        regions: ['China', 'Asia Pacific'],
        commodities: ['Electronics', 'Automotive Parts']
      },
      {
        title: "Los Angeles Port Operations Suspended Due to Labor Negotiations",
        description: "West Coast port operations halted as contract talks between terminal operators and longshoremen reach impasse. Cargo vessels diverting to alternative ports.",
        category: 'port_closure',
        severity: 'critical',
        regions: ['United States'],
        commodities: ['Electronics', 'Automotive Parts', 'Textiles']
      },
      {
        title: "Rotterdam Port Faces Capacity Constraints Amid Infrastructure Upgrade",
        description: "Europe's largest port implements partial closures for terminal modernization, reducing container throughput by 30% for next 6 weeks.",
        category: 'port_closure',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Chemicals', 'Steel', 'Oil & Gas']
      },
      {
        title: "Singapore Maritime Hub Reports Record Delays",
        description: "Transshipment hub experiences unprecedented congestion with average vessel wait times exceeding 5 days. Regional supply chains feeling the strain.",
        category: 'port_closure',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Electronics', 'Semiconductors']
      },
      {
        title: "Hamburg Port Workers Vote for Industrial Action",
        description: "German port workers authorize strike action over automation concerns, potentially disrupting Northern European trade routes for major manufacturers.",
        category: 'port_closure',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Steel', 'Automotive Parts', 'Chemicals']
      },
      {
        title: "Suez Canal Blockage Causes Global Shipping Delays",
        description: "Container vessel grounding in Suez Canal creates backlog of 300+ ships, with ripple effects expected across global supply chains for weeks.",
        category: 'port_closure',
        severity: 'critical',
        regions: ['Middle East', 'Europe', 'Asia Pacific'],
        commodities: ['Oil & Gas', 'Electronics', 'Automotive Parts']
      },

      // TRADE DISPUTE - 6 articles
      {
        title: "New US-China Trade Restrictions Target Semiconductor Industry",
        description: "Latest export controls expand restrictions on advanced chip manufacturing equipment, affecting major technology suppliers in the region.",
        category: 'trade_dispute',
        severity: 'critical',
        regions: ['China', 'United States'],
        commodities: ['Semiconductors', 'Electronics']
      },
      {
        title: "EU Imposes Anti-Dumping Tariffs on Steel Imports",
        description: "European Commission announces 25% tariffs on steel imports from multiple countries, citing unfair pricing practices. Manufacturers brace for cost increases.",
        category: 'trade_dispute',
        severity: 'high',
        regions: ['Europe', 'Asia Pacific'],
        commodities: ['Steel', 'Aluminum']
      },
      {
        title: "Mexico-Canada Trade Tensions Escalate Over Auto Parts",
        description: "New tariff threats on automotive components create uncertainty for North American supply chains. Industry groups call for immediate negotiations.",
        category: 'trade_dispute',
        severity: 'medium',
        regions: ['United States', 'Latin America'],
        commodities: ['Automotive Parts', 'Steel']
      },
      {
        title: "India Raises Import Duties on Electronic Components",
        description: "Government announces increased tariffs on imported electronics to boost domestic manufacturing. Foreign suppliers reassessing market strategy.",
        category: 'trade_dispute',
        severity: 'medium',
        regions: ['India', 'Asia Pacific'],
        commodities: ['Electronics', 'Semiconductors']
      },
      {
        title: "Japan-Korea Trade Restrictions Continue to Impact Tech Supply",
        description: "Ongoing export controls on critical materials between Asian nations continue to disrupt semiconductor and display manufacturing supply chains.",
        category: 'trade_dispute',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Semiconductors', 'Rare Earths', 'Chemicals']
      },
      {
        title: "UK-EU Post-Brexit Trade Friction Increases Customs Delays",
        description: "New border checks and paperwork requirements causing 2-3 day delays for goods crossing the English Channel, affecting just-in-time manufacturing.",
        category: 'trade_dispute',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Automotive Parts', 'Chemicals', 'Textiles']
      },

      // NATURAL DISASTER - 6 articles
      {
        title: "Typhoon Disrupts Manufacturing in Southeast Asia",
        description: "Category 4 typhoon impacts Vietnam and Philippines manufacturing zones, with automotive and electronics production suspended temporarily.",
        category: 'natural_disaster',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Electronics', 'Automotive Parts', 'Textiles']
      },
      {
        title: "California Wildfires Force Semiconductor Facility Evacuation",
        description: "Major chip fabrication plant evacuated as wildfires approach industrial zone. Production timeline uncertain as fire containment efforts continue.",
        category: 'natural_disaster',
        severity: 'critical',
        regions: ['United States'],
        commodities: ['Semiconductors', 'Electronics']
      },
      {
        title: "Flooding in Central Europe Disrupts Chemical Production",
        description: "Record rainfall causes widespread flooding along Rhine industrial corridor, forcing chemical plants to halt operations and threatening supply contracts.",
        category: 'natural_disaster',
        severity: 'high',
        regions: ['Europe'],
        commodities: ['Chemicals', 'Automotive Parts']
      },
      {
        title: "Earthquake Damages Japanese Auto Parts Facilities",
        description: "Magnitude 6.8 earthquake strikes industrial region, causing structural damage to multiple tier-1 automotive suppliers. Full assessment underway.",
        category: 'natural_disaster',
        severity: 'critical',
        regions: ['Asia Pacific'],
        commodities: ['Automotive Parts', 'Electronics', 'Steel']
      },
      {
        title: "Drought Conditions Impact Taiwanese Semiconductor Water Supply",
        description: "Severe drought restricts water allocation to chip manufacturers, potentially forcing production cuts at major fabrication facilities.",
        category: 'natural_disaster',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Semiconductors', 'Electronics']
      },
      {
        title: "Hurricane Season Threatens Gulf Coast Petrochemical Hub",
        description: "Early-season tropical activity prompts precautionary shutdowns at Texas and Louisiana refineries and chemical plants, affecting downstream supply.",
        category: 'natural_disaster',
        severity: 'medium',
        regions: ['United States'],
        commodities: ['Oil & Gas', 'Chemicals']
      },

      // REGULATORY CHANGE - 6 articles
      {
        title: "EU Announces New Sustainability Regulations for Imports",
        description: "New carbon border adjustment mechanism to affect steel and aluminum imports starting next quarter, requiring additional compliance documentation.",
        category: 'regulatory_change',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Steel', 'Aluminum']
      },
      {
        title: "FDA Tightens Quality Requirements for Pharmaceutical Ingredients",
        description: "New regulations require enhanced documentation and testing for active pharmaceutical ingredients, affecting import timelines from major producing nations.",
        category: 'regulatory_change',
        severity: 'high',
        regions: ['United States', 'India'],
        commodities: ['Chemicals']
      },
      {
        title: "China Implements New Rare Earth Export Licensing Requirements",
        description: "Revised export controls require additional permits for rare earth materials, creating uncertainty for global electronics and EV manufacturers.",
        category: 'regulatory_change',
        severity: 'critical',
        regions: ['China', 'Global'],
        commodities: ['Rare Earths', 'Electronics', 'Automotive Parts']
      },
      {
        title: "California Proposes Stricter Battery Recycling Mandates",
        description: "New state regulations would require full supply chain traceability for EV batteries, impacting procurement strategies for automakers.",
        category: 'regulatory_change',
        severity: 'medium',
        regions: ['United States'],
        commodities: ['Automotive Parts', 'Rare Earths']
      },
      {
        title: "UK Introduces Post-Brexit Chemical Registration System",
        description: "New UK REACH regulations require separate chemical registration from EU system, adding compliance burden for manufacturers serving both markets.",
        category: 'regulatory_change',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Chemicals']
      },
      {
        title: "Japan Strengthens Semiconductor Export Controls",
        description: "Government expands list of controlled semiconductor manufacturing equipment, aligning with international export restriction frameworks.",
        category: 'regulatory_change',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Semiconductors', 'Electronics']
      },

      // SUPPLIER DISTRESS - 6 articles
      {
        title: "European Chemical Suppliers Face Energy Cost Pressures",
        description: "Rising natural gas prices force several major European chemical manufacturers to reduce production capacity by 15-20%.",
        category: 'supplier_distress',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Chemicals']
      },
      {
        title: "Automotive Supplier Files for Bankruptcy Protection",
        description: "Major tier-2 automotive supplier announces Chapter 11 filing, potentially disrupting parts supply to multiple OEM manufacturers.",
        category: 'supplier_distress',
        severity: 'high',
        regions: ['United States'],
        commodities: ['Automotive Parts']
      },
      {
        title: "Steel Producer Suspends Operations Amid Financial Troubles",
        description: "Mid-sized steel manufacturer halts production citing liquidity issues, leaving customers scrambling for alternative supply sources.",
        category: 'supplier_distress',
        severity: 'high',
        regions: ['Europe'],
        commodities: ['Steel', 'Automotive Parts']
      },
      {
        title: "Electronics Contract Manufacturer Reports Credit Downgrade",
        description: "Major EMS provider faces credit rating reduction, raising concerns about production continuity for multiple OEM customers.",
        category: 'supplier_distress',
        severity: 'medium',
        regions: ['Asia Pacific'],
        commodities: ['Electronics', 'Semiconductors']
      },
      {
        title: "Textile Supplier Network Faces Collapse in Southeast Asia",
        description: "Multiple garment manufacturers in Bangladesh report financial distress following order cancellations, threatening apparel supply chains.",
        category: 'supplier_distress',
        severity: 'high',
        regions: ['Asia Pacific'],
        commodities: ['Textiles']
      },
      {
        title: "Aluminum Smelter Announces Permanent Closure",
        description: "European aluminum producer closes operations citing uncompetitive energy costs, removing significant capacity from regional supply base.",
        category: 'supplier_distress',
        severity: 'critical',
        regions: ['Europe'],
        commodities: ['Aluminum']
      },

      // COMMODITY SHORTAGE - 6 articles
      {
        title: "Rare Earth Supply Concerns Amid Export Restrictions",
        description: "Growing concerns over rare earth element availability as major producing nations signal potential export limitations for strategic materials.",
        category: 'commodity_shortage',
        severity: 'high',
        regions: ['China', 'Global'],
        commodities: ['Rare Earths', 'Electronics']
      },
      {
        title: "Global Copper Inventory Reaches Critical Low",
        description: "Exchange warehouse stocks hit decade lows as demand outpaces mining output. Prices surge 15% in recent trading sessions.",
        category: 'commodity_shortage',
        severity: 'critical',
        regions: ['Global'],
        commodities: ['Copper']
      },
      {
        title: "Lithium Supply Tightens Amid EV Battery Demand Surge",
        description: "Battery-grade lithium carbonate faces severe shortage as electric vehicle production ramps faster than mining capacity expansion.",
        category: 'commodity_shortage',
        severity: 'high',
        regions: ['Global', 'Latin America'],
        commodities: ['Rare Earths', 'Automotive Parts']
      },
      {
        title: "Specialty Steel Alloys Face Extended Lead Times",
        description: "High-grade steel alloys for aerospace and automotive applications now require 16-20 week lead times, up from historical 8-10 weeks.",
        category: 'commodity_shortage',
        severity: 'medium',
        regions: ['Global'],
        commodities: ['Steel', 'Automotive Parts']
      },
      {
        title: "Semiconductor-Grade Neon Gas Supply Disrupted",
        description: "Critical noble gas used in chip manufacturing faces supply constraints following production disruptions in Eastern Europe.",
        category: 'commodity_shortage',
        severity: 'critical',
        regions: ['Europe', 'Global'],
        commodities: ['Semiconductors', 'Chemicals']
      },
      {
        title: "Natural Rubber Prices Spike on Supply Shortage",
        description: "Southeast Asian rubber production impacted by weather and disease, driving prices to multi-year highs for tire and industrial manufacturers.",
        category: 'commodity_shortage',
        severity: 'medium',
        regions: ['Asia Pacific', 'Global'],
        commodities: ['Automotive Parts', 'Textiles']
      },

      // SUPPLY CHAIN DISRUPTION - 6 articles
      {
        title: "Major Logistics Hub Faces Extended Delays Due to System Outage",
        description: "Critical distribution center experiences IT infrastructure failure, causing ripple effects across regional supply networks. Recovery expected within 5-7 days.",
        category: 'supply_chain_disruption',
        severity: 'high',
        regions: ['United States', 'Europe'],
        commodities: ['Electronics', 'Automotive Parts', 'Chemicals']
      },
      {
        title: "Freight Carrier Network Disruption Impacts Cross-Border Trade",
        description: "Multiple trucking companies report driver shortages and equipment constraints, creating bottlenecks at major border crossings and ports.",
        category: 'supply_chain_disruption',
        severity: 'medium',
        regions: ['United States', 'Latin America'],
        commodities: ['Automotive Parts', 'Textiles']
      },
      {
        title: "Air Cargo Capacity Crisis Hits Time-Sensitive Shipments",
        description: "Reduction in passenger airline belly cargo capacity creates severe shortage for expedited freight, driving air cargo rates to record highs.",
        category: 'supply_chain_disruption',
        severity: 'high',
        regions: ['Global'],
        commodities: ['Electronics', 'Semiconductors', 'Chemicals']
      },
      {
        title: "Rail Network Disruption Impacts Intermodal Freight Movement",
        description: "Major railroad operator reports service delays following equipment failures, affecting container movement from ports to inland distribution centers.",
        category: 'supply_chain_disruption',
        severity: 'medium',
        regions: ['United States'],
        commodities: ['Steel', 'Automotive Parts', 'Chemicals']
      },
      {
        title: "Warehouse Automation Failure Halts Major Distribution Center",
        description: "Robotics system malfunction at key fulfillment center causes multi-day shutdown, delaying thousands of customer orders.",
        category: 'supply_chain_disruption',
        severity: 'high',
        regions: ['Europe'],
        commodities: ['Electronics', 'Textiles']
      },
      {
        title: "Container Shortage Continues to Plague Global Trade",
        description: "Imbalance in container repositioning leaves Asian exporters facing 4-6 week waits for equipment, extending delivery timelines globally.",
        category: 'supply_chain_disruption',
        severity: 'critical',
        regions: ['Asia Pacific', 'Global'],
        commodities: ['Electronics', 'Textiles', 'Automotive Parts']
      },

      // LABOR STRIKE - 6 articles
      {
        title: "Dockworkers Strike at Major European Ports Enters Second Week",
        description: "Labor negotiations stall as port workers demand wage increases and improved working conditions. Container handling capacity reduced by 60%.",
        category: 'labor_strike',
        severity: 'critical',
        regions: ['Europe'],
        commodities: ['Steel', 'Aluminum', 'Chemicals', 'Electronics']
      },
      {
        title: "Auto Workers Union Announces Work Stoppage at Multiple Plants",
        description: "Major automaker faces production disruption as union workers walk out over contract dispute. Industry analysts warn of parts shortage ripple effects.",
        category: 'labor_strike',
        severity: 'high',
        regions: ['United States'],
        commodities: ['Automotive Parts', 'Steel']
      },
      {
        title: "Mining Workers Strike Threatens Copper Production",
        description: "Labor action at major copper mines in Chile and Peru threatens to remove significant production capacity from global market.",
        category: 'labor_strike',
        severity: 'critical',
        regions: ['Latin America'],
        commodities: ['Copper', 'Rare Earths']
      },
      {
        title: "Refinery Workers Vote for Industrial Action Over Safety Concerns",
        description: "Unionized refinery workers authorize strike at multiple Gulf Coast facilities, potentially impacting petroleum product supply.",
        category: 'labor_strike',
        severity: 'high',
        regions: ['United States'],
        commodities: ['Oil & Gas', 'Chemicals']
      },
      {
        title: "Air Traffic Controllers Work-to-Rule Action Delays Cargo Flights",
        description: "European air traffic controllers implement work slowdown, causing significant delays and cancellations for time-sensitive freight.",
        category: 'labor_strike',
        severity: 'medium',
        regions: ['Europe'],
        commodities: ['Electronics', 'Semiconductors']
      },
      {
        title: "Truckers Association Announces Highway Blockade Protest",
        description: "Transport workers in multiple countries coordinate protest action over fuel costs and working conditions, threatening freight movement.",
        category: 'labor_strike',
        severity: 'high',
        regions: ['Europe', 'Latin America'],
        commodities: ['Steel', 'Automotive Parts', 'Textiles']
      },

      // GEOPOLITICAL TENSION - 6 articles
      {
        title: "Middle East Tensions Impact Oil Shipping Routes",
        description: "Shipping companies reroute vessels around Red Sea following regional security concerns, adding 10-14 days to Europe-Asia transit times.",
        category: 'geopolitical_tension',
        severity: 'critical',
        regions: ['Middle East', 'Europe', 'Asia Pacific'],
        commodities: ['Oil & Gas', 'Chemicals']
      },
      {
        title: "Taiwan Strait Tensions Raise Supply Chain Continuity Concerns",
        description: "Increased military activity in Taiwan Strait prompts manufacturers to evaluate contingency plans for semiconductor supply disruption.",
        category: 'geopolitical_tension',
        severity: 'critical',
        regions: ['Asia Pacific', 'Global'],
        commodities: ['Semiconductors', 'Electronics']
      },
      {
        title: "Sanctions Expansion Impacts Russian Raw Material Exports",
        description: "New international sanctions targeting Russian commodities create supply uncertainty for palladium, titanium, and fertilizer materials.",
        category: 'geopolitical_tension',
        severity: 'high',
        regions: ['Europe', 'Global'],
        commodities: ['Rare Earths', 'Steel', 'Chemicals']
      },
      {
        title: "Border Disputes Disrupt Central Asian Trade Corridors",
        description: "Political tensions between neighboring states close key land trade routes, forcing cargo rerouting through longer alternative paths.",
        category: 'geopolitical_tension',
        severity: 'medium',
        regions: ['Asia Pacific'],
        commodities: ['Textiles', 'Rare Earths']
      },
      {
        title: "South China Sea Incidents Raise Maritime Insurance Costs",
        description: "Increased risk premiums for vessels transiting contested waters add to shipping costs for Asia-Pacific trade routes.",
        category: 'geopolitical_tension',
        severity: 'medium',
        regions: ['Asia Pacific'],
        commodities: ['Electronics', 'Oil & Gas']
      },
      {
        title: "African Political Instability Threatens Mining Operations",
        description: "Civil unrest in mineral-rich regions prompts evacuation of expatriate staff and suspension of critical mining activities.",
        category: 'geopolitical_tension',
        severity: 'high',
        regions: ['Africa'],
        commodities: ['Rare Earths', 'Copper']
      },

      // ECONOMIC CRISIS - 6 articles
      {
        title: "Currency Crisis in Emerging Markets Impacts Procurement Costs",
        description: "Sharp devaluation in multiple emerging market currencies driving up import costs for raw materials. Manufacturers reassessing supplier contracts.",
        category: 'economic_crisis',
        severity: 'high',
        regions: ['Latin America', 'Asia Pacific'],
        commodities: ['Rare Earths', 'Textiles', 'Chemicals']
      },
      {
        title: "Global Inflation Surge Forces Supply Chain Cost Restructuring",
        description: "Rising inflation across major economies pushing manufacturers to renegotiate long-term supply agreements. Transportation and energy costs up 25% year-over-year.",
        category: 'economic_crisis',
        severity: 'medium',
        regions: ['Global', 'Europe', 'United States'],
        commodities: ['Steel', 'Aluminum', 'Oil & Gas', 'Chemicals']
      },
      {
        title: "Central Bank Rate Hikes Squeeze Manufacturing Credit Access",
        description: "Aggressive monetary tightening restricts working capital availability for manufacturers, forcing inventory reduction and delayed expansion plans.",
        category: 'economic_crisis',
        severity: 'high',
        regions: ['Global', 'United States', 'Europe'],
        commodities: ['Steel', 'Automotive Parts', 'Electronics']
      },
      {
        title: "Energy Price Volatility Forces European Factory Curtailments",
        description: "Extreme electricity and gas price swings make production planning impossible for energy-intensive industries. Temporary shutdowns becoming common.",
        category: 'economic_crisis',
        severity: 'critical',
        regions: ['Europe'],
        commodities: ['Steel', 'Aluminum', 'Chemicals']
      },
      {
        title: "Banking Sector Stress Impacts Trade Finance Availability",
        description: "Financial institution difficulties restrict letters of credit and trade financing, delaying international procurement transactions.",
        category: 'economic_crisis',
        severity: 'high',
        regions: ['Global'],
        commodities: ['Electronics', 'Steel', 'Textiles']
      },
      {
        title: "Demand Destruction Signals as Consumer Spending Contracts",
        description: "Economic slowdown reduces end-consumer demand, creating inventory buildup across supply chains and prompting order cancellations.",
        category: 'economic_crisis',
        severity: 'medium',
        regions: ['United States', 'Europe'],
        commodities: ['Electronics', 'Textiles', 'Automotive Parts']
      }
    ];

    const alerts: NewsAlert[] = [];
    
    for (const event of simulatedEvents) {
      const geopoliticalEvent: GeopoliticalEvent = {
        eventType: this.categoryToEventType(event.category),
        region: event.regions[0],
        severity: event.severity,
        description: event.description,
        commoditiesAffected: event.commodities,
        suppliersAffected: [],
        startDate: new Date()
      };

      const riskAssessment = await this.riskEngine.assessRisk(geopoliticalEvent, currentFDR);

      const daysAgo = Math.floor(Math.random() * 3);
      const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Curated news from industry sources
      const industrySources = [
        'Supply Chain Digest',
        'Logistics Management',
        'Manufacturing Today',
        'Industry Week',
        'Supply Chain Brain',
        'FreightWaves',
        'The Loadstar'
      ];
      const selectedSource = industrySources[Math.floor(Math.random() * industrySources.length)];
      
      alerts.push({
        id: this.generateId(event.title, publishedAt.toISOString()),
        title: event.title,
        description: event.description,
        source: selectedSource,
        sourceUrl: '#',
        publishedAt,
        category: event.category,
        severity: event.severity,
        relevanceScore: 75 + Math.floor(Math.random() * 20),
        affectedRegions: event.regions,
        affectedCommodities: event.commodities,
        keywords: event.description.toLowerCase().split(' ').filter(w => w.length > 5).slice(0, 5),
        fdrImpact: riskAssessment.fdrImpact,
        fdrContext: riskAssessment.procurementImpact,
        recommendations: riskAssessment.recommendations,
        riskLevel: riskAssessment.riskLevel,
        processedAt: new Date()
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  getCategoryLabel(category: NewsCategory): string {
    const labels: Record<NewsCategory, string> = {
      port_closure: 'Port Closure',
      trade_dispute: 'Trade Dispute',
      natural_disaster: 'Natural Disaster',
      regulatory_change: 'Regulatory Change',
      supplier_distress: 'Supplier Distress',
      supply_chain_disruption: 'Supply Chain Disruption',
      commodity_shortage: 'Commodity Shortage',
      labor_strike: 'Labor Strike',
      geopolitical_tension: 'Geopolitical Tension',
      economic_crisis: 'Economic Crisis'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: NewsCategory): string {
    const icons: Record<NewsCategory, string> = {
      port_closure: 'ship',
      trade_dispute: 'scale',
      natural_disaster: 'cloud-lightning',
      regulatory_change: 'file-text',
      supplier_distress: 'trending-down',
      supply_chain_disruption: 'package-x',
      commodity_shortage: 'box',
      labor_strike: 'users',
      geopolitical_tension: 'globe',
      economic_crisis: 'dollar-sign'
    };
    return icons[category] || 'alert-circle';
  }
}
