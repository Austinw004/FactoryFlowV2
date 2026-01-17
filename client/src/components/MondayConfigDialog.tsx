import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, LayoutGrid } from "lucide-react";

interface MondayConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MondayConfigDialog({ open, onOpenChange }: MondayConfigDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    apiToken: "",
    workspaceId: "",
    defaultBoardId: "",
    syncTasks: true,
    syncSupplierIssues: true,
    syncProcurementTasks: false,
    createUpdates: true,
  });

  const handleTestConnection = async () => {
    if (!config.apiToken) {
      toast({
        title: "Missing API token",
        description: "Please enter your Monday.com API token",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      const response = await apiRequest("POST", "/api/integrations/monday/test", {
        apiToken: config.apiToken,
      });
      const data = await response.json();
      if (data.success) {
        setTestSuccess(true);
        toast({
          title: "Connection successful",
          description: data.message || "Monday.com connection verified",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Could not connect to Monday.com",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Monday.com",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/monday/configure", {
        ...config,
        enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "Configuration saved",
        description: "Monday.com integration has been configured",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-monday-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-red-500" />
            Configure Monday.com
          </DialogTitle>
          <DialogDescription>
            Connect Monday.com to track procurement tasks and supplier issues.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              data-testid="input-api-token"
              type="password"
              placeholder="Your Monday.com API token"
              value={config.apiToken}
              onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Find your API token in Monday.com &gt; Account &gt; Developer &gt; My Access Tokens
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID (Optional)</Label>
              <Input
                id="workspaceId"
                data-testid="input-workspace-id"
                placeholder="123456"
                value={config.workspaceId}
                onChange={(e) => setConfig({ ...config, workspaceId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultBoardId">Default Board ID</Label>
              <Input
                id="defaultBoardId"
                data-testid="input-board-id"
                placeholder="789012"
                value={config.defaultBoardId}
                onChange={(e) => setConfig({ ...config, defaultBoardId: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="syncTasks" className="text-sm">Sync Tasks</Label>
                  <p className="text-xs text-muted-foreground">Create items for procurement tasks</p>
                </div>
                <Switch
                  id="syncTasks"
                  data-testid="switch-sync-tasks"
                  checked={config.syncTasks}
                  onCheckedChange={(checked) => setConfig({ ...config, syncTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="syncSupplierIssues" className="text-sm">Supplier Issues</Label>
                  <p className="text-xs text-muted-foreground">Track supplier risk alerts</p>
                </div>
                <Switch
                  id="syncSupplierIssues"
                  data-testid="switch-supplier-issues"
                  checked={config.syncSupplierIssues}
                  onCheckedChange={(checked) => setConfig({ ...config, syncSupplierIssues: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="syncProcurementTasks" className="text-sm">Procurement Tasks</Label>
                  <p className="text-xs text-muted-foreground">Sync RFQ and PO tasks</p>
                </div>
                <Switch
                  id="syncProcurementTasks"
                  data-testid="switch-procurement-tasks"
                  checked={config.syncProcurementTasks}
                  onCheckedChange={(checked) => setConfig({ ...config, syncProcurementTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="createUpdates" className="text-sm">Create Updates</Label>
                  <p className="text-xs text-muted-foreground">Post updates on status changes</p>
                </div>
                <Switch
                  id="createUpdates"
                  data-testid="switch-create-updates"
                  checked={config.createUpdates}
                  onCheckedChange={(checked) => setConfig({ ...config, createUpdates: checked })}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            data-testid="button-test-connection"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : testSuccess ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : null}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
