import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // wouter does not expose query params on useLocation — read directly.
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.newPassword) {
      errs.newPassword = "Password is required";
    } else if (form.newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.newPassword)) {
      errs.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(form.newPassword)) {
      errs.newPassword = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(form.newPassword)) {
      errs.newPassword = "Password must contain at least one special character";
    }
    if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "This reset link is invalid or expired. Please request a new one.");
      }

      setSuccess(true);
      setTimeout(() => setLocation("/signin"), 2500);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "This reset link is invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Set a new password — Prescient Labs" description="Choose a new password for your Prescient Labs account." />

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
          {!token ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Invalid reset link</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This password reset link is missing a token. Please request a new link.
              </p>
              <Button className="w-full" onClick={() => setLocation("/forgot-password")}>
                Request a new link
              </Button>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Password updated</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been reset. Redirecting you to sign in...
              </p>
              <Button className="w-full" onClick={() => setLocation("/signin")}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-2">Set a new password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a strong password you haven't used before.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="text-sm">New password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 10 characters"
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="mt-1.5"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t text-center">
                <a href="/signin" className="text-sm text-muted-foreground hover:text-foreground">
                  Back to sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
