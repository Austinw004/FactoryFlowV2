import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Check, ArrowRight } from "lucide-react";

interface SubscriptionData {
  subscription: any;
  status: string;
  tier: string | null;
  trialEndsAt: string | null;
}

const features = [
  "Demand forecasting & demand sensing",
  "Material allocation & budget optimization",
  "Real-time commodity pricing",
  "Supply chain visibility & risk scoring",
  "Automated RFQ generation",
  "ERP integration templates",
  "AI copilot & decision support",
  "ROI dashboard & savings tracking",
];

export function Pricing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const { data: subscriptionData } = useQuery<SubscriptionData>({
    queryKey: ["/api/stripe/subscription"],
  });

  const tier = subscriptionData?.tier;
  const isTrialing = subscriptionData?.status === "trialing";

  const handleStartTrial = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/signup");
    }
  };

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 299,
      annualPrice: 2990,
      description: "Perfect for getting started with demand forecasting",
      features: features.slice(0, 5),
      cta: isTrialing ? "Current Plan" : "Start 90-day free trial",
      highlighted: false,
      id: "starter",
    },
    {
      name: "Growth",
      monthlyPrice: 799,
      annualPrice: 7990,
      description: "For teams managing complex supply chains",
      features: features,
      cta: isTrialing ? "Current Plan" : "Start 90-day free trial",
      highlighted: true,
      id: "growth",
    },
    {
      name: "Usage-Based",
      monthlyPrice: 199,
      annualPrice: null,
      description: "Pay for what you use, no long-term commitment",
      features: ["All Starter features", "+ metered usage charges"],
      cta: "Start 90-day free trial",
      highlighted: false,
      id: "usage-based",
    },
    {
      name: "Performance",
      monthlyPrice: null,
      annualPrice: null,
      description: "15% of verified savings",
      features: ["Everything in Growth", "Dedicated success team", "Custom integrations"],
      cta: "Contact Sales",
      highlighted: false,
      id: "performance",
    },
  ];

  return (
    <div className="min-h-screen bg-ink text-bone">
      {/* Grain texture overlay */}
      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-10 py-28">
          {/* Header */}
          <div className="mb-14">
            <div className="eyebrow mb-4">Pricing</div>
            <h1 className="hero text-5xl md:text-6xl leading-tight mb-6">
              90 days free. Then pick a plan.
            </h1>
            <p className="text-soft text-base max-w-2xl leading-relaxed">
              All plans include full access to the platform. No credit card required to start your free trial. Cancel anytime.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center gap-6 mb-14">
            <div className="billing-toggle inline-flex border border-line rounded-sm">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-bone text-ink"
                    : "text-soft hover:text-bone"
                }`}
              >
                Monthly
              </button>
              <div className="w-px bg-line"></div>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-bone text-ink"
                    : "text-soft hover:text-bone"
                }`}
              >
                Annual · save 17%
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-4 gap-px bg-line mb-14">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-10 flex flex-col ${
                  plan.highlighted ? "bg-panel border border-signal/30" : "bg-panel"
                } ${plan.id === "performance" ? "border-l" : ""}`}
                style={
                  plan.id === "performance"
                    ? { borderLeftColor: "rgba(217, 181, 107, 0.3)" }
                    : {}
                }
              >
                <div className="mb-8">
                  <div className="text-sm text-soft mb-4">{plan.name}</div>
                  {plan.monthlyPrice ? (
                    <div className="text-4xl display mb-2">
                      ${billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                      <span className="text-base text-muted">
                        {billingPeriod === "monthly" ? "/mo" : "/yr"}
                      </span>
                    </div>
                  ) : (
                    <div className="text-4xl display mb-2">Custom</div>
                  )}
                  <p className="text-xs text-muted">{plan.description}</p>
                </div>

                <button
                  onClick={handleStartTrial}
                  className={`${
                    tier === plan.id.split("_")[1] ? "btn-ghost" : "btn-primary"
                  } text-xs px-6 py-2 mb-10 w-full`}
                >
                  {tier === plan.id.split("_")[1] ? "Current Plan" : plan.cta}
                  {!plan.id.includes("performance") && <ArrowRight className="w-3 h-3 inline ml-2" />}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-good shrink-0 mt-0.5" />
                      <span className="text-xs text-soft">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ or Additional Info */}
          <div className="divider"></div>

          <div className="py-14">
            <div className="eyebrow mb-8">What's included</div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="display text-2xl mb-4">Platform Features</h3>
                <ul className="space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                      <span className="text-sm text-soft">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="display text-2xl mb-4">Enterprise Add-ons</h3>
                <ul className="space-y-3 text-sm text-soft">
                  <li>• Custom integrations & API access</li>
                  <li>• Dedicated success team</li>
                  <li>• Advanced security (air-gapped, VPC)</li>
                  <li>• Single sign-on (SSO/SAML)</li>
                  <li>• Custom workflows & automations</li>
                  <li>• Audit trail & compliance reporting</li>
                  <li>• Multi-team access & role-based controls</li>
                  <li>• White-label deployment option</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="divider"></div>

          {/* Final CTA */}
          <div className="py-14">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-12 md:col-span-8">
                <h2 className="hero text-4xl md:text-5xl leading-tight mb-4">
                  Ready to transform your operations?
                </h2>
                <p className="text-soft text-base">
                  Start your free trial today. No credit card required. Full platform access for 90 days.
                </p>
              </div>
              <div className="col-span-12 md:col-span-4 flex md:justify-end items-end">
                <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
                  Start 90-day free trial
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
