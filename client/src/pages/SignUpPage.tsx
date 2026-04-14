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

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "At least 8 characters";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Include an uppercase letter";
    else if (!/[0-9]/.test(form.password)) errs.password = "Include a number";
    else if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = "Include a special character";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Sign up failed. Please try again.");
      }

      const data = await res.json();

      // Store the access token
      if (data.accessToken) {
        localStorage.setItem("prescient_token", data.accessToken);
      }

      // Invalidate auth query so useAuth picks up the new user
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({ title: "Account created", description: "Welcome to Prescient Labs." });
      setLocation("/onboarding");
    } catch (err: any) {
      toast({
        title: "Sign up failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Sign Up — Prescient Labs" description="Create your Prescient Labs account." />

      {/* Minimal header */}
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
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Start your 90-day free trial. No credit card required.
            </p>
          </div>

          <SSOButtons mode="signup" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
                autoComplete="name"
                disabled={isLoading}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5"
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              <p className="text-xs text-muted-foreground mt-1.5">
                8+ characters with uppercase, number, and special character.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
            and <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/signin" className="font-medium text-foreground hover:underline">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
