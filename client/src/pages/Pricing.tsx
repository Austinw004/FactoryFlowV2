import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, Zap, Building2, Rocket, Crown, ArrowRight, Shield,
  TrendingDown, DollarSign, Calculator, Target, Award, CheckCircle2,
  BarChart3, Scale, Handshake, Percent, CreditCard, Loader2,
  Activity, TrendingUp
} from "lucide-react";

// ─── Plan Data ────────────────────────────────────────────────────────────────

const FEATURES_ALL = [
  "Demand forecasting & regime intelligence",
  "Material allocation & budget optimization",
  "Real-time commodity pricing",
  "Supply chain visibility & risk scoring",
  "Automated RFQ generation",
  "ERP integration templates",
  "AI copilot & decision playbooks",
  "ROI dashboard & savings tracking",
  "Multi-tenant data isolation",
  "SOC 2 audit trail",
];

const subscriptionPlans = [
  {
    id: "monthly_starter",
    planId: "monthly_starter",
    name: "Starter",
    period: "monthly",
    description: "Full platform access, billed monthly.",
    price: 299,
    annualEquiv: null,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    popular: false,
  },
  {
    id: "monthly_growth",
    planId: "monthly_growth",
    name: "Growth",
    period: "monthly",
    description: "Scaled for larger operations, billed monthly.",
    price: 799,
    annualEquiv: null,
    icon: Rocket,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    popular: true,
  },
  {
    id: "annual_starter",
    planId: "annual_starter",
    name: "Starter",
    period: "annual",
    description: "Full platform access, billed annually.",
    price: 249,           // $2,990 / 12
    annualTotal: 2990,
    annualEquiv: 299,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    popular: false,
  },
  {
    id: "annual_growth",
    planId: "annual_growth",
    name: "Growth",
    period: "annual",
    description: "Scaled for larger operations, billed annually.",
    price: 666,           // $7,990 / 12
    annualTotal: 7990,
    annualEquiv: 799,
    icon: Rocket,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    popular: false,
  },
];

const usagePlan = {
  id: "usage_based",
  planId: "usage_based",
  name: "Usage-Based",
  description: "Low monthly base plus pay-as-you-go metered charges tied to actual platform usage.",
  basePrice: 199,
  icon: Activity,
  color: "text-teal-500",
  bgColor: "bg-teal-100 dark:bg-teal-900/30",
  meterItems: [
    "API calls beyond 10K/month",
    "Forecast runs beyond 500/month",
    "RFQ generations beyond 50/month",
    "Automated PO executions",
  ],
};

const performancePlan = {
  id: "performance",
  planId: "performance",
  name: "Performance",
  description: "Pay a small base fee plus 15% of verified, measured procurement savings only. Never charged on estimates.",
  basePrice: 100,
  feeRate: 15,
  icon: TrendingUp,
  color: "text-amber-500",
  bgColor: "bg-amber-100 dark:bg-amber-900/30",
  highlights: [
    "Only verified, measured savings are billed",
    "Full evidence chain required — no estimates",
    "Trust score guard (< 0.4 blocked automatically)",
    "Anomaly detection on savings spikes",
    "Duplicate billing prevented at DB level",
    "Complete audit trail on every charge",
  ],
};

