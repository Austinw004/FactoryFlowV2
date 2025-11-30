import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
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

export default function Billing() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const { toast } = useToast();

  const { data: subscriptionData, isLoading, refetch } = useQuery<{
    subscription: any;
    status: string;
    tier: string | null;
    trialEndsAt: string | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
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

  useEffect(() => {
    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Welcome to Manufacturing AI. Your subscription is now active.",
      });
      refetch();
      // Clean up URL
      window.history.replaceState({}, "", "/billing");
    }
  }, [success, toast, refetch]);

  const subscription = subscriptionData?.subscription;
  const status = subscriptionData?.status || "none";
  const tier = subscriptionData?.tier;
  const trialEndsAt = subscriptionData?.trialEndsAt;

  const TierIcon = tier ? tierIcons[tier] || Zap : Zap;

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
          <div className="flex items-center justify-between">
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
                <FeatureItem>Basic demand forecasting</FeatureItem>
                <FeatureItem>Economic regime monitoring</FeatureItem>
                <FeatureItem>5 supplier connections</FeatureItem>
                <FeatureItem>Email support</FeatureItem>
                <FeatureItem>Standard reports</FeatureItem>
              </>
            )}
            {tier === "professional" && (
              <>
                <FeatureItem>Up to 1,000 SKUs</FeatureItem>
                <FeatureItem>Multi-horizon forecasting</FeatureItem>
                <FeatureItem>FDR-based procurement signals</FeatureItem>
                <FeatureItem>25 supplier connections</FeatureItem>
                <FeatureItem>ERP integration</FeatureItem>
                <FeatureItem>Priority support</FeatureItem>
                <FeatureItem>Custom dashboards</FeatureItem>
                <FeatureItem>API access</FeatureItem>
              </>
            )}
            {tier === "enterprise" && (
              <>
                <FeatureItem>Unlimited SKUs</FeatureItem>
                <FeatureItem>Real-time digital twin</FeatureItem>
                <FeatureItem>Multi-tier supplier mapping</FeatureItem>
                <FeatureItem>Unlimited supplier connections</FeatureItem>
                <FeatureItem>Custom ERP integrations</FeatureItem>
                <FeatureItem>Dedicated account manager</FeatureItem>
                <FeatureItem>Custom model training</FeatureItem>
                <FeatureItem>SLA guarantee</FeatureItem>
              </>
            )}
            {!tier && (
              <>
                <FeatureItem disabled>Limited SKU access</FeatureItem>
                <FeatureItem disabled>Basic forecasting preview</FeatureItem>
                <FeatureItem disabled>Dashboard access</FeatureItem>
                <FeatureItem disabled>Community support</FeatureItem>
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
