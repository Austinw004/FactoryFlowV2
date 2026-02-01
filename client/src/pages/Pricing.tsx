import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, Zap, Building2, Rocket, Crown, ArrowRight, Shield,
  TrendingDown, DollarSign, Calculator, Target, Award, CheckCircle2,
  BarChart3, Scale, Handshake, Percent, CreditCard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const subscriptionTiers = [
  {
    id: "professional",
    name: "Professional",
    description: "Complete platform access for growing manufacturers",
    price: 1999,
    period: "/month",
    annualPrice: 1649,
    icon: Rocket,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    popular: true,
    features: [
      "Up to 250 SKUs",
      "Up to 50 suppliers"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale with dedicated support",
    price: null,
    period: "",
    annualPrice: null,
    contactSales: true,
    icon: Building2,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    features: [
      "Unlimited SKUs & suppliers"
    ]
  }
];

const savingsBasedTiers = [
  {
    id: "strategic",
    name: "Strategic Alliance",
    description: "Enterprise-grade performance-based pricing tied to verified savings",
    percentageRate: 2,
    minimumSavings: 1000000,
    platformFee: 2000,
    icon: Handshake,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    popular: true,
    features: [
      "Unlimited SKUs & suppliers"
    ],
    competitorRate: "Varies by provider",
    yourSavings: "Competitive pricing"
  }
];

const competitorComparison = [
  { name: "Prescient Labs", savingsShare: "2%", platformFee: "$2K/mo", approach: "Low savings share, transparent pricing", highlight: true },
  { name: "Coupa", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Savings share + platform fee" },
  { name: "SAP Ariba", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Per-supplier + transaction fees" },
  { name: "Jaggaer", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Module-based pricing" },
  { name: "Fairmarkit", savingsShare: "Varies", platformFee: "Contact for pricing", approach: "Savings share model" }
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [estimatedSavings, setEstimatedSavings] = useState(500000);
  const [pricingModel, setPricingModel] = useState<"subscription" | "performance">("performance");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const calculateYourCost = (tier: typeof savingsBasedTiers[0], savings: number) => {
    const savingsShare = savings * (tier.percentageRate / 100);
    const platformFee = tier.platformFee * 12;
    return savingsShare + platformFee;
  };

  const getRecommendedTier = (savings: number) => {
    return "strategic"; // Only one performance-based tier
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const handleGetStarted = (tierId: string) => {
    window.location.href = "/api/login";
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the pricing model that works best for your business. 
            Fixed subscription rates OR performance-based pricing tied to your verified savings.
          </p>

          {/* Pricing Model Toggle */}
          <Tabs value={pricingModel} onValueChange={(v) => setPricingModel(v as "subscription" | "performance")} className="w-full max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscription" className="flex items-center gap-2" data-testid="tab-subscription">
                <CreditCard className="h-4 w-4" />
                Fixed Subscription
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2" data-testid="tab-performance">
                <Percent className="h-4 w-4" />
                Performance-Based
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Subscription Pricing */}
        {pricingModel === "subscription" && (
          <>
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={billingPeriod === "monthly" ? "font-medium" : "text-muted-foreground"}>Monthly</span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
                className={`relative w-14 h-7 rounded-full transition-colors ${billingPeriod === "annual" ? "bg-primary" : "bg-muted"}`}
                data-testid="toggle-billing-period"
              >
                <span 
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${billingPeriod === "annual" ? "translate-x-8" : "translate-x-1"}`}
                />
              </button>
              <span className={billingPeriod === "annual" ? "font-medium" : "text-muted-foreground"}>
                Annual
                <Badge variant="secondary" className="ml-2">Save 17%</Badge>
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              {subscriptionTiers.map((tier) => {
                const Icon = tier.icon;
                const isPopular = tier.popular;
                const displayPrice = billingPeriod === "annual" ? tier.annualPrice : tier.price;

                return (
                  <Card
                    key={tier.id}
                    className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg scale-105" : ""}`}
                    data-testid={`card-plan-${tier.id}`}
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
                      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${tier.bgColor} flex items-center justify-center ${tier.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription className="min-h-[48px]">
                        {tier.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        {tier.contactSales ? (
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl font-bold">Contact Sales</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-4xl font-bold">${displayPrice?.toLocaleString()}</span>
                              <span className="text-muted-foreground">/month</span>
                            </div>
                            {billingPeriod === "annual" && tier.price && tier.annualPrice && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Save ${((tier.price - tier.annualPrice) * 12).toLocaleString()}/year
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4">
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleGetStarted(tier.id)}
                        data-testid={`button-subscribe-${tier.id}`}
                      >
                        {tier.contactSales ? "Contact Sales" : "Start 30-Day Free Trial"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Performance-Based Pricing */}
        {pricingModel === "performance" && (
          <>
            {/* Value Proposition Cards */}
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-700 dark:text-green-400">30-Day Free Pilot</div>
                <p className="text-sm text-muted-foreground">Start free, pay only when you see real savings</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Percent className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="font-semibold text-blue-700 dark:text-blue-400">2% Savings Share</div>
                <p className="text-sm text-muted-foreground">Transparent, competitive pricing</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <Scale className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="font-semibold text-purple-700 dark:text-purple-400">Verified Savings</div>
                <p className="text-sm text-muted-foreground">Transparent methodology, no hidden fees</p>
              </div>
            </div>

            {/* Savings Calculator */}
            <Card className="mb-12 border-2 border-primary/20" data-testid="card-savings-calculator">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Savings Calculator
                </CardTitle>
                <CardDescription>
                  Estimate your costs based on projected annual procurement savings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium">Estimated Annual Savings</label>
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
                      <span>$50K</span>
                      <span>$5M+</span>
                    </div>
                  </div>

                  {savingsBasedTiers.map((tier) => {
                    const yourCost = calculateYourCost(tier, estimatedSavings);
                    const netSavings = estimatedSavings - yourCost;

                    return (
                      <div 
                        key={tier.id}
                        className="p-6 rounded-lg border border-primary bg-primary/5 max-w-md mx-auto"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold">{tier.name}</span>
                          <Badge>Performance-Based</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {tier.percentageRate}% of savings + {formatCurrency(tier.platformFee)}/mo platform fee
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Your Annual Cost</div>
                            <div className="text-xl font-bold text-primary">{formatCurrency(yourCost)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Net Savings</div>
                            <div className="text-xl font-bold text-green-600">{formatCurrency(netSavings)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance-Based Pricing Tier */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-center mb-2">Strategic Alliance</h2>
              <p className="text-center text-muted-foreground mb-8">Enterprise partnership with 30-day free pilot. No credit card required.</p>
            </div>

            <div className="flex justify-center mb-16">
              {savingsBasedTiers.map((tier) => {
                const Icon = tier.icon;

                return (
                  <Card
                    key={tier.id}
                    className="relative flex flex-col border-primary shadow-lg max-w-md w-full"
                    data-testid={`card-plan-${tier.id}`}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Handshake className="h-3 w-3 mr-1" />
                        Enterprise Partnership
                      </Badge>
                    </div>

                    <CardHeader className="text-center pb-4">
                      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${tier.bgColor} flex items-center justify-center ${tier.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription className="min-h-[48px]">
                        {tier.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">{tier.percentageRate}%</span>
                          <span className="text-muted-foreground">of verified savings</span>
                        </div>
                        {tier.platformFee > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            + {formatCurrency(tier.platformFee)}/month platform fee
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Min. {formatCurrency(tier.minimumSavings)} annual savings to qualify
                        </p>
                      </div>

                      {/* Competitor Comparison */}
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 dark:text-green-400 font-medium">
                            {tier.yourSavings}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Competitors charge {tier.competitorRate} for similar services
                        </p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4">
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleGetStarted(tier.id)}
                        data-testid={`button-subscribe-${tier.id}`}
                      >
                        Start Free Pilot
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Competitor Comparison Table */}
        <Card className="mb-16" data-testid="card-competitor-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              How We Compare
            </CardTitle>
            <CardDescription>
              See how Prescient Labs stacks up against traditional procurement platforms
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
                  {competitorComparison.map((competitor, index) => (
                    <tr 
                      key={competitor.name} 
                      className={`border-b ${competitor.highlight ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {competitor.highlight && <Award className="h-4 w-4 text-primary" />}
                          <span className={competitor.highlight ? "font-bold text-primary" : ""}>
                            {competitor.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={competitor.highlight ? "default" : "secondary"}>
                          {competitor.savingsShare}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{competitor.platformFee}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{competitor.approach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* How Savings Verification Works */}
        <Card className="mb-16" data-testid="card-savings-verification">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              How Savings Verification Works
            </CardTitle>
            <CardDescription>
              Transparent, auditable methodology for calculating your procurement savings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold mb-2">Baseline Capture</h4>
                <p className="text-sm text-muted-foreground">
                  We establish your historical procurement costs and supplier pricing
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600">2</span>
                </div>
                <h4 className="font-semibold mb-2">Optimization Actions</h4>
                <p className="text-sm text-muted-foreground">
                  Our platform identifies and helps execute savings opportunities
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-green-600">3</span>
                </div>
                <h4 className="font-semibold mb-2">Savings Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  Compare actual costs against baseline to calculate verified savings
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-amber-600">4</span>
                </div>
                <h4 className="font-semibold mb-2">Quarterly Billing</h4>
                <p className="text-sm text-muted-foreground">
                  Pay your savings share quarterly with full audit trail
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <Handshake className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">30-Day Free Pilot</h3>
            <p className="text-sm text-muted-foreground">
              Full platform access, see real savings before you pay
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Aligned Incentives</h3>
            <p className="text-sm text-muted-foreground">
              We only win when you save money - our success is tied to yours
            </p>
          </div>
        </div>

        {/* Enterprise CTA */}
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to Start Saving?</h3>
                <p className="text-slate-300">
                  Start your 30-day free pilot today.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => handleGetStarted("transform")}
                  data-testid="button-start-pilot"
                >
                  Start Free Pilot
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="shrink-0 border-white/30 text-white hover:bg-white/10"
                  onClick={() => window.location.href = "mailto:sales@prescientlabs.ai"}
                  data-testid="button-contact-sales"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
