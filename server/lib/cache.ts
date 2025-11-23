/**
 * Simple in-memory caching layer for frequently accessed data
 * Reduces database queries and external API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all cache keys matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let total = 0;
    let expired = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      total++;
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      totalEntries: total,
      expiredEntries: expired,
      activeEntries: total - expired,
      size: this.store.size,
    };
  }
}

// Singleton cache instance
export const cache = new Cache();

// Cache key generators for consistent naming
export const CacheKeys = {
  economicRegime: (companyId: string) => `economic:regime:${companyId}`,
  economicIndicators: (companyId: string) => `economic:indicators:${companyId}`,
  commodityPrices: (companyId: string) => `commodity:prices:${companyId}`,
  commodityPrice: (companyId: string, symbol: string) => `commodity:price:${companyId}:${symbol}`,
  allocations: (companyId: string) => `allocations:${companyId}`,
  skus: (companyId: string) => `skus:${companyId}`,
  materials: (companyId: string) => `materials:${companyId}`,
  suppliers: (companyId: string) => `suppliers:${companyId}`,
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  ECONOMIC_DATA: 5 * 60 * 1000, // 5 minutes (matches background job interval)
  COMMODITY_PRICES: 10 * 60 * 1000, // 10 minutes (matches background job interval)
  MASTER_DATA: 30 * 60 * 1000, // 30 minutes for SKUs, materials, suppliers
  SHORT: 60 * 1000, // 1 minute for frequently changing data
  LONG: 60 * 60 * 1000, // 1 hour for rarely changing data
};
