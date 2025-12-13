import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface SlackConfigDialogProps {
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
  };
  hubspot: {
    enabled: boolean;
    configured: boolean;
  };
}

export function SlackConfigDialog({ open, onOpenChange }: SlackConfigDialogProps) {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [defaultChannel, setDefaultChannel] = useState("#prescient-alerts");
  const [enabled, setEnabled] = useState(true);

  const { data: status } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  const configureMutation = useMutation({
    mutationFn: async (data: { webhookUrl: string; defaultChannel: string; enabled: boolean }) => {
      return apiRequest("/api/integrations/slack/configure", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Slack Configured",
        description: "Your Slack integration has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Slack configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/integrations/slack/test", {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "A test message was sent to your Slack channel.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Could not connect to Slack.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Could not test Slack connection.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({ webhookUrl, defaultChannel, enabled });
  };

  const handleTest = () => {
    if (!status?.slack.configured && !webhookUrl) {
      toast({
        title: "No Webhook URL",
        description: "Please enter a Slack webhook URL first.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Slack Integration
            {status?.slack.configured && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </DialogTitle>
          <DialogDescription>
            Connect Prescient Labs to Slack to receive real-time alerts for regime changes, stockout warnings, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              data-testid="input-slack-webhook"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your webhook URL from{" "}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Slack App Settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-channel">Default Channel</Label>
            <Input
              id="default-channel"
              data-testid="input-slack-channel"
              placeholder="#prescient-alerts"
              value={defaultChannel}
              onChange={(e) => setDefaultChannel(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Slack Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Turn on/off Slack alerts without removing configuration
              </p>
            </div>
            <Switch
              data-testid="switch-slack-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {status?.slack.configured && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Slack is connected to {status.slack.channel}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || (!status?.slack.configured && !webhookUrl)}
            data-testid="button-test-slack"
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
            disabled={configureMutation.isPending || !webhookUrl}
            data-testid="button-save-slack"
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
