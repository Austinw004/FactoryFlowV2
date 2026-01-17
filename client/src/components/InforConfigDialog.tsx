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

interface InforConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InforConfigDialog({ open, onOpenChange }: InforConfigDialogProps) {
  const { toast } = useToast();
  const [ionApiUrl, setIonApiUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncProduction, setSyncProduction] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/infor/test", {
        ionApiUrl,
        clientId,
        clientSecret,
        tenantId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Infor CloudSuite credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/infor/configure", {
        ionApiUrl,
        clientId,
        clientSecret,
        tenantId,
        syncOptions: { syncInventory, syncProduction },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Infor CloudSuite configured", description: "Integration saved successfully" });
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
            <Building2 className="h-5 w-5 text-orange-500" />
            Configure Infor CloudSuite
          </DialogTitle>
          <DialogDescription>
            Connect to Infor CloudSuite for industry-specific ERP integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="infor-ion-url">ION API Gateway URL</Label>
            <Input
              id="infor-ion-url"
              placeholder="https://mingle-ionapi.inforcloudsuite.com"
              value={ionApiUrl}
              onChange={(e) => setIonApiUrl(e.target.value)}
              data-testid="input-infor-ion-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infor-tenant">Tenant ID</Label>
            <Input
              id="infor-tenant"
              placeholder="Enter your Infor tenant ID"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              data-testid="input-infor-tenant"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infor-client-id">Client ID</Label>
            <Input
              id="infor-client-id"
              placeholder="Enter your OAuth client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="input-infor-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infor-client-secret">Client Secret</Label>
            <Input
              id="infor-client-secret"
              type="password"
              placeholder="Enter your client secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              data-testid="input-infor-client-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="infor-inventory">Sync inventory data</Label>
            <Switch
              id="infor-inventory"
              checked={syncInventory}
              onCheckedChange={setSyncInventory}
              data-testid="switch-infor-inventory"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="infor-production">Sync production orders</Label>
            <Switch
              id="infor-production"
              checked={syncProduction}
              onCheckedChange={setSyncProduction}
              data-testid="switch-infor-production"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!ionApiUrl || !tenantId || !clientId || !clientSecret || testMutation.isPending}
            data-testid="button-infor-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!ionApiUrl || !tenantId || !clientId || !clientSecret || saveMutation.isPending}
            data-testid="button-infor-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
