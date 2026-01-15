import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Truck, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UPSConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UPSConfigDialog({ open, onOpenChange }: UPSConfigDialogProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [trackPackages, setTrackPackages] = useState(true);
  const [rateEstimates, setRateEstimates] = useState(true);
  const [transitTime, setTransitTime] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (config: { 
      clientId: string; 
      clientSecret: string; 
      accountNumber: string;
      environment: string;
      trackPackages: boolean;
      rateEstimates: boolean;
      transitTime: boolean;
    }) => {
      const response = await fetch("/api/integrations/ups/configure", {
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
      toast({
        title: "UPS Connected",
        description: "Package tracking and shipping rates are now active.",
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
    setAccountNumber("");
    setEnvironment("sandbox");
    setTrackPackages(true);
    setRateEstimates(true);
    setTransitTime(true);
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
      const response = await fetch("/api/integrations/ups/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, accountNumber, environment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }

      setTestSuccess(true);
      toast({
        title: "Connection Successful",
        description: "UPS credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to UPS. Please verify your credentials.",
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
      accountNumber,
      environment,
      trackPackages,
      rateEstimates,
      transitTime
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Truck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Connect UPS</DialogTitle>
              <DialogDescription>
                Track packages and get shipping rate estimates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://developer.ups.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">UPS Developer Portal <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create an application to get OAuth credentials</li>
              <li>Enable Tracking, Rating, and Time In Transit APIs</li>
              <li>Copy your Client ID and Client Secret</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={(value: "sandbox" | "production") => setEnvironment(value)}>
                <SelectTrigger data-testid="select-ups-environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                placeholder="Your UPS OAuth client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                data-testid="input-ups-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Your UPS OAuth client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                data-testid="input-ups-client-secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (Optional)</Label>
              <Input
                id="accountNumber"
                placeholder="For negotiated rates"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                data-testid="input-ups-account-number"
              />
              <p className="text-xs text-muted-foreground">
                Required for negotiated shipping rates
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Features</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trackPackages">Package Tracking</Label>
                <p className="text-xs text-muted-foreground">Real-time tracking for all UPS shipments</p>
              </div>
              <Switch
                id="trackPackages"
                checked={trackPackages}
                onCheckedChange={setTrackPackages}
                data-testid="switch-ups-track"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="rateEstimates">Rate Estimates</Label>
                <p className="text-xs text-muted-foreground">Get shipping cost estimates</p>
              </div>
              <Switch
                id="rateEstimates"
                checked={rateEstimates}
                onCheckedChange={setRateEstimates}
                data-testid="switch-ups-rates"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="transitTime">Transit Time Estimates</Label>
                <p className="text-xs text-muted-foreground">Get delivery time predictions</p>
              </div>
              <Switch
                id="transitTime"
                checked={transitTime}
                onCheckedChange={setTransitTime}
                data-testid="switch-ups-transit"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={testConnection}
            disabled={testing || !clientId || !clientSecret}
            data-testid="button-test-ups"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : testSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Connection Verified
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-ups">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !clientId || !clientSecret}
            data-testid="button-save-ups"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect UPS"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}