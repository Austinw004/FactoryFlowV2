/**
 * humanizeError — convert raw API/network/runtime errors into operator-ready
 * toast copy for a Palantir-grade UI.
 *
 * Why: `apiRequest` throws `new Error(\`${res.status}: ${text}\`)` where `text`
 * is whatever the server returned — a JSON blob, a stack trace, or nothing.
 * Dumping that into a toast leaks developer language to plant directors.
 *
 * Contract:
 *   humanizeError(err, fallback?)
 *     -> { title: string; description: string; code?: number; raw?: string }
 *
 * Use at the call site:
 *
 *   onError: (err) => toast({ ...humanizeError(err, "Allocation failed"), variant: "destructive" })
 *
 * The helper never throws. Unknown inputs produce the fallback with a
 * generic description.
 */

export interface HumanError {
  title: string;
  description: string;
  /** HTTP status code if one was parsed from the error message. */
  code?: number;
  /** Original message, useful for copy-to-clipboard "Show details" UI. */
  raw?: string;
}

/**
 * Known HTTP status codes mapped to operator-facing copy. Keep the language
 * prescriptive — tell the user what to do next, not what went wrong
 * internally.
 */
const STATUS_COPY: Record<number, { title: string; description: string }> = {
  400: {
    title: "Request rejected",
    description: "Something in the request wasn't valid. Double-check the fields and try again.",
  },
  401: {
    title: "Session expired",
    description: "Please sign in again to continue.",
  },
  403: {
    title: "Not allowed",
    description: "Your account doesn't have permission for this action. Contact your admin if you need access.",
  },
  404: {
    title: "Not found",
    description: "This item no longer exists. It may have been deleted or moved.",
  },
  409: {
    title: "Conflict with existing data",
    description: "Another change was made first. Refresh and try again.",
  },
  413: {
    title: "Too much data",
    description: "The payload is too large. Try splitting into smaller batches.",
  },
  422: {
    title: "Validation failed",
    description: "Some fields are invalid. Check the form for details and try again.",
  },
  429: {
    title: "Too many requests",
    description: "You're being rate-limited. Wait a moment and try again.",
  },
  500: {
    title: "Server error",
    description: "Something went wrong on our end. The team has been notified. Try again in a moment.",
  },
  502: {
    title: "Upstream service unreachable",
    description: "A dependency is temporarily unavailable. Retry in a minute.",
  },
  503: {
    title: "Service temporarily unavailable",
    description: "We're restoring service. Try again in a minute.",
  },
  504: {
    title: "Request timed out",
    description: "The operation took too long. Check your connection and retry.",
  },
};

/**
 * Parse `apiRequest`-style error strings: "503: Service Unavailable" or
 * "400: {...json...}". Returns {code, tail} or null if no status prefix.
 */
function parseStatusPrefix(msg: string): { code: number; tail: string } | null {
  const match = /^(\d{3}):\s*(.*)$/s.exec(msg);
  if (!match) return null;
  const code = Number.parseInt(match[1], 10);
  if (!Number.isFinite(code) || code < 100 || code > 599) return null;
  return { code, tail: match[2] ?? "" };
}

/**
 * Extract a server-sent `message` or `error` field from a JSON error body
 * without crashing on non-JSON input.
 */
function tryParseServerMessage(tail: string): string | null {
  const trimmed = tail.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      for (const key of ["message", "error", "detail", "reason"]) {
        const value = obj[key];
        if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
        }
      }
    }
  } catch {
    // not JSON; fall through
  }
  return null;
}

/**
 * Detect whether a string looks safe to show a non-technical user: short,
 * no stack traces, no raw object dumps, no developer keywords.
 */
function looksCustomerFriendly(s: string): boolean {
  if (!s) return false;
  if (s.length > 200) return false;
  if (/\bat [A-Za-z_$][\w$]*\s*\(/.test(s)) return false; // stack frame
  if (s.includes("\n")) return false;
  if (/\b(undefined|null|NaN|\[object Object\])\b/.test(s)) return false;
  if (/^\s*[{\[]/.test(s)) return false; // raw JSON
  if (/TypeError|ReferenceError|SyntaxError/.test(s)) return false;
  return true;
}

/**
 * Convert any thrown value into operator-ready toast copy.
 *
 * @param err      The caught error. Accepts Error, string, or unknown.
 * @param fallback Title to use when nothing better can be extracted.
 *                 Defaults to "Something went wrong".
 */
export function humanizeError(
  err: unknown,
  fallback: string = "Something went wrong",
): HumanError {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : undefined;

  // Case 1: nothing we can parse — generic fallback.
  if (!raw) {
    return {
      title: fallback,
      description: "Please try again. If the issue persists, contact support.",
    };
  }

  // Case 2: apiRequest-style "NNN: ..." prefix.
  const prefixed = parseStatusPrefix(raw);
  if (prefixed) {
    const { code, tail } = prefixed;
    const serverMsg = tryParseServerMessage(tail);
    const mapped = STATUS_COPY[code];

    if (mapped) {
      return {
        code,
        raw,
        title: mapped.title,
        description: serverMsg && looksCustomerFriendly(serverMsg) ? serverMsg : mapped.description,
      };
    }

    return {
      code,
      raw,
      title: fallback,
      description:
        serverMsg && looksCustomerFriendly(serverMsg)
          ? serverMsg
          : `Request failed with status ${code}. Try again, or contact support if it keeps happening.`,
    };
  }

  // Case 3: server returned a clean sentence without a status prefix.
  if (looksCustomerFriendly(raw)) {
    return { title: fallback, description: raw, raw };
  }

  // Case 4: developer-looking message — hide it, log it, show a generic note.
  if (typeof console !== "undefined" && typeof console.error === "function") {
    // eslint-disable-next-line no-console
    console.error("[humanizeError] suppressed developer message:", raw);
  }
  return {
    title: fallback,
    description: "Please try again. If the issue persists, contact support.",
    raw,
  };
}

/**
 * Convenience: spread directly into a toast call.
 *
 *   toast({ ...toastFromError(err, "Allocation failed"), variant: "destructive" })
 */
export function toastFromError(err: unknown, fallback?: string) {
  const { title, description } = humanizeError(err, fallback);
  return { title, description };
}
