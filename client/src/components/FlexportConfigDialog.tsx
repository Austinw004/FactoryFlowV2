import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface FlexportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlexportConfigDialog({ open, onOpenChange }: FlexportConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [syncShipments, setSyncShipments] = useState(true);
  const [syncQuotes, setSyncQuotes] = useState(true);
  const [syncDocuments, setSyncDocuments] = useState(true);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast({
        title: "Missing API key",
        description: "Please enter your Flexport API key",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      await apiRequest("POST", "/api/integrations/flexport/test", { apiKey, environment });
      setTestSuccess(true);
      toast({
        title: "Connection successful",
        description: "Flexport API connection verified",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your API key and try again",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      toast({
        title: "Missing API key",
        description: "Please enter your Flexport API key",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/flexport/configure", {
        apiKey,
        environment,
        syncOptions: { shipments: syncShipments, quotes: syncQuotes, documents: syncDocuments, alerts: enableAlerts },
      });
      toast({
        title: "Integration configured",
        description: "Flexport integration is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Flexport</DialogTitle>
          <DialogDescription>
            Connect Flexport for end-to-end global freight visibility including ocean, air, and trucking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key *</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="flx_xxxxxxxxxxxxxxxxxxxxx"
              data-testid="input-flexport-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger data-testid="select-flexport-environment">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox" data-testid="option-flexport-env-sandbox">Sandbox (Testing)</SelectItem>
                <SelectItem value="production" data-testid="option-flexport-env-production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-shipments" className="text-sm font-normal">Sync shipments</Label>
              <Switch id="sync-shipments" checked={syncShipments} onCheckedChange={setSyncShipments} data-testid="switch-sync-shipments" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-quotes" className="text-sm font-normal">Sync quotes</Label>
              <Switch id="sync-quotes" checked={syncQuotes} onCheckedChange={setSyncQuotes} data-testid="switch-sync-quotes" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-documents" className="text-sm font-normal">Sync shipping documents</Label>
              <Switch id="sync-documents" checked={syncDocuments} onCheckedChange={setSyncDocuments} data-testid="switch-sync-documents" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-alerts" className="text-sm font-normal">Enable delay alerts</Label>
              <Switch id="enable-alerts" checked={enableAlerts} onCheckedChange={setEnableAlerts} data-testid="switch-enable-alerts" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
              data-testid="button-test-flexport"
            >
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : testSuccess ? <CheckCircle className="mr-2 h-4 w-4 text-good" /> : null}
              {testSuccess ? "Connected" : "Test Connection"}
            </Button>
            <a
              href="https://developers.flexport.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              API documentation <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-flexport">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !apiKey} data-testid="button-save-flexport">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
