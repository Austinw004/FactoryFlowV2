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
import { SiLinear } from "react-icons/si";

interface LinearConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  linear?: {
    enabled: boolean;
    configured: boolean;
    teamId?: string;
  };
}

export function LinearConfigDialog({ open, onOpenChange }: LinearConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.linear?.enabled ?? false);
      setTeamId(status.linear?.teamId ?? "");
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setApiKey("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { apiKey?: string; teamId?: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/linear/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Linear Configured",
        description: "Your Linear integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Linear configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/linear/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: `Connected to Linear as ${data.user || "user"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Linear.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({
      apiKey: apiKey || undefined,
      teamId: teamId || undefined,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiLinear className="w-6 h-6" />
            Linear Integration
          </DialogTitle>
          <DialogDescription>
            Connect Linear to sync project tracking and issue management with supply chain workflows.
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
                  Sync Linear issues with Prescient Labs
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-linear-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="lin_api_xxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-linear-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Generate from Linear Settings → API → Personal API keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamId">Default Team ID (Optional)</Label>
              <Input
                id="teamId"
                placeholder="Enter your Linear team ID"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                data-testid="input-linear-team-id"
              />
              <p className="text-xs text-muted-foreground">
                The team where supply chain issues will be created
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-signal mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Personal API Key</p>
                  <p className="text-muted-foreground">
                    Create a personal API key from your Linear workspace settings.
                  </p>
                  <a
                    href="https://linear.app/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Go to Linear API settings
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {status?.linear?.configured && (
              <div className="flex items-center gap-2 text-sm text-good">
                <CheckCircle className="w-4 h-4" />
                Linear is configured
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !status?.linear?.configured}
            data-testid="button-test-linear"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-linear"
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
