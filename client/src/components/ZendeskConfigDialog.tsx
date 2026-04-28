import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Loader2 } from "lucide-react";

interface ZendeskConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ZendeskConfigDialog({ open, onOpenChange }: ZendeskConfigDialogProps) {
  const { toast } = useToast();
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [syncTickets, setSyncTickets] = useState(true);
  const [syncUsers, setSyncUsers] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/zendesk/test", {
        subdomain,
        email,
        apiToken,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Zendesk credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/zendesk/configure", {
        subdomain,
        email,
        apiToken,
        syncOptions: { syncTickets, syncUsers },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Zendesk configured", description: "Integration saved successfully" });
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
            <Users className="h-5 w-5 text-good" />
            Configure Zendesk
          </DialogTitle>
          <DialogDescription>
            Connect Zendesk to leverage customer feedback as demand signals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="zendesk-subdomain">Subdomain</Label>
            <Input
              id="zendesk-subdomain"
              placeholder="yourcompany (from yourcompany.zendesk.com)"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              data-testid="input-zendesk-subdomain"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zendesk-email">Email</Label>
            <Input
              id="zendesk-email"
              type="email"
              placeholder="admin@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-zendesk-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zendesk-token">API Token</Label>
            <Input
              id="zendesk-token"
              type="password"
              placeholder="Enter your Zendesk API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              data-testid="input-zendesk-token"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="zendesk-tickets">Sync tickets</Label>
            <Switch
              id="zendesk-tickets"
              checked={syncTickets}
              onCheckedChange={setSyncTickets}
              data-testid="switch-zendesk-tickets"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="zendesk-users">Sync users</Label>
            <Switch
              id="zendesk-users"
              checked={syncUsers}
              onCheckedChange={setSyncUsers}
              data-testid="switch-zendesk-users"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!subdomain || !email || !apiToken || testMutation.isPending}
            data-testid="button-zendesk-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!subdomain || !email || !apiToken || saveMutation.isPending}
            data-testid="button-zendesk-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
