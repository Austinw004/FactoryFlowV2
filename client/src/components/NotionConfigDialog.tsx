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
import { SiNotion } from "react-icons/si";

interface NotionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  notion?: {
    enabled: boolean;
    configured: boolean;
    workspaceId?: string;
    databaseId?: string;
  };
}

export function NotionConfigDialog({ open, onOpenChange }: NotionConfigDialogProps) {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.notion?.enabled ?? false);
      setWorkspaceId(status.notion?.workspaceId ?? "");
      setDatabaseId(status.notion?.databaseId ?? "");
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
    mutationFn: async (data: { accessToken?: string; workspaceId?: string; databaseId?: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/notion/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Notion Configured",
        description: "Your Notion integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Notion configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/notion/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: `Connected to Notion as ${data.user || "user"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Notion.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({
      accessToken: accessToken || undefined,
      workspaceId: workspaceId || undefined,
      databaseId: databaseId || undefined,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiNotion className="w-6 h-6" />
            Notion Integration
          </DialogTitle>
          <DialogDescription>
            Connect Notion to sync documentation, knowledge bases, and databases with your workflows.
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
                  Sync Notion databases with Prescient Labs
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-notion-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Integration Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="secret_xxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                data-testid="input-notion-access-token"
              />
              <p className="text-xs text-muted-foreground">
                Create an internal integration from Notion Settings → Integrations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID (Optional)</Label>
              <Input
                id="workspaceId"
                placeholder="Enter your Notion workspace ID"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                data-testid="input-notion-workspace-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="databaseId">Default Database ID (Optional)</Label>
              <Input
                id="databaseId"
                placeholder="Enter database ID for data sync"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                data-testid="input-notion-database-id"
              />
              <p className="text-xs text-muted-foreground">
                The database where supply chain data will be synced
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Create Internal Integration</p>
                  <p className="text-muted-foreground">
                    Create an internal integration and share the target pages/databases with it.
                  </p>
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Manage Notion integrations
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {status?.notion?.configured && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Notion is configured
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !status?.notion?.configured}
            data-testid="button-test-notion"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-notion"
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
