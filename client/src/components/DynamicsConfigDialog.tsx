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

interface DynamicsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DynamicsConfigDialog({ open, onOpenChange }: DynamicsConfigDialogProps) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environmentUrl, setEnvironmentUrl] = useState("");
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/dynamics/test", {
        tenantId,
        clientId,
        clientSecret,
        environmentUrl,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Microsoft Dynamics 365 credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/dynamics/configure", {
        tenantId,
        clientId,
        clientSecret,
        environmentUrl,
        syncOptions: { syncProducts, syncOrders },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Dynamics 365 configured", description: "Integration saved successfully" });
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
            Configure Microsoft Dynamics 365
          </DialogTitle>
          <DialogDescription>
            Connect to Dynamics 365 for unified ERP and CRM data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dynamics-tenant">Azure AD Tenant ID</Label>
            <Input
              id="dynamics-tenant"
              placeholder="Enter your Azure AD tenant ID"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              data-testid="input-dynamics-tenant"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dynamics-client-id">Client ID</Label>
            <Input
              id="dynamics-client-id"
              placeholder="Enter your app registration client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="input-dynamics-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dynamics-client-secret">Client Secret</Label>
            <Input
              id="dynamics-client-secret"
              type="password"
              placeholder="Enter your client secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              data-testid="input-dynamics-client-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dynamics-env">Environment URL</Label>
            <Input
              id="dynamics-env"
              placeholder="https://yourorg.crm.dynamics.com"
              value={environmentUrl}
              onChange={(e) => setEnvironmentUrl(e.target.value)}
              data-testid="input-dynamics-env"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dynamics-products">Sync products</Label>
            <Switch
              id="dynamics-products"
              checked={syncProducts}
              onCheckedChange={setSyncProducts}
              data-testid="switch-dynamics-products"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dynamics-orders">Sync orders</Label>
            <Switch
              id="dynamics-orders"
              checked={syncOrders}
              onCheckedChange={setSyncOrders}
              data-testid="switch-dynamics-orders"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!tenantId || !clientId || !clientSecret || !environmentUrl || testMutation.isPending}
            data-testid="button-dynamics-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!tenantId || !clientId || !clientSecret || !environmentUrl || saveMutation.isPending}
            data-testid="button-dynamics-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
