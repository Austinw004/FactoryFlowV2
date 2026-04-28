import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SiXero } from "react-icons/si";

interface XeroConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function XeroConfigDialog({ open, onOpenChange }: XeroConfigDialogProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [syncInvoices, setSyncInvoices] = useState(true);
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncBankTransactions, setSyncBankTransactions] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (config: { 
      clientId: string; 
      clientSecret: string; 
      tenantId: string;
      refreshToken: string;
      syncInvoices: boolean;
      syncContacts: boolean;
      syncBankTransactions: boolean;
    }) => {
      const response = await fetch("/api/integrations/xero/configure", {
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
        title: "Xero Connected",
        description: "Your cloud accounting integration is now active.",
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
    setTenantId("");
    setRefreshToken("");
    setSyncInvoices(true);
    setSyncContacts(true);
    setSyncBankTransactions(false);
    setTesting(false);
    setTestSuccess(false);
  };

  const testConnection = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your Client ID and Client Secret.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const response = await fetch("/api/integrations/xero/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, tenantId, refreshToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }

      setTestSuccess(true);
      toast({
        title: "Connection Successful",
        description: "Xero credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to Xero. Please verify your credentials.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your Client ID and Client Secret.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ 
      clientId, 
      clientSecret, 
      tenantId,
      refreshToken,
      syncInvoices,
      syncContacts,
      syncBankTransactions
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#13B5EA]/10 rounded-lg">
              <SiXero className="w-6 h-6 text-[#13B5EA]" />
            </div>
            <div>
              <DialogTitle>Connect Xero</DialogTitle>
              <DialogDescription>
                Sync financial data with your Xero cloud accounting
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to the <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Xero Developer Portal <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create a new app with OAuth 2.0</li>
              <li>Add the Prescient Labs redirect URI</li>
              <li>Copy your Client ID and Client Secret</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                data-testid="input-xero-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Your Xero client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                data-testid="input-xero-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
              <Input
                id="tenantId"
                placeholder="Xero organization tenant ID"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                data-testid="input-xero-tenant-id"
              />
              <p className="text-xs text-muted-foreground">
                Required if you have access to multiple Xero organizations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder="OAuth refresh token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                data-testid="input-xero-refresh-token"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Sync Options</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncInvoices">Sync Invoices</Label>
                <p className="text-xs text-muted-foreground">Import sales and purchase invoices</p>
              </div>
              <Switch
                id="syncInvoices"
                checked={syncInvoices}
                onCheckedChange={setSyncInvoices}
                data-testid="switch-xero-sync-invoices"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncContacts">Sync Contacts</Label>
                <p className="text-xs text-muted-foreground">Import customers and suppliers</p>
              </div>
              <Switch
                id="syncContacts"
                checked={syncContacts}
                onCheckedChange={setSyncContacts}
                data-testid="switch-xero-sync-contacts"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncBankTransactions">Sync Bank Transactions</Label>
                <p className="text-xs text-muted-foreground">Import reconciled bank transactions</p>
              </div>
              <Switch
                id="syncBankTransactions"
                checked={syncBankTransactions}
                onCheckedChange={setSyncBankTransactions}
                data-testid="switch-xero-sync-bank"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={testConnection}
            disabled={testing || !clientId || !clientSecret}
            data-testid="button-test-xero"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-xero">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !clientId || !clientSecret}
            data-testid="button-save-xero"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Xero"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}