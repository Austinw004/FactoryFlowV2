import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { SiSalesforce } from "react-icons/si";

interface SalesforceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  salesforce?: {
    enabled: boolean;
    configured: boolean;
    instanceUrl?: string;
  };
}

export function SalesforceConfigDialog({ open, onOpenChange }: SalesforceConfigDialogProps) {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.salesforce?.enabled ?? false);
      setInstanceUrl(status.salesforce?.instanceUrl ?? "");
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setAccessToken("");
      setRefreshToken("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { accessToken?: string; refreshToken?: string; instanceUrl?: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/salesforce/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Salesforce Configured",
        description: "Your Salesforce integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Salesforce configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/salesforce/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: `Connected to Salesforce. Found ${data.objects || 0} objects.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Salesforce.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({
      accessToken: accessToken || undefined,
      refreshToken: refreshToken || undefined,
      instanceUrl: instanceUrl || undefined,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiSalesforce className="w-6 h-6 text-[#00A1E0]" />
            Salesforce Integration
          </DialogTitle>
          <DialogDescription>
            Connect Salesforce to sync opportunity pipeline and customer data for demand forecasting.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Sync Salesforce data with Prescient Labs
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-salesforce-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceUrl">Salesforce Instance URL</Label>
              <Input
                id="instanceUrl"
                placeholder="https://yourcompany.salesforce.com"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                data-testid="input-salesforce-instance-url"
              />
              <p className="text-xs text-muted-foreground">
                Your Salesforce organization's login URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Enter your Salesforce access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                data-testid="input-salesforce-access-token"
              />
              <p className="text-xs text-muted-foreground">
                Generate from Salesforce Setup → Apps → Connected Apps
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder="Enter refresh token for auto-renewal"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                data-testid="input-salesforce-refresh-token"
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Setup Guide</p>
                  <p className="text-muted-foreground">
                    Create a Connected App in Salesforce with OAuth enabled, then generate an access token.
                  </p>
                  <a
                    href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View Salesforce documentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {status?.salesforce?.configured && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Salesforce is configured
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !status?.salesforce?.configured}
            data-testid="button-test-salesforce"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-salesforce"
          >
            {configureMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
