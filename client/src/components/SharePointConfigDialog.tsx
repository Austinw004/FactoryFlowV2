import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface SharePointConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharePointConfigDialog({ open, onOpenChange }: SharePointConfigDialogProps) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [syncDocuments, setSyncDocuments] = useState(true);
  const [syncLists, setSyncLists] = useState(true);
  const [enableVersioning, setEnableVersioning] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!tenantId || !clientId || !clientSecret) {
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
      await apiRequest("POST", "/api/integrations/sharepoint/test", { tenantId, clientId, clientSecret, siteUrl });
      setTestSuccess(true);
      toast({
        title: "Connection successful",
        description: "SharePoint connection verified",
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
    if (!tenantId || !clientId || !clientSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/sharepoint/configure", {
        tenantId,
        clientId,
        clientSecret,
        siteUrl,
        syncOptions: { documents: syncDocuments, lists: syncLists, versioning: enableVersioning },
      });
      toast({
        title: "Integration configured",
        description: "SharePoint integration is now active",
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
          <DialogTitle>Configure SharePoint</DialogTitle>
          <DialogDescription>
            Connect SharePoint for document management and collaboration on supply chain documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-id">Tenant ID *</Label>
            <Input
              id="tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              data-testid="input-sharepoint-tenant-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-id">Client ID *</Label>
            <Input
              id="client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              data-testid="input-sharepoint-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Client Secret *</Label>
            <Input
              id="client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter client secret"
              data-testid="input-sharepoint-client-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-url">Site URL (optional)</Label>
            <Input
              id="site-url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://yourcompany.sharepoint.com/sites/procurement"
              data-testid="input-sharepoint-site-url"
            />
            <p className="text-xs text-muted-foreground">Leave blank to connect to root site</p>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-documents" className="text-sm font-normal">Sync documents</Label>
              <Switch id="sync-documents" checked={syncDocuments} onCheckedChange={setSyncDocuments} data-testid="switch-sync-documents" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-lists" className="text-sm font-normal">Sync lists</Label>
              <Switch id="sync-lists" checked={syncLists} onCheckedChange={setSyncLists} data-testid="switch-sync-lists" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-versioning" className="text-sm font-normal">Enable version tracking</Label>
              <Switch id="enable-versioning" checked={enableVersioning} onCheckedChange={setEnableVersioning} data-testid="switch-versioning" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !tenantId || !clientId || !clientSecret}
              data-testid="button-test-sharepoint"
            >
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : testSuccess ? <CheckCircle className="mr-2 h-4 w-4 text-good" /> : null}
              {testSuccess ? "Connected" : "Test Connection"}
            </Button>
            <a
              href="https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/register-sharepoint-add-ins"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Setup guide <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-sharepoint">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !tenantId || !clientId || !clientSecret} data-testid="button-save-sharepoint">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
