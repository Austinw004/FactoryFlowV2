import type { Regime } from "./economics";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  regime: Regime;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  regimeSwitches: number;
}

export class RegimeAwareCache {
  private cache: Map<string, CacheEntry<any>>;
  private stats: CacheStats;
  private currentRegime: Regime;
  
  private regimeTTLs: Record<Regime, Record<string, number>> = {
    HEALTHY_EXPANSION: {
      economicData: 300,
      commodityPrices: 600,
      forecasts: 3600,
      allocations: 1800,
      supplyChainRisk: 3600,
      masterData: 3600,
      default: 300
    },
    ASSET_LED_GROWTH: {
      economicData: 180,
      commodityPrices: 300,
      forecasts: 1800,
      allocations: 900,
      supplyChainRisk: 1800,
      masterData: 1800,
      default: 180
    },
    IMBALANCED_EXCESS: {
      economicData: 60,
      commodityPrices: 120,
      forecasts: 600,
      allocations: 300,
      supplyChainRisk: 600,
      masterData: 900,
      default: 60
    },
    REAL_ECONOMY_LEAD: {
      economicData: 45,
      commodityPrices: 90,
      forecasts: 300,
      allocations: 180,
      supplyChainRisk: 300,
      masterData: 600,
      default: 45
    }
  };

  constructor(initialRegime: Regime = "HEALTHY_EXPANSION") {
    this.cache = new Map();
    this.currentRegime = initialRegime;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      regimeSwitches: 0
    };

    setInterval(() => this.evictExpired(), 30000);
  }

  updateRegime(newRegime: Regime): void {
    if (newRegime !== this.currentRegime) {
      console.log(`[Cache] Regime change: ${this.currentRegime} → ${newRegime}`);
      this.stats.regimeSwitches++;
      this.currentRegime = newRegime;
      
      this.invalidateRegimeSensitiveKeys();
    }
  }

  private invalidateRegimeSensitiveKeys(): void {
    const regimeSensitivePatterns = ['economicData', 'forecasts', 'supplyChainRisk'];
    let invalidated = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, _] of entries) {
      if (regimeSensitivePatterns.some(pattern => key.includes(pattern))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    if (invalidated > 0) {
      console.log(`[Cache] Invalidated ${invalidated} regime-sensitive entries`);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, category: string = 'default'): void {
    const ttl = this.regimeTTLs[this.currentRegime][category] || 
                this.regimeTTLs[this.currentRegime].default;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      regime: this.currentRegime
    });
    
    this.stats.sets++;
  }

  invalidate(keyOrPattern: string): number {
    if (keyOrPattern.includes('*')) {
      const pattern = keyOrPattern.replace('*', '');
      let deleted = 0;
      
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          deleted++;
        }
      }
      
      return deleted;
    } else {
      const deleted = this.cache.delete(keyOrPattern);
      return deleted ? 1 : 0;
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      const age = now - entry.timestamp;
      if (age > entry.ttl * 1000) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    if (evicted > 0) {
      this.stats.evictions += evicted;
    }
  }

  getStats(): CacheStats & { size: number; hitRate: number; currentRegime: Regime; ttls: Record<string, number> } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      currentRegime: this.currentRegime,
      ttls: this.regimeTTLs[this.currentRegime]
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const globalCache = new RegimeAwareCache();
