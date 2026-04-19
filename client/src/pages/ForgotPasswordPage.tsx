import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required");
      return;
    }

    // Lightweight email shape check — server enforces full validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // The API intentionally returns a generic response whether or not
      // the account exists, to avoid leaking which emails are registered.
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unable to process request. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err.message || "Unable to process request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Reset password — Prescient Labs" description="Reset your Prescient Labs account password." />

      <nav className="border-b border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background text-xs font-bold">P</span>
            </div>
            <span className="font-semibold text-base tracking-tight">Prescient Labs</span>
          </a>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Check your email</h1>
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for <span className="font-medium text-foreground">{email.trim()}</span>, you'll receive a password reset link shortly. The link expires in one hour.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>
                <a href="/signin" className="block text-sm text-muted-foreground hover:text-foreground">
                  Back to sign in
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-2">Forgot password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <a href="/signin" className="font-medium text-foreground hover:underline">Sign in</a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
