/**
 * Performance Utilities
 *
 * - Optimistic mutations
 * - Request deduplication
 * - Offline detection and graceful degradation
 * - Debounced search
 */

import { queryClient } from "./queryClient";

// ── Request Deduplication ──────────────────────────────────────────────────
const pendingRequests = new Map<string, Promise<Response>>();

export async function deduplicatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const key = `${options?.method || "GET"}:${url}`;

  // For GET requests, deduplicate concurrent calls
  if (!options?.method || options.method === "GET") {
    const pending = pendingRequests.get(key);
    if (pending) return pending;

    const promise = fetch(url, options).finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
  }

  return fetch(url, options);
}

// ── Optimistic Update Helper ───────────────────────────────────────────────
export function optimisticUpdate<T>(
  queryKey: string[],
  updater: (old: T | undefined) => T,
) {
  const previousData = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData(queryKey, updater(previousData));
  return previousData;
}

export function rollbackOptimistic<T>(queryKey: string[], previousData: T | undefined) {
  if (previousData !== undefined) {
    queryClient.setQueryData(queryKey, previousData);
  } else {
    queryClient.invalidateQueries({ queryKey });
  }
}

// ── Offline Detection ──────────────────────────────────────────────────────
let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const offlineListeners = new Set<(online: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    _isOnline = true;
    offlineListeners.forEach((fn) => fn(true));
    // Refetch stale queries when coming back online
    queryClient.invalidateQueries();
  });

  window.addEventListener("offline", () => {
    _isOnline = false;
    offlineListeners.forEach((fn) => fn(false));
  });
}

export function isOnline(): boolean {
  return _isOnline;
}

export function onConnectivityChange(listener: (online: boolean) => void): () => void {
  offlineListeners.add(listener);
  return () => offlineListeners.delete(listener);
}

// ── Debounced search ───────────────────────────────────────────────────────
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;

  const debounced = function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  } as T & { cancel: () => void };

  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

// ── Batch invalidation ─────────────────────────────────────────────────────
const pendingInvalidations = new Set<string>();
let invalidationTimer: ReturnType<typeof setTimeout> | null = null;

export function batchInvalidate(queryKey: string) {
  pendingInvalidations.add(queryKey);

  if (!invalidationTimer) {
    invalidationTimer = setTimeout(() => {
      pendingInvalidations.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      pendingInvalidations.clear();
      invalidationTimer = null;
    }, 100); // Batch within 100ms window
  }
}

// ── Memory-efficient data formatting ───────────────────────────────────────
const formatCache = new Map<string, string>();
const MAX_FORMAT_CACHE = 1000;

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const key = `${value}:${JSON.stringify(options)}`;
  const cached = formatCache.get(key);
  if (cached) return cached;

  const result = new Intl.NumberFormat("en-US", options).format(value);

  if (formatCache.size >= MAX_FORMAT_CACHE) {
    const firstKey = formatCache.keys().next().value;
    if (firstKey) formatCache.delete(firstKey);
  }
  formatCache.set(key, result);

  return result;
}

export function formatCurrency(value: number): string {
  return formatNumber(value, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatPercent(value: number): string {
  return formatNumber(value / 100, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCompact(value: number): string {
  return formatNumber(value, { notation: "compact", maximumFractionDigits: 1 });
}
