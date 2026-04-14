import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { SEOHead } from "@/components/SEOHead";
import { SSOButtons } from "@/components/SSOButtons";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    emailOrUsername: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.emailOrUsername.trim()) errs.emailOrUsername = "Email or username is required";
    if (!form.password) errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: form.emailOrUsername.trim(),
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid credentials. Please try again.");
      }

      const data = await res.json();

      if (data.accessToken) {
        localStorage.setItem("prescient_token", data.accessToken);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Sign in failed",
        description: err.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Sign In — Prescient Labs" description="Sign in to your Prescient Labs account." />

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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          <SSOButtons mode="login" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="emailOrUsername" className="text-sm">Email or username</Label>
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="jane@company.com"
                value={form.emailOrUsername}
                onChange={(e) => setForm({ ...form, emailOrUsername: e.target.value })}
                className="mt-1.5"
                autoComplete="username"
                disabled={isLoading}
              />
              {errors.emailOrUsername && <p className="text-xs text-destructive mt-1">{errors.emailOrUsername}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot password?
                </a>
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
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
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href="/signup" className="font-medium text-foreground hover:underline">Create one</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
