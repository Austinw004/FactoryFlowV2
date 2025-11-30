import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Building2, Rocket, Loader2, Crown, ArrowRight, Shield, Clock, Users, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  metadata: any;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: {
    tier: string;
    order: string;
    features: string;
    popular?: string;
    maxSkus?: string;
    maxSuppliers?: string;
    maxUsers?: string;
  };
  prices: Price[];
}

const tierIcons: Record<string, typeof Zap> = {
  starter: Zap,
  professional: Rocket,
  enterprise: Building2,
};

const tierColors: Record<string, string> = {
  starter: "text-blue-500",
  professional: "text-purple-500",
  enterprise: "text-amber-500",
};

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const { data: productsData, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const { data: subscriptionData } = useQuery<{
    subscription: any;
    status: string;
    tier: string | null;
    trialEndsAt: string | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, withTrial }: { priceId: string; withTrial: boolean }) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId, withTrial });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const products = productsData?.products || [];

  // Sort by order metadata
  const sortedProducts = [...products].sort((a, b) => {
    const orderA = parseInt(a.metadata?.order || "999");
    const orderB = parseInt(b.metadata?.order || "999");
    return orderA - orderB;
  });

  const handleSubscribe = (product: Product) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    const price = product.prices.find(
      (p) => p.recurring?.interval === (isYearly ? "year" : "month")
    );

    if (!price) {
      toast({
        title: "Error",
        description: "Price not available",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate({ priceId: price.id, withTrial: true });
  };

  const formatPrice = (amount: number | null, interval?: string) => {
    if (!amount) return "Custom";
    const price = amount / 100;
    const monthlyEquivalent = interval === "year" ? Math.round(price / 12) : price;
    return `$${monthlyEquivalent}`;
  };

  const getFeatures = (product: Product): string[] => {
    try {
      if (product.metadata?.features) {
        return JSON.parse(product.metadata.features);
      }
    } catch {
      // Fallback features
    }
    return [
      "Core platform access",
      "Economic regime monitoring",
      "Basic demand forecasting",
      "Email support",
    ];
  };

  const currentTier = subscriptionData?.tier;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Choose the Right Plan for Your Manufacturing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start with a 14-day free trial. No credit card required to start exploring.
            Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yearly
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Save 20%
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {sortedProducts.map((product) => {
            const Icon = tierIcons[product.metadata?.tier] || Zap;
            const colorClass = tierColors[product.metadata?.tier] || "text-primary";
            const isPopular = product.metadata?.popular === "true";
            const price = product.prices.find(
              (p) => p.recurring?.interval === (isYearly ? "year" : "month")
            );
            const features = getFeatures(product);
            const isCurrentPlan = currentTier === product.metadata?.tier;

            return (
              <Card
                key={product.id}
                className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg scale-105" : ""}`}
                data-testid={`card-plan-${product.metadata?.tier}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{product.name}</CardTitle>
                  <CardDescription className="min-h-[48px]">
                    {product.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        {formatPrice(price?.unit_amount || null, price?.recurring?.interval)}
                      </span>
                      {price?.unit_amount && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                    {isYearly && price?.unit_amount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${(price.unit_amount / 100).toLocaleString()}/year)
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-sm font-semibold">{product.metadata?.maxSkus || "∞"}</div>
                      <div className="text-xs text-muted-foreground">SKUs</div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-sm font-semibold">{product.metadata?.maxSuppliers || "∞"}</div>
                      <div className="text-xs text-muted-foreground">Suppliers</div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-sm font-semibold">{product.metadata?.maxUsers || "∞"}</div>
                      <div className="text-xs text-muted-foreground">Users</div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSubscribe(product)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-subscribe-${product.metadata?.tier}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Start Free Trial
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Enterprise Security</h3>
            <p className="text-sm text-muted-foreground">
              SOC 2 Type II compliant with end-to-end encryption
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">14-Day Free Trial</h3>
            <p className="text-sm text-muted-foreground">
              Full access to all features, no credit card required
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Dedicated Support</h3>
            <p className="text-sm text-muted-foreground">
              Enterprise plans include dedicated account manager
            </p>
          </div>
        </div>

        {/* Enterprise CTA */}
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Need a Custom Solution?</h3>
                <p className="text-slate-300">
                  Contact our sales team for custom pricing, on-premise deployment, and dedicated support.
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="shrink-0"
                onClick={() => window.location.href = "mailto:sales@manufacturingai.com"}
                data-testid="button-contact-sales"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
