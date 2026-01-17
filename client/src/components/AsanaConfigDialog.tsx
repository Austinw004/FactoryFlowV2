import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, ListTodo } from "lucide-react";

interface AsanaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AsanaConfigDialog({ open, onOpenChange }: AsanaConfigDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    accessToken: "",
    workspaceGid: "",
    defaultProjectGid: "",
    syncTasks: true,
    syncSupplierTasks: true,
    syncMaintenanceTasks: false,
    autoCreateSubtasks: true,
  });

  const handleTestConnection = async () => {
    if (!config.accessToken) {
      toast({
        title: "Missing access token",
        description: "Please enter your Asana personal access token",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      const response = await apiRequest("POST", "/api/integrations/asana/test", {
        accessToken: config.accessToken,
      });
      const data = await response.json();
      if (data.success) {
        setTestSuccess(true);
        toast({
          title: "Connection successful",
          description: data.message || "Asana connection verified",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Could not connect to Asana",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Asana",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/asana/configure", {
        ...config,
        enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "Configuration saved",
        description: "Asana integration has been configured",
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
      <DialogContent className="max-w-lg" data-testid="dialog-asana-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-pink-500" />
            Configure Asana
          </DialogTitle>
          <DialogDescription>
            Connect Asana to manage procurement and operations tasks.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">Personal Access Token</Label>
            <Input
              id="accessToken"
              data-testid="input-access-token"
              type="password"
              placeholder="Your Asana personal access token"
              value={config.accessToken}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Generate a token at Asana &gt; My Settings &gt; Apps &gt; Developer Apps
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceGid">Workspace GID</Label>
              <Input
                id="workspaceGid"
                data-testid="input-workspace-gid"
                placeholder="1234567890123456"
                value={config.workspaceGid}
                onChange={(e) => setConfig({ ...config, workspaceGid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultProjectGid">Default Project GID</Label>
              <Input
                id="defaultProjectGid"
                data-testid="input-project-gid"
                placeholder="1234567890123456"
                value={config.defaultProjectGid}
                onChange={(e) => setConfig({ ...config, defaultProjectGid: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Task Sync Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="syncTasks" className="text-sm">Procurement Tasks</Label>
                  <p className="text-xs text-muted-foreground">Create tasks for RFQs and POs</p>
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
                  <Label htmlFor="syncSupplierTasks" className="text-sm">Supplier Tasks</Label>
                  <p className="text-xs text-muted-foreground">Track supplier issues and reviews</p>
                </div>
                <Switch
                  id="syncSupplierTasks"
                  data-testid="switch-supplier-tasks"
                  checked={config.syncSupplierTasks}
                  onCheckedChange={(checked) => setConfig({ ...config, syncSupplierTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="syncMaintenanceTasks" className="text-sm">Maintenance Tasks</Label>
                  <p className="text-xs text-muted-foreground">Sync machinery maintenance schedules</p>
                </div>
                <Switch
                  id="syncMaintenanceTasks"
                  data-testid="switch-maintenance-tasks"
                  checked={config.syncMaintenanceTasks}
                  onCheckedChange={(checked) => setConfig({ ...config, syncMaintenanceTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoCreateSubtasks" className="text-sm">Auto-Create Subtasks</Label>
                  <p className="text-xs text-muted-foreground">Break down complex tasks automatically</p>
                </div>
                <Switch
                  id="autoCreateSubtasks"
                  data-testid="switch-auto-subtasks"
                  checked={config.autoCreateSubtasks}
                  onCheckedChange={(checked) => setConfig({ ...config, autoCreateSubtasks: checked })}
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
