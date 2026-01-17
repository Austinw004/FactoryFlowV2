import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Loader2 } from "lucide-react";

interface MailchimpConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailchimpConfigDialog({ open, onOpenChange }: MailchimpConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [serverPrefix, setServerPrefix] = useState("");
  const [defaultListId, setDefaultListId] = useState("");
  const [syncAudiences, setSyncAudiences] = useState(true);
  const [syncCampaigns, setSyncCampaigns] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/mailchimp/test", {
        apiKey,
        serverPrefix,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Mailchimp API credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/mailchimp/configure", {
        apiKey,
        serverPrefix,
        defaultListId,
        syncOptions: { syncAudiences, syncCampaigns },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mailchimp configured", description: "Integration saved successfully" });
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
            <Mail className="h-5 w-5 text-yellow-500" />
            Configure Mailchimp
          </DialogTitle>
          <DialogDescription>
            Connect Mailchimp for email marketing and supplier communications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mailchimp-api-key">API Key</Label>
            <Input
              id="mailchimp-api-key"
              type="password"
              placeholder="Enter your Mailchimp API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-mailchimp-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailchimp-server">Server Prefix</Label>
            <Input
              id="mailchimp-server"
              placeholder="e.g., us1, us2, eu1"
              value={serverPrefix}
              onChange={(e) => setServerPrefix(e.target.value)}
              data-testid="input-mailchimp-server"
            />
            <p className="text-xs text-muted-foreground">Found at the end of your API key (e.g., -us1)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailchimp-list">Default List ID (Optional)</Label>
            <Input
              id="mailchimp-list"
              placeholder="Enter default audience list ID"
              value={defaultListId}
              onChange={(e) => setDefaultListId(e.target.value)}
              data-testid="input-mailchimp-list"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="mailchimp-audiences">Sync audiences</Label>
            <Switch
              id="mailchimp-audiences"
              checked={syncAudiences}
              onCheckedChange={setSyncAudiences}
              data-testid="switch-mailchimp-audiences"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="mailchimp-campaigns">Sync campaigns</Label>
            <Switch
              id="mailchimp-campaigns"
              checked={syncCampaigns}
              onCheckedChange={setSyncCampaigns}
              data-testid="switch-mailchimp-campaigns"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !serverPrefix || testMutation.isPending}
            data-testid="button-mailchimp-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !serverPrefix || saveMutation.isPending}
            data-testid="button-mailchimp-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
