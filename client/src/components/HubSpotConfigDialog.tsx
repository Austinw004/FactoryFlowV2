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
import { SiHubspot } from "react-icons/si";

interface HubSpotConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  slack: {
    enabled: boolean;
    configured: boolean;
    channel: string;
  };
  twilio: {
    enabled: boolean;
    configured: boolean;
    fromNumber: string | null;
  };
  hubspot: {
    enabled: boolean;
    configured: boolean;
  };
}

export function HubSpotConfigDialog({ open, onOpenChange }: HubSpotConfigDialogProps) {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.hubspot.enabled);
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setAccessToken("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { accessToken?: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/hubspot/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "HubSpot Configured",
        description: "Your HubSpot integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save HubSpot configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/hubspot/test");
      return res.json();
    },
    onSuccess: (data: { success: boolean; message?: string; accountInfo?: any }) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: data.message || "HubSpot is connected.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Could not connect to HubSpot.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message || "Could not test HubSpot connection.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({ 
      accessToken: accessToken || undefined, 
      enabled 
    });
  };

  const handleTest = () => {
    if (!status?.hubspot.configured) {
      toast({
        title: "Not Configured",
        description: "Please save an access token first.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate();
  };

  const isConfigured = status?.hubspot.configured;
  const canSave = accessToken || isConfigured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiHubspot className="w-5 h-5 text-[#ff7a59]" />
            HubSpot CRM Integration
            {isConfigured && (
              <CheckCircle className="w-4 h-4 text-good" />
            )}
          </DialogTitle>
          <DialogDescription>
            Sync your CRM data with Prescient Labs for enhanced demand forecasting and supplier management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md bg-blue-500/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">Private App Access Token Required</p>
                    <p className="text-muted-foreground mt-1">
                      Create a private app in HubSpot to get an access token.{" "}
                      <a
                        href="https://developers.hubspot.com/docs/api/private-apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Learn how
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <Input
                  id="access-token"
                  type="password"
                  data-testid="input-hubspot-token"
                  placeholder={isConfigured ? "Enter new token to update" : "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required scopes: crm.objects.contacts.read, crm.objects.companies.read, crm.objects.deals.read
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable HubSpot Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Sync contacts, companies, and deals with Prescient Labs
                  </p>
                </div>
                <Switch
                  data-testid="switch-hubspot-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  disabled={!isConfigured && !accessToken}
                />
              </div>

              {isConfigured && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-good" />
                    <span>HubSpot is connected</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">What syncs from HubSpot:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Contacts and companies for supplier management</li>
                  <li>- Deal pipeline for demand signal integration</li>
                  <li>- Custom properties for enhanced analytics</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || !isConfigured}
            data-testid="button-test-hubspot"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending || !canSave}
            data-testid="button-save-hubspot"
          >
            {configureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
