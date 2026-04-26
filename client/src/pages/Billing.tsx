import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CreditCard, ArrowRight, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlans } from "@/hooks/usePlans";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionData {
  subscription: any;
  status: string;
  tier: string | null;
  trialEndsAt: string | null;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created: number;
  pdfUrl?: string;
}

export function Billing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/stripe/subscription"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/stripe/invoices"],
  });

  const status = subscriptionData?.status;
  const tier = subscriptionData?.tier;
  const isTrialing = status === "trialing";
  const trialEndsAt = subscriptionData?.trialEndsAt;

  // Pricing fetched from server's BILLING_PLANS — single source of truth.
  // See client/src/hooks/usePlans.ts.
  const livePlans = usePlans();
  const tierPricing = {
    starter:       livePlans.starter,
    growth:        livePlans.growth,
    "usage-based": { monthly: livePlans.usageBased.monthlyBase, annual: null },
    performance:   { monthly: null, annual: null },
  };

  // Map a plan name + the billing period toggle to the corresponding Stripe
  // priceId from BILLING_PLANS (server-authoritative, surfaced via /api/billing/plans).
  // Returns null for plans that don't sell self-serve via Checkout (Performance →
  // Talk to Sales).
  const resolvePriceId = (plan: string): string | null => {
    const useAnnual = billingPeriod === "annual";
    switch (plan) {
      case "starter":
        return (useAnnual ? livePlans.starter.annualStripePriceId : livePlans.starter.monthlyStripePriceId) ?? null;
      case "growth":
        return (useAnnual ? livePlans.growth.annualStripePriceId : livePlans.growth.monthlyStripePriceId) ?? null;
      case "usage-based":
        return livePlans.usageBased.monthlyStripePriceId ?? null;
      case "performance":
        return null; // Sales-led
      default:
        return null;
    }
  };

  const handleUpgrade = async (plan: string) => {
    if (plan === "performance") {
      setLocation("/contact");
      return;
    }
    const priceId = resolvePriceId(plan);
    if (!priceId) {
      toast({
        variant: "destructive",
        title: "Plan not configured",
        description: "This plan isn't wired to a Stripe price yet. Email info@prescient-labs.com.",
      });
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/stripe/checkout", {
        priceId,
        withTrial: !isTrialing && !tier, // First-time users get the 90-day trial
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: "destructive", description: "Couldn't start checkout. Try again." });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: err?.message ?? "Couldn't reach Stripe. Try again in a minute.",
      });
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    // Stripe hosts a customer-facing invoice URL with download options for
    // every invoice. Open that in a new tab — better UX (responsive, branded,
    // works for refunded/voided invoices too) than serving raw PDF bytes
    // ourselves, and avoids needing a separate /api/stripe/invoices/:id/pdf
    // route on the server.
    try {
      const res = await apiRequest("GET", `/api/stripe/invoices/${invoiceId}`);
      const data = await res.json();
      const url = data?.hostedInvoiceUrl ?? data?.invoicePdf;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast({ variant: "destructive", description: "Invoice URL not available." });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err?.message ?? "Failed to download invoice",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ink text-bone p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="eyebrow mb-4">Account</div>
          <h1 className="hero text-5xl leading-tight mb-6">Billing & Subscription</h1>
          <p className="text-soft text-base leading-relaxed">
            Manage your subscription, billing information, and invoices.
          </p>
        </div>

        {/* Current Subscription */}
        {subscriptionLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-signal" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Trial Banner */}
            {isTrialing && trialEndsAt && (
              <div className="trial-banner p-6 border border-line">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-signal rounded-full"></div>
                      <span className="text-sm font-medium text-signal">Free Trial</span>
                    </div>
                    <h3 className="text-2xl display mb-2">
                      {Math.ceil(
                        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )}{" "}
                      days remaining
                    </h3>
                    <p className="text-soft text-sm">
                      Your free trial gives you access to all platform features. Add a payment method anytime to continue after the trial ends.
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation("/pricing")}
                    className="btn-primary text-sm px-4 py-2 ml-6 shrink-0"
                  >
                    Choose a plan
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Current Plan */}
            {tier && (
              <div className="border-t border-line pt-8">
                <div className="eyebrow mb-6">Current Plan</div>
                <div className="grid grid-cols-3 gap-px bg-line">
                  <div className="bg-panel p-6 border border-line">
                    <div className="text-sm text-soft mb-2">Plan</div>
                    <div className="text-2xl display mb-1 capitalize">{tier}</div>
                    <div className="text-xs text-muted">
                      {status === "active" ? (
                        <span className="text-good">Active subscription</span>
                      ) : (
                        <span>Status: {status}</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-panel p-6 border border-line">
                    <div className="text-sm text-soft mb-2">Billing Period</div>
                    <div className="text-2xl display mb-1">Monthly</div>
                    <div className="text-xs text-muted">Renews on specific date</div>
                  </div>
                  <div className="bg-panel p-6 border border-line">
                    <div className="text-sm text-soft mb-2">Next Billing</div>
                    <div className="text-2xl display mb-1">Scheduled</div>
                    <div className="text-xs text-muted">Contact support to modify</div>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            <div className="border-t border-line pt-8">
              <div className="flex items-end justify-between mb-8">
                <div className="eyebrow">Upgrade Your Plan</div>
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

              <div className="grid md:grid-cols-4 gap-px bg-line">
                <div className="bg-panel p-8 flex flex-col">
                  <div className="text-sm text-soft mb-6">Starter</div>
                  <div className="text-3xl display mb-1">
                    ${(billingPeriod === "monthly" ? livePlans.starter.monthly : livePlans.starter.annual)?.toLocaleString("en-US")}
                    <span className="text-base text-muted">
                      {billingPeriod === "monthly" ? "/mo" : "/yr"}
                    </span>
                  </div>
                  <div className="text-xs text-muted mb-8">
                    {billingPeriod === "annual" && livePlans.starter.monthly && livePlans.starter.annual &&
                      `Save $${(livePlans.starter.monthly * 12 - livePlans.starter.annual).toLocaleString("en-US")} per year`}
                  </div>
                  <button
                    onClick={() => handleUpgrade("starter")}
                    disabled={tier === "starter"}
                    className="btn-ghost text-xs px-4 py-2 mb-auto"
                  >
                    {tier === "starter" ? "Current Plan" : "Start Trial"}
                  </button>
                </div>

                <div className="bg-panel p-8 flex flex-col">
                  <div className="text-sm text-soft mb-6">Growth</div>
                  <div className="text-3xl display mb-1">
                    ${(billingPeriod === "monthly" ? livePlans.growth.monthly : livePlans.growth.annual)?.toLocaleString("en-US")}
                    <span className="text-base text-muted">
                      {billingPeriod === "monthly" ? "/mo" : "/yr"}
                    </span>
                  </div>
                  <div className="text-xs text-muted mb-8">
                    {billingPeriod === "annual" && livePlans.growth.monthly && livePlans.growth.annual &&
                      `Save $${(livePlans.growth.monthly * 12 - livePlans.growth.annual).toLocaleString("en-US")} per year`}
                  </div>
                  <button
                    onClick={() => handleUpgrade("growth")}
                    disabled={tier === "growth"}
                    className="btn-ghost text-xs px-4 py-2 mb-auto"
                  >
                    {tier === "growth" ? "Current Plan" : "Start Trial"}
                  </button>
                </div>

                <div className="bg-panel p-8 flex flex-col">
                  <div className="text-sm text-soft mb-6">Usage-Based</div>
                  <div className="text-3xl display mb-1">
                    ${livePlans.usageBased.monthlyBase}<span className="text-base text-muted">/mo</span>
                  </div>
                  <div className="text-xs text-muted mb-8">+ metered usage charges</div>
                  <button
                    onClick={() => handleUpgrade("usage-based")}
                    disabled={tier === "usage-based"}
                    className="btn-ghost text-xs px-4 py-2 mb-auto"
                  >
                    {tier === "usage-based" ? "Current Plan" : "Start Trial"}
                  </button>
                </div>

                <div
                  className="bg-panel p-8 flex flex-col border-l"
                  style={{ borderLeftColor: "rgba(204, 120, 92, 0.3)" }}
                >
                  <div className="text-sm text-signal mb-6">Performance</div>
                  <div className="text-3xl display mb-1">
                    {Math.round(livePlans.performance.feePercentageDefault * 100)}<span className="text-base text-muted">%</span>
                  </div>
                  <div className="text-xs text-muted mb-8">of verified savings</div>
                  <button
                    onClick={() => handleUpgrade("performance")}
                    disabled={tier === "performance"}
                    className="btn-ghost text-xs px-4 py-2 mb-auto"
                  >
                    {tier === "performance" ? "Current Plan" : "Contact Sales"}
                  </button>
                </div>
              </div>

              <div className="mt-6 mono text-xs text-muted">
                All plans include the 90-day free trial. No credit card required to start.
              </div>
            </div>

            {/* Invoices */}
            {invoices && invoices.length > 0 && (
              <div className="border-t border-line pt-8">
                <div className="eyebrow mb-6">Invoices</div>
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 bg-panel border border-line hover:bg-panel/70 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <CreditCard className="w-5 h-5 text-muted shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Invoice {invoice.number || invoice.id}
                          </div>
                          <div className="text-xs text-muted">
                            {format(new Date(invoice.created * 1000), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(invoice.total / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: invoice.currency.toUpperCase(),
                            })}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              invoice.status === "paid"
                                ? "text-good"
                                : invoice.status === "open"
                                ? "text-signal"
                                : "text-muted"
                            }`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </div>
                        </div>
                        <button
                          onClick={() => downloadInvoice(invoice.id)}
                          className="p-2 text-muted hover:text-bone hover:bg-line rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="border-t border-line pt-8">
              <div className="eyebrow mb-6">Payment Method</div>
              <div className="bg-panel p-6 border border-line">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-5 h-5 text-signal" />
                    <div>
                      <div className="text-sm font-medium">Add a payment method</div>
                      <div className="text-xs text-muted">
                        Required to upgrade or renew your subscription
                      </div>
                    </div>
                  </div>
                  <button className="btn-ghost text-xs px-4 py-2">Add Card</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Billing;
