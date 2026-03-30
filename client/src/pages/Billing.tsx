import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  Zap,
  Rocket,
  Building2,
  ArrowRight,
  RefreshCw,
  Receipt,
  Download,
  FileText,
  Shield,
  Pencil,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

declare const Stripe: any;
import { format } from "date-fns";

const tierIcons: Record<string, typeof Zap> = {
  starter: Zap,
  professional: Rocket,
  enterprise: Building2,
};

const tierLabels: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  past_due: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  canceled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  incomplete: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

const invoiceStatusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  uncollectible: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  void: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

const cardBrandLabels: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  total: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

interface BillingProfile {
  id: string;
  billingEmail: string;
  companyName: string;
  address?: Record<string, string>;
  taxId?: string | null;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  preferredPaymentMethod?: string;
  hasStripeCustomer: boolean;
  hasPaymentMethod: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function Billing() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const { toast } = useToast();
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const cardElementInstanceRef = useRef<any>(null);
  const [profileForm, setProfileForm] = useState({
    billingEmail: "",
    companyName: "",
    taxId: "",
    preferredPaymentMethod: "card" as "card" | "ach" | "invoice",
    street: "", city: "", state: "", zip: "", country: "",
  });

  const { data: subscriptionData, isLoading, refetch } = useQuery<{
    subscription: any;
    status: string;
    tier: string | null;
    trialEndsAt: string | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
  });

  const { data: paymentMethodsData } = useQuery<{ paymentMethods: PaymentMethod[] }>({
    queryKey: ["/api/billing/payment-methods"],
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["/api/stripe/invoices"],
  });

  const { data: profileData, isLoading: profileLoading } = useQuery<{ profile: BillingProfile | null }>({
    queryKey: ["/api/billing/profile"],
  });
  const billingProfile = profileData?.profile ?? null;

  const saveProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return await apiRequest("POST", "/api/billing/setup", {
        billingEmail: data.billingEmail,
        companyName: data.companyName,
        taxId: data.taxId || undefined,
        preferredPaymentMethod: data.preferredPaymentMethod,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/profile"] });
      setEditingProfile(false);
      toast({ title: "Billing profile saved", description: "Your billing information has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/portal");
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
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (pmId: string) => {
      const response = await apiRequest("POST", `/api/billing/payment-methods/${pmId}/set-default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
      toast({ title: "Default card updated", description: "Your default payment method has been changed." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const removePmMutation = useMutation({
    mutationFn: async (pmId: string) => {
      const response = await apiRequest("DELETE", `/api/billing/payment-methods/${pmId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
      toast({ title: "Card removed", description: "Payment method has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    },
  });

  // Mount Stripe Card Element when modal opens
  useEffect(() => {
    if (!showAddCard) {
      cardElementInstanceRef.current = null;
      stripeRef.current = null;
      setAddCardError(null);
      return;
    }
    if (typeof Stripe === "undefined") {
      setAddCardError("Stripe.js is not loaded. Please refresh the page.");
      return;
    }
    const publishableKey = (window as any).__STRIPE_PK__ || "";
    const initStripe = async () => {
      try {
        const pkRes = await fetch("/api/billing/publishable-key", {
          headers: { Authorization: `Bearer ${localStorage.getItem("prescient_access_token") || ""}` },
        });
        const { publishableKey: pk } = await pkRes.json();
        const stripe = Stripe(pk);
        stripeRef.current = stripe;
        const elements = stripe.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "14px",
              color: "#1a1a1a",
              "::placeholder": { color: "#9ca3af" },
            },
          },
        });
        setTimeout(() => {
          if (cardElementRef.current) {
            card.mount(cardElementRef.current);
            cardElementInstanceRef.current = card;
          }
        }, 50);
      } catch (e: any) {
        setAddCardError("Could not initialize card form. Please try again.");
      }
    };
    initStripe();
  }, [showAddCard]);

  const handleAddCard = async () => {
    if (!stripeRef.current || !cardElementInstanceRef.current) {
      setAddCardError("Card form is not ready. Please wait.");
      return;
    }
    setAddCardLoading(true);
    setAddCardError(null);
    try {
      const siRes = await apiRequest("POST", "/api/billing/setup-intent");
      const { clientSecret } = await siRes.json();

      const { setupIntent, error } = await stripeRef.current.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElementInstanceRef.current },
      });

      if (error) {
        setAddCardError(error.message || "Card setup failed.");
        setAddCardLoading(false);
        return;
      }

      const attachRes = await apiRequest("POST", "/api/billing/attach-payment-method", {
        paymentMethodId: setupIntent.payment_method,
        setAsDefault: paymentMethods.length === 0,
      });

      if (!attachRes.ok) {
        const err = await attachRes.json();
        setAddCardError(err.message || "Failed to save card.");
        setAddCardLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
      setShowAddCard(false);
      toast({ title: "Card added", description: "Your new payment method has been saved." });
    } catch (e: any) {
      setAddCardError(e.message || "An unexpected error occurred.");
    } finally {
      setAddCardLoading(false);
    }
  };

  useEffect(() => {
    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Welcome to Prescient Labs. Your subscription is now active.",
      });
      refetch();
      window.history.replaceState({}, "", "/billing");
    }
  }, [success, toast, refetch]);

  // Populate form when profile data arrives
  useEffect(() => {
    if (billingProfile) {
      setProfileForm({
        billingEmail: billingProfile.billingEmail ?? "",
        companyName: billingProfile.companyName ?? "",
        taxId: "",
        preferredPaymentMethod: (billingProfile.preferredPaymentMethod as "card" | "ach" | "invoice") ?? "card",
        street: (billingProfile.address as any)?.street ?? "",
        city: (billingProfile.address as any)?.city ?? "",
        state: (billingProfile.address as any)?.state ?? "",
        zip: (billingProfile.address as any)?.zip ?? "",
        country: (billingProfile.address as any)?.country ?? "",
      });
    }
  }, [billingProfile]);

  const subscription = subscriptionData?.subscription;
  const status = subscriptionData?.status || "none";
  const tier = subscriptionData?.tier;
  const trialEndsAt = subscriptionData?.trialEndsAt;
  const paymentMethods = paymentMethodsData?.paymentMethods || [];
  const invoices = invoicesData?.invoices || [];

  const TierIcon = tier ? tierIcons[tier] || Zap : Zap;

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-billing-title">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history.
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TierIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {tier ? tierLabels[tier] || "Free" : "No Active Plan"}
                </CardTitle>
                <CardDescription>
                  {subscription ? "Your current subscription plan" : "Start your free trial today"}
                </CardDescription>
              </div>
            </div>
            {status && status !== "none" && (
              <Badge className={statusColors[status] || statusColors.incomplete}>
                {status === "trialing" ? "Trial" : status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status === "trialing" && trialEndsAt && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Your trial ends on {format(new Date(trialEndsAt), "MMMM d, yyyy")}
              </span>
            </div>
          )}

          {status === "past_due" && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Your payment is past due. Please update your payment method to avoid service interruption.
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {subscription ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/pricing")}
                  data-testid="button-change-plan"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setLocation("/pricing")}
                data-testid="button-view-plans"
              >
                View Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{tier ? tierLabels[tier] : "Unknown"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className={statusColors[status] || ""}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                </Badge>
              </div>
              {subscription.current_period_start && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Current Period Started</span>
                  <span className="font-medium">
                    {format(new Date(subscription.current_period_start * 1000), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {subscription.current_period_end && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Next Billing Date</span>
                  <span className="font-medium">
                    {format(new Date(subscription.current_period_end * 1000), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-add-card">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Enter your card details below. All data is encrypted and processed securely by Stripe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div
              ref={cardElementRef}
              className="border rounded-md p-3 min-h-[44px] bg-background"
              data-testid="stripe-card-element"
            />
            {addCardError && (
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-card-error">
                {addCardError}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Your card information is never stored on our servers. All payments are processed securely via Stripe.</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddCard(false)}
                disabled={addCardLoading}
                data-testid="button-cancel-add-card"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCard}
                disabled={addCardLoading}
                data-testid="button-save-card"
              >
                {addCardLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Card"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCard(true)}
                data-testid="button-add-payment-method"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Add Card
              </Button>
              {subscription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  data-testid="button-update-payment"
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage in Portal
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-3 rounded-lg border flex-wrap gap-2"
                  data-testid={`payment-method-${pm.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded bg-muted flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {cardBrandLabels[pm.brand] || pm.brand}
                        </span>
                        <span className="text-muted-foreground text-sm" data-testid={`text-card-last4-${pm.id}`}>
                          ending in {pm.last4}
                        </span>
                        {pm.isDefault && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-default-${pm.id}`}>Default</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Expires {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(pm.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${pm.id}`}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePmMutation.mutate(pm.id)}
                      disabled={removePmMutation.isPending}
                      data-testid={`button-remove-pm-${pm.id}`}
                      className="text-red-600 dark:text-red-400"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payment methods on file.</p>
              <p className="text-xs mt-1">Click "Add Card" to add your first payment method.</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0 text-green-600" />
            <span>All payments processed securely via Stripe. Card data is never stored on our servers.</span>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>
            View and download your past invoices and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`invoice-${inv.id}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {inv.number || inv.id.slice(0, 12)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={invoiceStatusColors[inv.status] || ""}
                        >
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(inv.created * 1000), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm" data-testid={`text-invoice-amount-${inv.id}`}>
                      {formatAmount(inv.total, inv.currency)}
                    </span>
                    <div className="flex gap-1">
                      {inv.hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-view-invoice-${inv.id}`}
                        >
                          <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {inv.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-download-invoice-${inv.id}`}
                        >
                          <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No invoices yet.</p>
              <p className="text-xs mt-1">Invoices will appear here after your first payment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Profile */}
      <Card className="mb-6" data-testid="card-billing-profile">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Billing Profile
              </CardTitle>
              <CardDescription>
                Company information used for procurement payments and Purchase Orders.
              </CardDescription>
            </div>
            {!editingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProfile(true)}
                data-testid="button-edit-profile"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {billingProfile ? "Edit" : "Set Up"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          ) : editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-company">Company Name</Label>
                  <Input
                    id="profile-company"
                    value={profileForm.companyName}
                    onChange={e => setProfileForm(p => ({ ...p, companyName: e.target.value }))}
                    placeholder="Acme Manufacturing Inc."
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-email">Billing Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profileForm.billingEmail}
                    onChange={e => setProfileForm(p => ({ ...p, billingEmail: e.target.value }))}
                    placeholder="billing@company.com"
                    data-testid="input-billing-email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-taxid">Tax ID (EIN / VAT)</Label>
                  <Input
                    id="profile-taxid"
                    value={profileForm.taxId}
                    onChange={e => setProfileForm(p => ({ ...p, taxId: e.target.value }))}
                    placeholder="12-3456789"
                    data-testid="input-tax-id"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred Payment Method</Label>
                  <Select
                    value={profileForm.preferredPaymentMethod}
                    onValueChange={v => setProfileForm(p => ({ ...p, preferredPaymentMethod: v as "card" | "ach" | "invoice" }))}
                  >
                    <SelectTrigger data-testid="select-preferred-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card (Stripe)</SelectItem>
                      <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                      <SelectItem value="invoice">Invoice / Net-30 PO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-street">Street Address</Label>
                <Input
                  id="profile-street"
                  value={profileForm.street}
                  onChange={e => setProfileForm(p => ({ ...p, street: e.target.value }))}
                  placeholder="123 Main Street"
                  data-testid="input-street"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-city">City</Label>
                  <Input
                    id="profile-city"
                    value={profileForm.city}
                    onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Detroit"
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-state">State</Label>
                  <Input
                    id="profile-state"
                    value={profileForm.state}
                    onChange={e => setProfileForm(p => ({ ...p, state: e.target.value }))}
                    placeholder="MI"
                    data-testid="input-state"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-zip">ZIP</Label>
                  <Input
                    id="profile-zip"
                    value={profileForm.zip}
                    onChange={e => setProfileForm(p => ({ ...p, zip: e.target.value }))}
                    placeholder="48201"
                    data-testid="input-zip"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-country">Country</Label>
                <Input
                  id="profile-country"
                  value={profileForm.country}
                  onChange={e => setProfileForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="US"
                  data-testid="input-country"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => saveProfileMutation.mutate(profileForm)}
                  disabled={saveProfileMutation.isPending || !profileForm.billingEmail || !profileForm.companyName}
                  data-testid="button-save-profile"
                >
                  {saveProfileMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save Profile</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setEditingProfile(false)} data-testid="button-cancel-profile">
                  Cancel
                </Button>
              </div>
            </div>
          ) : billingProfile ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Company</span>
                  <p className="font-medium mt-0.5" data-testid="text-profile-company">{billingProfile.companyName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Billing Email</span>
                  <p className="font-medium mt-0.5" data-testid="text-profile-email">{billingProfile.billingEmail}</p>
                </div>
                {billingProfile.taxId && (
                  <div>
                    <span className="text-muted-foreground">Tax ID</span>
                    <p className="font-medium mt-0.5" data-testid="text-profile-taxid">{billingProfile.taxId}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Preferred Payment</span>
                  <p className="font-medium mt-0.5 capitalize" data-testid="text-profile-payment-method">
                    {billingProfile.preferredPaymentMethod === "invoice" ? "Invoice / Net-30" : billingProfile.preferredPaymentMethod}
                  </p>
                </div>
                {billingProfile.hasPaymentMethod && (
                  <div>
                    <span className="text-muted-foreground">Card on File</span>
                    <p className="font-medium mt-0.5 flex items-center gap-1.5" data-testid="text-profile-card">
                      <CreditCard className="h-3.5 w-3.5" />
                      {billingProfile.paymentMethodBrand ? (
                        <span className="capitalize">{billingProfile.paymentMethodBrand}</span>
                      ) : null}
                      {billingProfile.paymentMethodLast4 && <span>•••• {billingProfile.paymentMethodLast4}</span>}
                    </p>
                  </div>
                )}
              </div>
              {(billingProfile.address as any)?.city && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium mt-0.5" data-testid="text-profile-address">
                      {[(billingProfile.address as any)?.street, (billingProfile.address as any)?.city, (billingProfile.address as any)?.state, (billingProfile.address as any)?.zip].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Shield className="h-3 w-3" />
                {billingProfile.hasStripeCustomer ? "Stripe customer linked" : "Not yet linked to Stripe"}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No billing profile configured.</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Set up a billing profile to enable automated procurement payments. Without one, all purchases fall back to manual Purchase Orders.
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)} data-testid="button-setup-profile">
                Set Up Billing Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Your Plan Features
          </CardTitle>
          <CardDescription>
            Features included in your current subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {tier === "starter" && (
              <>
                <FeatureItem>Up to 100 SKUs</FeatureItem>
              </>
            )}
            {tier === "professional" && (
              <>
                <FeatureItem>Up to 250 SKUs</FeatureItem>
              </>
            )}
            {tier === "enterprise" && (
              <>
                <FeatureItem>Unlimited SKUs</FeatureItem>
              </>
            )}
            {!tier && (
              <>
                <FeatureItem disabled>Limited SKU access</FeatureItem>
              </>
            )}
          </div>

          {!subscription && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade to unlock all platform features including advanced forecasting, 
                ERP integration, and dedicated support.
              </p>
              <Button onClick={() => setLocation("/pricing")}>
                Explore Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureItem({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? "text-muted-foreground" : ""}`}>
      <CheckCircle className={`h-4 w-4 ${disabled ? "text-muted-foreground" : "text-green-500"}`} />
      <span className="text-sm">{children}</span>
    </div>
  );
}
