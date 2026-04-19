import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

/**
 * AuthCallback
 *
 * Landing page for the Google / Apple OAuth redirect flow.
 *
 * The server (server/authPaymentRoutes.ts) issues a 302 to
 *   /auth/callback#accessToken=<jwt>&new=<0|1>
 * after a successful code exchange. We read the JWT out of the URL hash
 * (so it is never sent to the server in the Referer header or logged),
 * stash it in localStorage under `prescient_token`, clear the hash, and
 * redirect to `/` (or `/welcome` for first-time signups).
 */
export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hash is like "#accessToken=xxx&new=1"
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("accessToken");
    const isNew = params.get("new") === "1";

    // Also check the query string for an explicit `error` param (in case the
    // server redirected to /auth/callback?error=… — currently it sends errors
    // to /signin?error=… but we handle both for forward compat).
    const query = new URLSearchParams(window.location.search);
    const errorParam = query.get("error");

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!accessToken) {
      setError("No access token received. Please try signing in again.");
      return;
    }

    // Stash the JWT for the rest of the app to use on Authorization headers.
    localStorage.setItem("prescient_token", accessToken);

    // Scrub the hash from the URL so the token never ends up in the browser
    // history or in any Share dialog.
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    } catch {
      // Non-fatal if replaceState is blocked — we still have the token.
    }

    // Refresh anything keyed on the user query.
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }).catch(() => {});

    // Small timeout so the token is visible to React Query before the redirect
    // triggers a protected-route check.
    const t = setTimeout(() => {
      setLocation(isNew ? "/onboarding" : "/");
    }, 50);
    return () => clearTimeout(t);
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Sign-in failed
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setLocation("/signin")}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover-elevate active-elevate-2"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
      </div>
    </div>
  );
}
