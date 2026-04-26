/**
 * StripePaymentForm — Stripe Elements card collection during onboarding.
 *
 * PCI scope reduction: the actual card fields render inside Stripe-hosted
 * iframes (PaymentElement). The raw PAN never touches our server or our
 * JavaScript context — Stripe.js tokenizes it client-side and confirms a
 * SetupIntent we created server-side. We only ever see the resulting
 * payment_method id.
 *
 * Flow:
 *   1) On mount: hit /api/onboarding/payment-method/setup-intent → get clientSecret.
 *   2) Render <Elements stripe={stripePromise} options={{ clientSecret }}>.
 *   3) Customer fills card → submits → stripe.confirmSetup(...) inside iframe.
 *   4) On success: hit /api/onboarding/payment-method/confirm → server marks
 *      the card as the customer's default for invoices.
 *   5) Call props.onSuccess() to advance to the next onboarding step.
 *
 * On error or load failure, the customer can still skip — props.onSkip()
 * advances without saving a card. The 90-day trial means we don't need
 * one to start.
 */
import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronRight, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StripePaymentFormProps {
  onSuccess: () => void;
  onSkip: () => void;
  onBack: () => void;
}

// Lazily load Stripe.js so the rest of the app isn't slowed by it.
// We fetch the publishable key from the server (so it can rotate without a
// client redeploy) the first time this component mounts.
let stripePromise: Promise<Stripe | null> | null = null;
async function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const res = await fetch("/api/stripe/config");
      if (!res.ok) return null;
      const { publishableKey } = await res.json();
      if (!publishableKey) return null;
      return loadStripe(publishableKey);
    })();
  }
  return stripePromise;
}

// Inner form component — must be rendered INSIDE <Elements> to use the hooks.
function CardForm({
  setupIntentId,
  onSuccess,
  onSkip,
  onBack,
}: {
  setupIntentId: string;
  onSuccess: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      // Confirm the SetupIntent. Stripe handles 3DS / SCA challenges in a
      // modal automatically. We pass redirect: 'if_required' so we only
      // get redirected away from the page if the bank actually needs it.
      const { error } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Couldn't save card",
          description: error.message ?? "Something went wrong. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      // Tell our server the SetupIntent succeeded so it can mark the
      // payment method as the customer's default.
      await apiRequest("POST", "/api/onboarding/payment-method/confirm", {
        setupIntentId,
      });

      onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Couldn't save card",
        description: err?.message ?? "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: "tabs" }} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>
          Card data is collected by Stripe directly. Prescient Labs never sees or stores raw card numbers.
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="h-11" disabled={submitting}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="h-11" disabled={submitting}>
          Skip — add later
        </Button>
        <Button type="submit" className="flex-1 h-11" disabled={!stripe || !elements || submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving card…
            </>
          ) : (
            <>
              Save card &amp; continue <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function StripePaymentForm({ onSuccess, onSkip, onBack }: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stripeInstance, intentRes] = await Promise.all([
          getStripePromise(),
          apiRequest("POST", "/api/onboarding/payment-method/setup-intent", {}),
        ]);
        if (cancelled) return;

        if (!stripeInstance) {
          setLoadError("Stripe isn't configured for this deployment. Skip for now and add a card later from Settings → Billing.");
          return;
        }
        setStripe(stripeInstance);

        const data = await intentRes.json();
        if (!data?.clientSecret || !data?.setupIntentId) {
          setLoadError("Couldn't start payment setup. Skip for now and add a card later from Settings → Billing.");
          return;
        }
        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId);
      } catch (err: any) {
        if (cancelled) return;
        setLoadError(
          err?.message ?? "Couldn't reach Stripe. Skip for now and add a card later from Settings → Billing.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state.
  if (!loadError && (!stripe || !clientSecret)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing secure payment form…</span>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="h-11">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip} className="h-11 flex-1">
            Skip — add a card later
          </Button>
        </div>
      </div>
    );
  }

  // Failure state — let the customer continue without a card.
  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          {loadError}
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="h-11">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button type="button" onClick={onSkip} className="flex-1 h-11">
            Continue without a card <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret: clientSecret!, appearance: { theme: "stripe" } }}>
      <CardForm setupIntentId={setupIntentId!} onSuccess={onSuccess} onSkip={onSkip} onBack={onBack} />
    </Elements>
  );
}
