import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Loader2 } from "lucide-react";

interface CoupaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoupaConfigDialog({ open, onOpenChange }: CoupaConfigDialogProps) {
  const { toast } = useToast();
  const [instanceUrl, setInstanceUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [syncPurchases, setSyncPurchases] = useState(true);
  const [syncInvoices, setSyncInvoices] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/coupa/test", {
        instanceUrl,
        clientId,
        clientSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Coupa credentials verified" });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/coupa/configure", {
        instanceUrl,
        clientId,
        clientSecret,
        syncOptions: { syncPurchases, syncInvoices },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Coupa configured", description: "Integration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Configuration failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Configure Coupa
          </DialogTitle>
          <DialogDescription>
            Connect to Coupa for unified spend management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="coupa-url">Instance URL</Label>
            <Input
              id="coupa-url"
              placeholder="https://your-company.coupahost.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              data-testid="input-coupa-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupa-client-id">Client ID</Label>
            <Input
              id="coupa-client-id"
              placeholder="Enter your OAuth client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="input-coupa-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupa-client-secret">Client Secret</Label>
            <Input
              id="coupa-client-secret"
              type="password"
              placeholder="Enter your OAuth client secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              data-testid="input-coupa-client-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="coupa-purchases">Sync purchases</Label>
            <Switch
              id="coupa-purchases"
              checked={syncPurchases}
              onCheckedChange={setSyncPurchases}
              data-testid="switch-coupa-purchases"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="coupa-invoices">Sync invoices</Label>
            <Switch
              id="coupa-invoices"
              checked={syncInvoices}
              onCheckedChange={setSyncInvoices}
              data-testid="switch-coupa-invoices"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!instanceUrl || !clientId || !clientSecret || testMutation.isPending}
            data-testid="button-coupa-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!instanceUrl || !clientId || !clientSecret || saveMutation.isPending}
            data-testid="button-coupa-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
