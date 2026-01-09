import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, ExternalLink, MessageSquare } from "lucide-react";

interface TeamsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  teams?: {
    enabled: boolean;
    configured: boolean;
    channel?: string;
  };
  slack: {
    enabled: boolean;
    configured: boolean;
    channel: string;
  };
  twilio: {
    enabled: boolean;
    configured: boolean;
  };
  hubspot: {
    enabled: boolean;
    configured: boolean;
  };
}

export function TeamsConfigDialog({ open, onOpenChange }: TeamsConfigDialogProps) {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("Prescient Alerts");
  const [enabled, setEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      if (status.teams) {
        setChannelName(status.teams.channel || "Prescient Alerts");
        setEnabled(status.teams.enabled);
      }
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { webhookUrl: string; channelName: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/teams/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Teams Configured",
        description: "Your Microsoft Teams integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Teams configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/teams/test");
      return res.json();
    },
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "A test message was sent to your Teams channel.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Could not connect to Teams.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message || "Could not test Teams connection.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!webhookUrl && !status?.teams?.configured) {
      toast({
        title: "Missing Webhook URL",
        description: "Please enter a Teams webhook URL.",
        variant: "destructive",
      });
      return;
    }
    // Only send webhookUrl if user entered a new one, otherwise send undefined to preserve existing
    configureMutation.mutate({ 
      webhookUrl: webhookUrl || undefined, 
      channelName, 
      enabled 
    });
  };

  const handleTest = () => {
    if (!status?.teams?.configured && !webhookUrl) {
      toast({
        title: "No Webhook URL",
        description: "Please save a Teams webhook URL first.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate();
  };

  const canSave = webhookUrl || status?.teams?.configured;
  const canTest = status?.teams?.configured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#6264A7]" />
            Microsoft Teams Integration
            {status?.teams?.configured && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </DialogTitle>
          <DialogDescription>
            Connect Prescient Labs to Microsoft Teams to receive real-time alerts for regime changes, stockout warnings, and supply chain events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="teams-webhook-url">Incoming Webhook URL</Label>
                <Input
                  id="teams-webhook-url"
                  data-testid="input-teams-webhook"
                  placeholder={status?.teams?.configured ? "Enter new URL to update (current is saved)" : "https://outlook.office.com/webhook/..."}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Create an incoming webhook in your Teams channel. Go to{" "}
                  <a
                    href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Microsoft Docs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-name">Channel Name (for display)</Label>
                <Input
                  id="channel-name"
                  data-testid="input-teams-channel"
                  placeholder="Prescient Alerts"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Teams Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn on/off Teams alerts without removing configuration
                  </p>
                </div>
                <Switch
                  data-testid="switch-teams-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {status?.teams?.configured && (
                <div className="rounded-md bg-[#6264A7]/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#6264A7]" />
                    <span>Teams is connected to {status.teams.channel || "your channel"}</span>
                  </div>
                </div>
              )}

              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Alert Types</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>- Economic regime change notifications</li>
                  <li>- Stockout and inventory warnings</li>
                  <li>- Supplier risk alerts</li>
                  <li>- Commodity price movement alerts</li>
                  <li>- S&OP meeting reminders</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || !canTest}
            data-testid="button-test-teams"
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
            data-testid="button-save-teams"
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
