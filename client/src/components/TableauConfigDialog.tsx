import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle, Copy } from "lucide-react";

interface TableauConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableauConfigDialog({ open, onOpenChange }: TableauConfigDialogProps) {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [exportForecasts, setExportForecasts] = useState(true);
  const [exportInventory, setExportInventory] = useState(true);
  const [exportSuppliers, setExportSuppliers] = useState(true);
  const [exportRegime, setExportRegime] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const apiEndpoint = `${window.location.origin}/api/data-export`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(apiEndpoint);
    toast({
      title: "Copied",
      description: "API endpoint copied to clipboard",
    });
  };

  const handleTestConnection = async () => {
    if (!serverUrl || !tokenName || !tokenSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      await apiRequest("POST", "/api/integrations/tableau/test", { serverUrl, siteName, tokenName, tokenSecret });
      setTestSuccess(true);
      toast({
        title: "Connection successful",
        description: "Tableau Server connection verified",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl || !tokenName || !tokenSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/tableau/configure", {
        serverUrl,
        siteName,
        tokenName,
        tokenSecret,
        exportOptions: { forecasts: exportForecasts, inventory: exportInventory, suppliers: exportSuppliers, regime: exportRegime },
      });
      toast({
        title: "Integration configured",
        description: "Tableau integration is now active",
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
          <DialogTitle>Configure Tableau</DialogTitle>
          <DialogDescription>
            Connect Tableau for advanced visualization and analysis of your manufacturing data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data Export API Endpoint</Label>
            <div className="flex gap-2">
              <Input value={apiEndpoint} readOnly className="font-mono text-sm" data-testid="input-tableau-api-endpoint" />
              <Button variant="outline" size="icon" onClick={handleCopyEndpoint} data-testid="button-copy-endpoint">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use this endpoint in Tableau Web Data Connector</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-url">Tableau Server URL *</Label>
            <Input
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://tableau.yourcompany.com"
              data-testid="input-tableau-server-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-name">Site Name (optional)</Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="default"
              data-testid="input-tableau-site-name"
            />
            <p className="text-xs text-muted-foreground">Leave blank for default site</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-name">Personal Access Token Name *</Label>
            <Input
              id="token-name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="prescient-labs-token"
              data-testid="input-tableau-token-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-secret">Personal Access Token Secret *</Label>
            <Input
              id="token-secret"
              type="password"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
              placeholder="Enter token secret"
              data-testid="input-tableau-token-secret"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Export Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-forecasts" className="text-sm font-normal">Export forecasts</Label>
              <Switch id="export-forecasts" checked={exportForecasts} onCheckedChange={setExportForecasts} data-testid="switch-export-forecasts" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-inventory" className="text-sm font-normal">Export inventory</Label>
              <Switch id="export-inventory" checked={exportInventory} onCheckedChange={setExportInventory} data-testid="switch-export-inventory" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-suppliers" className="text-sm font-normal">Export suppliers</Label>
              <Switch id="export-suppliers" checked={exportSuppliers} onCheckedChange={setExportSuppliers} data-testid="switch-export-suppliers" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-regime" className="text-sm font-normal">Export regime data</Label>
              <Switch id="export-regime" checked={exportRegime} onCheckedChange={setExportRegime} data-testid="switch-export-regime" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !serverUrl || !tokenName || !tokenSecret}
              data-testid="button-test-tableau"
            >
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : testSuccess ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : null}
              {testSuccess ? "Connected" : "Test Connection"}
            </Button>
            <a
              href="https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_auth.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Setup guide <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-tableau">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !serverUrl || !tokenName || !tokenSecret} data-testid="button-save-tableau">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
