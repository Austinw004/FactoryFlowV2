import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Loader2 } from "lucide-react";

interface SendGridConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendGridConfigDialog({ open, onOpenChange }: SendGridConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [enableTracking, setEnableTracking] = useState(true);
  const [enableBounceHandling, setEnableBounceHandling] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sendgrid/test", {
        apiKey,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "SendGrid API key verified" });
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
      const response = await apiRequest("POST", "/api/integrations/sendgrid/configure", {
        apiKey,
        fromEmail,
        fromName,
        syncOptions: { enableTracking, enableBounceHandling },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "SendGrid configured", description: "Integration saved successfully" });
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
            <Send className="h-5 w-5 text-blue-500" />
            Configure SendGrid
          </DialogTitle>
          <DialogDescription>
            Connect SendGrid for reliable transactional email delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sendgrid-api-key">API Key</Label>
            <Input
              id="sendgrid-api-key"
              type="password"
              placeholder="Enter your SendGrid API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-sendgrid-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendgrid-from-email">From Email</Label>
            <Input
              id="sendgrid-from-email"
              type="email"
              placeholder="noreply@yourcompany.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              data-testid="input-sendgrid-from-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendgrid-from-name">From Name</Label>
            <Input
              id="sendgrid-from-name"
              placeholder="Your Company Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              data-testid="input-sendgrid-from-name"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sendgrid-tracking">Enable email tracking</Label>
            <Switch
              id="sendgrid-tracking"
              checked={enableTracking}
              onCheckedChange={setEnableTracking}
              data-testid="switch-sendgrid-tracking"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sendgrid-bounce">Enable bounce handling</Label>
            <Switch
              id="sendgrid-bounce"
              checked={enableBounceHandling}
              onCheckedChange={setEnableBounceHandling}
              data-testid="switch-sendgrid-bounce"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || testMutation.isPending}
            data-testid="button-sendgrid-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || saveMutation.isPending}
            data-testid="button-sendgrid-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
