import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link2, Loader2 } from "lucide-react";

interface SPSCommerceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SPSCommerceConfigDialog({ open, onOpenChange }: SPSCommerceConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncASN, setSyncASN] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sps-commerce/test", {
        apiKey,
        apiSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "SPS Commerce credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/sps-commerce/configure", {
        apiKey,
        apiSecret,
        companyId,
        syncOptions: { syncOrders, syncASN },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "SPS Commerce configured", description: "Integration saved successfully" });
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
            <Link2 className="h-5 w-5 text-purple-600" />
            Configure SPS Commerce
          </DialogTitle>
          <DialogDescription>
            Connect to SPS Commerce for EDI and supply chain connectivity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sps-api-key">API Key</Label>
            <Input
              id="sps-api-key"
              type="password"
              placeholder="Enter your SPS Commerce API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-sps-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sps-api-secret">API Secret</Label>
            <Input
              id="sps-api-secret"
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              data-testid="input-sps-api-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sps-company">Company ID (Optional)</Label>
            <Input
              id="sps-company"
              placeholder="Enter your SPS company ID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              data-testid="input-sps-company"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sps-orders">Sync EDI orders</Label>
            <Switch
              id="sps-orders"
              checked={syncOrders}
              onCheckedChange={setSyncOrders}
              data-testid="switch-sps-orders"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sps-asn">Sync ASN/invoicing</Label>
            <Switch
              id="sps-asn"
              checked={syncASN}
              onCheckedChange={setSyncASN}
              data-testid="switch-sps-asn"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !apiSecret || testMutation.isPending}
            data-testid="button-sps-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !apiSecret || saveMutation.isPending}
            data-testid="button-sps-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
