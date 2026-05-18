import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Email verification landing page.
 *
 * The link in the signup confirmation email points here:
 *   /verify-email?token=<64-hex-chars>
 *
 * Round-33 (F1 fix from round-24 audit). Without this, a typo'd email
 * at signup locked the customer out forever — no password reset path,
 * no way to contact them. Now: confirmation link arrives, lands here,
 * page POSTs the token to /api/auth/verify-email, flips
 * emailVerified=true server-side, customer sees success and can
 * continue.
 *
 * States: loading, success, already-verified, expired, error.
 */
type State =
  | { kind: "loading" }
  | { kind: "success"; alreadyVerified?: boolean }
  | { kind: "expired" }
  | { kind: "error"; message: string };

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    // Pull token from query string. wouter doesn't ship a useSearchParams
    // helper — fall back to the native URL constructor.
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      setState({ kind: "error", message: "No verification token in the URL. Click the link in your confirmation email." });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setState({ kind: "success", alreadyVerified: !!data.alreadyVerified });
          return;
        }
        if (res.status === 410 || data?.code === "TOKEN_EXPIRED") {
          setState({ kind: "expired" });
          return;
        }
        setState({ kind: "error", message: data?.message || data?.error || "Verification failed. The link may be invalid or already used." });
      } catch (err: any) {
        setState({ kind: "error", message: err?.message || "Network error while verifying. Please try again." });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="max-w-md w-full bg-card border border-line rounded-lg p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Prescient Labs</h1>

        {state.kind === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-signal" />
            <p className="text-soft text-sm">Verifying your email address…</p>
          </>
        )}

        {state.kind === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-good" />
            <h2 className="text-xl font-medium text-foreground mb-2">
              {state.alreadyVerified ? "Already verified" : "Email confirmed"}
            </h2>
            <p className="text-soft text-sm mb-6">
              {state.alreadyVerified
                ? "Your email is already verified. You're all set."
                : "Thanks for confirming. Your account is fully active."}
            </p>
            <Button onClick={() => setLocation("/dashboard")} className="w-full">
              Continue to dashboard
            </Button>
          </>
        )}

        {state.kind === "expired" && (
          <>
            <MailCheck className="w-12 h-12 mx-auto mb-4 text-signal" />
            <h2 className="text-xl font-medium text-foreground mb-2">Link expired</h2>
            <p className="text-soft text-sm mb-6">
              This verification link has expired (links are valid for 24 hours).
              You can request a fresh one from your account settings, or by
              signing in and clicking the resend prompt.
            </p>
            <Button onClick={() => setLocation("/signin")} className="w-full" variant="outline">
              Sign in
            </Button>
          </>
        )}

        {state.kind === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-bad" />
            <h2 className="text-xl font-medium text-foreground mb-2">Verification failed</h2>
            <p className="text-soft text-sm mb-6">{state.message}</p>
            <Button onClick={() => setLocation("/signin")} className="w-full" variant="outline">
              Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
