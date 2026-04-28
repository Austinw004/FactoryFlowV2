import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Loader2 } from "lucide-react";

interface DHLConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DHLConfigDialog({ open, onOpenChange }: DHLConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [enableTracking, setEnableTracking] = useState(true);
  const [enableAlerts, setEnableAlerts] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/dhl/test", {
        apiKey,
        apiSecret,
        accountNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "DHL API credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/dhl/configure", {
        apiKey,
        apiSecret,
        accountNumber,
        syncOptions: { enableTracking, enableAlerts },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "DHL configured", description: "Integration saved successfully" });
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
            <Truck className="h-5 w-5 text-signal" />
            Configure DHL Express
          </DialogTitle>
          <DialogDescription>
            Connect to DHL for global shipment tracking and delivery intelligence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dhl-api-key">API Key</Label>
            <Input
              id="dhl-api-key"
              type="password"
              placeholder="Enter your DHL API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-dhl-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dhl-api-secret">API Secret</Label>
            <Input
              id="dhl-api-secret"
              type="password"
              placeholder="Enter your DHL API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              data-testid="input-dhl-api-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dhl-account">Account Number (Optional)</Label>
            <Input
              id="dhl-account"
              placeholder="Enter your DHL account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              data-testid="input-dhl-account"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dhl-tracking">Enable shipment tracking</Label>
            <Switch
              id="dhl-tracking"
              checked={enableTracking}
              onCheckedChange={setEnableTracking}
              data-testid="switch-dhl-tracking"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dhl-alerts">Enable delivery alerts</Label>
            <Switch
              id="dhl-alerts"
              checked={enableAlerts}
              onCheckedChange={setEnableAlerts}
              data-testid="switch-dhl-alerts"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !apiSecret || testMutation.isPending}
            data-testid="button-dhl-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !apiSecret || saveMutation.isPending}
            data-testid="button-dhl-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
