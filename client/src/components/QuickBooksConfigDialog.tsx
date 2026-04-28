import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, DollarSign, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface QuickBooksConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickBooksConfigDialog({ open, onOpenChange }: QuickBooksConfigDialogProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [realmId, setRealmId] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [syncInvoices, setSyncInvoices] = useState(true);
  const [syncVendors, setSyncVendors] = useState(true);
  const [syncPurchaseOrders, setSyncPurchaseOrders] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (config: { 
      clientId: string; 
      clientSecret: string; 
      realmId: string;
      refreshToken: string;
      syncInvoices: boolean;
      syncVendors: boolean;
      syncPurchaseOrders: boolean;
    }) => {
      const response = await fetch("/api/integrations/quickbooks/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save configuration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "QuickBooks Connected",
        description: "Your accounting integration is now active. Financial data will sync automatically.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setClientId("");
    setClientSecret("");
    setRealmId("");
    setRefreshToken("");
    setSyncInvoices(true);
    setSyncVendors(true);
    setSyncPurchaseOrders(true);
    setTesting(false);
    setTestSuccess(false);
  };

  const testConnection = async () => {
    if (!clientId || !clientSecret || !realmId) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your Client ID, Client Secret, and Company ID (Realm ID).",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const response = await fetch("/api/integrations/quickbooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, realmId, refreshToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }

      setTestSuccess(true);
      toast({
        title: "Connection Successful",
        description: "QuickBooks credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to QuickBooks. Please verify your credentials.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!clientId || !clientSecret || !realmId) {
      toast({
        title: "Missing Credentials",
        description: "Please enter all required QuickBooks credentials.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ 
      clientId, 
      clientSecret, 
      realmId,
      refreshToken,
      syncInvoices,
      syncVendors,
      syncPurchaseOrders
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-good" />
            </div>
            <div>
              <DialogTitle>Connect QuickBooks</DialogTitle>
              <DialogDescription>
                Sync invoices, vendors, and purchase orders with QuickBooks
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to the <a href="https://developer.intuit.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Intuit Developer Portal <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create an app and get your OAuth 2.0 credentials</li>
              <li>Set the redirect URI to your Prescient Labs callback URL</li>
              <li>Copy your Client ID, Client Secret, and Company ID</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                placeholder="AB1CDe2FgH3ijK4LmN5oPq6Rs7T"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                data-testid="input-quickbooks-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Your QuickBooks client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                data-testid="input-quickbooks-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realmId">Company ID (Realm ID) *</Label>
              <Input
                id="realmId"
                placeholder="123456789012345678"
                value={realmId}
                onChange={(e) => setRealmId(e.target.value)}
                data-testid="input-quickbooks-realm-id"
              />
              <p className="text-xs text-muted-foreground">
                Found in your QuickBooks company settings or developer dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder="OAuth refresh token for long-lived access"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                data-testid="input-quickbooks-refresh-token"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Sync Options</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncInvoices">Sync Invoices</Label>
                <p className="text-xs text-muted-foreground">Import invoice data for financial forecasting</p>
              </div>
              <Switch
                id="syncInvoices"
                checked={syncInvoices}
                onCheckedChange={setSyncInvoices}
                data-testid="switch-sync-invoices"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncVendors">Sync Vendors</Label>
                <p className="text-xs text-muted-foreground">Import vendor information for supplier management</p>
              </div>
              <Switch
                id="syncVendors"
                checked={syncVendors}
                onCheckedChange={setSyncVendors}
                data-testid="switch-sync-vendors"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncPurchaseOrders">Sync Purchase Orders</Label>
                <p className="text-xs text-muted-foreground">Import PO data for procurement analytics</p>
              </div>
              <Switch
                id="syncPurchaseOrders"
                checked={syncPurchaseOrders}
                onCheckedChange={setSyncPurchaseOrders}
                data-testid="switch-sync-purchase-orders"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={testConnection}
            disabled={testing || !clientId || !clientSecret || !realmId}
            data-testid="button-test-quickbooks"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : testSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-good" />
                Connection Verified
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-quickbooks">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !clientId || !clientSecret || !realmId}
            data-testid="button-save-quickbooks"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect QuickBooks"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}