import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";

interface StripeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StripeConfigDialog({ open, onOpenChange }: StripeConfigDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    environment: "test",
    syncPayments: true,
    syncInvoices: true,
    syncSubscriptions: true,
    autoReconcile: false,
  });

  const handleTestConnection = async () => {
    if (!config.secretKey) {
      toast({
        title: "Missing API key",
        description: "Please enter your Stripe secret key",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      const response = await apiRequest("POST", "/api/integrations/stripe-connect/test", {
        secretKey: config.secretKey,
      });
      const data = await response.json();
      if (data.success) {
        setTestSuccess(true);
        toast({
          title: "Connection successful",
          description: data.message || "Stripe API connection verified",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Could not connect to Stripe",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Stripe",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/stripe-connect/configure", {
        ...config,
        enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "Configuration saved",
        description: "Stripe integration has been configured",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-stripe-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Configure Stripe
          </DialogTitle>
          <DialogDescription>
            Connect Stripe to sync payment data and automate supplier payment reconciliation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={config.environment}
              onValueChange={(value) => setConfig({ ...config, environment: value })}
            >
              <SelectTrigger data-testid="select-environment">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test Mode</SelectItem>
                <SelectItem value="live">Live Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publishableKey">Publishable Key</Label>
              <Input
                id="publishableKey"
                data-testid="input-publishable-key"
                placeholder="pk_test_..."
                value={config.publishableKey}
                onChange={(e) => setConfig({ ...config, publishableKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                data-testid="input-secret-key"
                type="password"
                placeholder="sk_test_..."
                value={config.secretKey}
                onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
            <Input
              id="webhookSecret"
              data-testid="input-webhook-secret"
              type="password"
              placeholder="whsec_..."
              value={config.webhookSecret}
              onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Required for real-time payment event notifications
            </p>
          </div>
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Sync Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="syncPayments" className="text-sm">Payments</Label>
                <Switch
                  id="syncPayments"
                  data-testid="switch-payments"
                  checked={config.syncPayments}
                  onCheckedChange={(checked) => setConfig({ ...config, syncPayments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncInvoices" className="text-sm">Invoices</Label>
                <Switch
                  id="syncInvoices"
                  data-testid="switch-invoices"
                  checked={config.syncInvoices}
                  onCheckedChange={(checked) => setConfig({ ...config, syncInvoices: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncSubscriptions" className="text-sm">Subscriptions</Label>
                <Switch
                  id="syncSubscriptions"
                  data-testid="switch-subscriptions"
                  checked={config.syncSubscriptions}
                  onCheckedChange={(checked) => setConfig({ ...config, syncSubscriptions: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autoReconcile" className="text-sm">Auto-Reconcile</Label>
                <Switch
                  id="autoReconcile"
                  data-testid="switch-auto-reconcile"
                  checked={config.autoReconcile}
                  onCheckedChange={(checked) => setConfig({ ...config, autoReconcile: checked })}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            data-testid="button-test-connection"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : testSuccess ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : null}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
