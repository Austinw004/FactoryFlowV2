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
import { SiJira } from "react-icons/si";

interface JiraConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  jira?: {
    enabled: boolean;
    configured: boolean;
    domain?: string;
    projectKey?: string;
  };
}

export function JiraConfigDialog({ open, onOpenChange }: JiraConfigDialogProps) {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.jira?.enabled ?? false);
      setDomain(status.jira?.domain ?? "");
      setProjectKey(status.jira?.projectKey ?? "");
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setApiToken("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { domain?: string; apiToken?: string; projectKey?: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/jira/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Jira Configured",
        description: "Your Jira integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Jira configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/jira/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: `Connected to Jira as ${data.user || "user"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Jira.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({
      domain: domain || undefined,
      apiToken: apiToken || undefined,
      projectKey: projectKey || undefined,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiJira className="w-6 h-6 text-[#0052CC]" />
            Jira Integration
          </DialogTitle>
          <DialogDescription>
            Connect Jira to sync project issues and track supply chain-related tasks.
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
                  Sync Jira issues with Prescient Labs
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-jira-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Jira Domain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="domain"
                  placeholder="yourcompany"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  data-testid="input-jira-domain"
                />
                <span className="text-muted-foreground text-sm">.atlassian.net</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Jira Cloud workspace name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Enter your Jira API token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                data-testid="input-jira-api-token"
              />
              <p className="text-xs text-muted-foreground">
                Generate from Atlassian Account Settings → Security → API tokens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectKey">Default Project Key (Optional)</Label>
              <Input
                id="projectKey"
                placeholder="e.g., SUPPLY, PROC, MFG"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
                data-testid="input-jira-project-key"
              />
              <p className="text-xs text-muted-foreground">
                The project where supply chain issues will be created
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-signal mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">API Token Required</p>
                  <p className="text-muted-foreground">
                    You'll need to create an API token from your Atlassian account.
                  </p>
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Create API token
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {status?.jira?.configured && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Jira is configured
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !status?.jira?.configured}
            data-testid="button-test-jira"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-jira"
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
