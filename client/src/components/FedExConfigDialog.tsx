import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Truck, ExternalLink, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FedExConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FedExConfigDialog({ open, onOpenChange }: FedExConfigDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [trackShipments, setTrackShipments] = useState(true);
  const [rateQuotes, setRateQuotes] = useState(true);
  const [webhookAlerts, setWebhookAlerts] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (config: { 
      apiKey: string; 
      secretKey: string; 
      accountNumber: string;
      meterNumber: string;
      environment: string;
      trackShipments: boolean;
      rateQuotes: boolean;
      webhookAlerts: boolean;
    }) => {
      const response = await fetch("/api/integrations/fedex/configure", {
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
        title: "FedEx Connected",
        description: "Shipment tracking and rate quotes are now active.",
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
    setApiKey("");
    setSecretKey("");
    setAccountNumber("");
    setMeterNumber("");
    setEnvironment("sandbox");
    setTrackShipments(true);
    setRateQuotes(true);
    setWebhookAlerts(true);
    setTesting(false);
    setTestSuccess(false);
  };

  const testConnection = async () => {
    if (!apiKey || !secretKey || !accountNumber) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your API Key, Secret Key, and Account Number.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const response = await fetch("/api/integrations/fedex/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, secretKey, accountNumber, meterNumber, environment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }

      setTestSuccess(true);
      toast({
        title: "Connection Successful",
        description: "FedEx credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to FedEx. Please verify your credentials.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || !secretKey || !accountNumber) {
      toast({
        title: "Missing Credentials",
        description: "Please enter all required FedEx credentials.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ 
      apiKey, 
      secretKey, 
      accountNumber,
      meterNumber,
      environment,
      trackShipments,
      rateQuotes,
      webhookAlerts
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle>Connect FedEx</DialogTitle>
              <DialogDescription>
                Track shipments and get real-time delivery updates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://developer.fedex.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">FedEx Developer Portal <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create a project and get API credentials</li>
              <li>Enable Track API and Rate API access</li>
              <li>Copy your API Key, Secret, and Account Number</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={(value: "sandbox" | "production") => setEnvironment(value)}>
                <SelectTrigger data-testid="select-fedex-environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                placeholder="Your FedEx API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-fedex-api-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key *</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Your FedEx secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                data-testid="input-fedex-secret-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                placeholder="123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                data-testid="input-fedex-account-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meterNumber">Meter Number (Optional)</Label>
              <Input
                id="meterNumber"
                placeholder="For legacy integrations"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                data-testid="input-fedex-meter-number"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Features</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trackShipments">Track Shipments</Label>
                <p className="text-xs text-muted-foreground">Real-time tracking for all FedEx shipments</p>
              </div>
              <Switch
                id="trackShipments"
                checked={trackShipments}
                onCheckedChange={setTrackShipments}
                data-testid="switch-fedex-track"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="rateQuotes">Rate Quotes</Label>
                <p className="text-xs text-muted-foreground">Get shipping rate estimates</p>
              </div>
              <Switch
                id="rateQuotes"
                checked={rateQuotes}
                onCheckedChange={setRateQuotes}
                data-testid="switch-fedex-rates"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="webhookAlerts">Delivery Alerts</Label>
                <p className="text-xs text-muted-foreground">Get notified of delivery events</p>
              </div>
              <Switch
                id="webhookAlerts"
                checked={webhookAlerts}
                onCheckedChange={setWebhookAlerts}
                data-testid="switch-fedex-alerts"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={testConnection}
            disabled={testing || !apiKey || !secretKey || !accountNumber}
            data-testid="button-test-fedex"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-fedex">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !apiKey || !secretKey || !accountNumber}
            data-testid="button-save-fedex"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect FedEx"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}