const competitorComparison = [
  { name: "Prescient Labs (Performance)", savingsShare: "15%", platformFee: "$100/mo", approach: "Only verified savings — never estimates", highlight: true },
  { name: "Prescient Labs (Subscription)", savingsShare: "None", platformFee: "$299–$799/mo", approach: "Fixed fee, all features included", highlight: true },
  { name: "Coupa", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Savings share + platform fee" },
  { name: "SAP Ariba", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Per-supplier + transaction fees" },
  { name: "Jaggaer", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Module-based pricing" },
  { name: "Fairmarkit", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Savings share model" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [pricingTab, setPricingTab] = useState<"subscription" | "variable">("subscription");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [estimatedSavings, setEstimatedSavings] = useState(500000);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: stripeProducts } = useQuery<{ products: Array<{
    id: string; name: string; description: string; metadata: any;
    prices: Array<{ id: string; unit_amount: number; currency: string; recurring: any; active: boolean; metadata: any }>;
  }> }>({
    queryKey: ["/api/stripe/products"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, withTrial }: { priceId: string; withTrial: boolean }) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId, withTrial });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: "Checkout Error", description: error.message || "Failed to start checkout.", variant: "destructive" });
      setCheckoutLoading(null);
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  const findPriceForPlan = (planId: string): string | null => {
    if (!stripeProducts?.products) return null;
    for (const product of stripeProducts.products) {
      const meta = product.metadata as any;
      if (meta?.planId === planId || meta?.tier === planId) {
        const monthly = product.prices.find(p => p.recurring?.interval === "month");
        return monthly?.id || product.prices[0]?.id || null;
      }
    }
    return null;
  };

  const handleGetStarted = (planId: string) => {
    if (!isAuthenticated) { window.location.href = "/api/login"; return; }
    if (planId === "performance") { setLocation("/pilot-program"); return; }

    const priceId = findPriceForPlan(planId);
    if (!priceId) {
      toast({ title: "Plan Not Available", description: "This plan is not yet available for self-service checkout. Please contact sales.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(planId);
    checkoutMutation.mutate({ priceId, withTrial: true });
  };

  // Subscription plans filtered by billing period
  const visibleSubPlans = subscriptionPlans.filter(p => p.period === billingPeriod);

  // Performance calculator
  const perfFee = estimatedSavings * 0.15;
  const perfBase = 100 * 12; // annual base
  const perfTotal = perfFee + perfBase;
  const perfNet = estimatedSavings - perfTotal;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Six plans, all features included. Choose a flat subscription, metered usage, or let your savings drive what you pay.
          </p>

          <Tabs value={pricingTab} onValueChange={(v) => setPricingTab(v as "subscription" | "variable")} className="w-full max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscription" className="flex items-center gap-2" data-testid="tab-subscription">
                <CreditCard className="h-4 w-4" />
                Fixed Subscription
              </TabsTrigger>
              <TabsTrigger value="variable" className="flex items-center gap-2" data-testid="tab-variable">
                <Percent className="h-4 w-4" />
                Usage &amp; Performance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ── Fixed Subscription Plans ── */}
        {pricingTab === "subscription" && (
          <>
            {/* Monthly / Annual toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={billingPeriod === "monthly" ? "font-medium" : "text-muted-foreground"}>Monthly</span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
                className={`relative w-14 h-7 rounded-full transition-colors ${billingPeriod === "annual" ? "bg-primary" : "bg-muted"}`}
                data-testid="toggle-billing-period"
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${billingPeriod === "annual" ? "translate-x-8" : "translate-x-1"}`} />
              </button>
              <span className={billingPeriod === "annual" ? "font-medium" : "text-muted-foreground"}>
                Annual
                <Badge variant="secondary" className="ml-2">Best value</Badge>
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              {visibleSubPlans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${plan.popular ? "border-primary" : ""}`}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Crown className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${plan.bgColor} flex items-center justify-center ${plan.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">${plan.price.toLocaleString()}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        {plan.period === "annual" && (plan as any).annualTotal && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">
                              ${(plan as any).annualTotal.toLocaleString()} billed annually
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              ${(((plan as any).annualEquiv - plan.price) * 12).toLocaleString()}/year less than monthly billing
                            </p>
                          </>
                        )}
                      </div>

                      <ul className="space-y-2">
                        {FEATURES_ALL.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4">
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleGetStarted(plan.planId)}
                        disabled={checkoutLoading === plan.planId}
                        data-testid={`button-subscribe-${plan.id}`}
                      >
                        {checkoutLoading === plan.planId ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
                        ) : (
                          <>{isAuthenticated ? "Subscribe Now" : "Sign In to Subscribe"}<ArrowRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground -mt-8 mb-16">
              All plans include every platform feature — no feature gating, no tiered access.
            </p>
          </>
        )}

        {/* ── Usage & Performance Plans ── */}
        {pricingTab === "variable" && (
          <>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">

              {/* Usage-Based Card */}
              <Card className="flex flex-col" data-testid="card-plan-usage_based">
                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${usagePlan.bgColor} flex items-center justify-center ${usagePlan.color}`}>
                    <Activity className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{usagePlan.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{usagePlan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${usagePlan.basePrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">+ metered overage charges</p>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Metered Items</p>
                  <ul className="space-y-2 mb-6">
                    {usagePlan.meterItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Includes All Features</p>
                  <ul className="space-y-2">
                    {FEATURES_ALL.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    <li className="text-sm text-muted-foreground pl-6">+ {FEATURES_ALL.length - 5} more features</li>
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleGetStarted(usagePlan.planId)}
                    disabled={checkoutLoading === usagePlan.planId}
                    data-testid="button-subscribe-usage_based"
                  >
                    {checkoutLoading === usagePlan.planId ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
                    ) : (
                      <>{isAuthenticated ? "Get Started" : "Sign In to Subscribe"}<ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Performance Card */}
              <Card className="relative flex flex-col border-primary" data-testid="card-plan-performance">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Handshake className="h-3 w-3 mr-1" />
                    Pay on Results
                  </Badge>
                </div>

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${performancePlan.bgColor} flex items-center justify-center ${performancePlan.color}`}>
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{performancePlan.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{performancePlan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${performancePlan.basePrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      + <span className="font-semibold text-foreground">{performancePlan.feeRate}%</span> of verified procurement savings
                    </p>
                    <Badge variant="secondary" className="mt-2">Only charged on measured outcomes</Badge>
                  </div>

                  <ul className="space-y-2">
                    {performancePlan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{h}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => handleGetStarted(performancePlan.planId)}
                    data-testid="button-subscribe-performance"
                  >
                    Start Free Pilot
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Savings Calculator */}
            <Card className="mb-16 max-w-4xl mx-auto border-2 border-primary/20" data-testid="card-savings-calculator">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Performance Plan Calculator
                </CardTitle>
                <CardDescription>
                  Estimate your annual cost on the performance plan based on projected verified savings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium">Estimated Annual Verified Savings</label>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(estimatedSavings)}</span>
                    </div>
                    <input
                      type="range"
                      min="50000"
                      max="5000000"
                      step="50000"
                      value={estimatedSavings}
                      onChange={(e) => setEstimatedSavings(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      data-testid="slider-savings-estimate"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>$50K</span><span>$5M+</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Base Fee (annual)</p>
                      <p className="text-xl font-bold">{formatCurrency(perfBase)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">15% of Savings</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(perfFee)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Your Net Savings</p>
                      <p className={`text-xl font-bold ${perfNet > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {formatCurrency(perfNet)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    The 15% fee is only charged on <strong>verified, measured</strong> savings with a full evidence chain. Estimates and projections are never billed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Competitor Comparison */}
        <Card className="mb-16" data-testid="card-competitor-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              How We Compare
            </CardTitle>
            <CardDescription>
              Prescient Labs stacks up against traditional procurement platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Platform</th>
                    <th className="text-left py-3 px-4 font-medium">Savings Share</th>
                    <th className="text-left py-3 px-4 font-medium">Platform Fee</th>
                    <th className="text-left py-3 px-4 font-medium">Approach</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorComparison.map((row) => (
                    <tr key={row.name} className={`border-b ${row.highlight ? "bg-primary/5" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {row.highlight && <Award className="h-4 w-4 text-primary shrink-0" />}
                          <span className={row.highlight ? "font-bold text-primary" : ""}>{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{row.savingsShare}</td>
                      <td className="py-3 px-4 text-sm">{row.platformFee}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.approach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* All Features Included */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Everything Included — On Every Plan
            </CardTitle>
            <CardDescription>No feature gating. No tiered access. All six plans unlock the full platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {FEATURES_ALL.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            All plans include a 30-day free trial. No credit card required for the performance plan pilot.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" onClick={() => setPricingTab("subscription")} data-testid="button-view-subscriptions">
              View Subscriptions
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { setPricingTab("variable"); }} data-testid="button-view-performance">
              Explore Performance Plan
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
