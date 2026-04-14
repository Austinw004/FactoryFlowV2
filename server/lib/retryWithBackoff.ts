/**
 * Exponential backoff retry utility for resilient external API calls.
 *
 * Use for any outbound HTTP request to third-party services (Stripe, supplier
 * APIs, commodity price feeds, etc.) where transient failures are expected.
 *
 * Retries on: network errors, 5xx responses, 429 rate-limit responses.
 * Does NOT retry on: 4xx client errors (except 429), auth failures, validation errors.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default 3). Total calls = attempts + 1. */
  attempts?: number;
  /** Starting backoff delay in ms (default 500). */
  initialDelayMs?: number;
  /** Max backoff delay in ms cap (default 10_000). */
  maxDelayMs?: number;
  /** Backoff multiplier (default 2 — exponential). */
  factor?: number;
  /** Add jitter of ±25% to avoid thundering herd (default true). */
  jitter?: boolean;
  /** Optional callback invoked on each retry. */
  onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void;
  /** Optional predicate — return false to abort retrying. */
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry" | "shouldRetry">> = {
  attempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 10_000,
  factor: 2,
  jitter: true,
};

/**
 * Default retry predicate: retry on network errors, 5xx, and 429.
 */
function defaultShouldRetry(error: unknown): boolean {
  if (!error) return false;
  const anyErr = error as any;
  // Node fetch / undici network errors
  if (anyErr.code && ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(anyErr.code)) {
    return true;
  }
  // HTTP status on Response-like errors
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status;
  if (typeof status === 'number') {
    return status === 429 || (status >= 500 && status < 600);
  }
  // Explicit retry flag on Stripe/AWS style errors
  if (anyErr.type === 'StripeConnectionError' || anyErr.type === 'StripeAPIError') return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * @example
 *   const result = await retryWithBackoff(
 *     () => fetch('https://api.supplier.com/prices').then(r => r.json()),
 *     { attempts: 5, initialDelayMs: 1000 }
 *   );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === opts.attempts || !shouldRetry(error)) {
        throw error;
      }
      // Apply jitter
      let effectiveDelay = delay;
      if (opts.jitter) {
        const jitterAmount = delay * 0.25;
        effectiveDelay = delay + (Math.random() * 2 - 1) * jitterAmount;
      }
      effectiveDelay = Math.min(Math.max(effectiveDelay, 0), opts.maxDelayMs);

      options.onRetry?.(error, attempt + 1, effectiveDelay);
      await sleep(effectiveDelay);
      delay = Math.min(delay * opts.factor, opts.maxDelayMs);
    }
  }
  // Unreachable, but TS needs it.
  throw lastError;
}
