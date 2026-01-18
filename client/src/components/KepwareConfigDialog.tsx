import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface KepwareConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KepwareConfigDialog({ open, onOpenChange }: KepwareConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [projectName, setProjectName] = useState("");
  const [syncTags, setSyncTags] = useState(true);
  const [syncDevices, setSyncDevices] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/kepware/test", {
        serverUrl,
        username,
        password,
        projectName
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "Kepware KEPServerEX connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to Kepware", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/kepware/configure", {
        serverUrl,
        username,
        password,
        projectName,
        syncOptions: { syncTags, syncDevices }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "Kepware integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = serverUrl && username && password;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Kepware KEPServerEX</DialogTitle>
          <DialogDescription>
            Connect to industrial automation systems via Kepware's connectivity platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kepware-url">Server URL</Label>
            <Input
              id="kepware-url"
              data-testid="input-kepware-url"
              placeholder="https://kepware-server:57412"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kepware-username">Username</Label>
            <Input
              id="kepware-username"
              data-testid="input-kepware-username"
              placeholder="Administrator"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kepware-password">Password</Label>
            <Input
              id="kepware-password"
              data-testid="input-kepware-password"
              type="password"
              placeholder="KEPServerEX password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kepware-project">Project Name (Optional)</Label>
            <Input
              id="kepware-project"
              data-testid="input-kepware-project"
              placeholder="Default project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Collection</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-tags" className="text-sm font-normal">Tag Data & Values</Label>
              <Switch id="sync-tags" checked={syncTags} onCheckedChange={setSyncTags} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-devices" className="text-sm font-normal">Device Status</Label>
              <Switch id="sync-devices" checked={syncDevices} onCheckedChange={setSyncDevices} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-kepware-test"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : testMutation.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              ) : testMutation.isError ? (
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
              ) : null}
              Test Connection
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isFormValid || saveMutation.isPending}
              className="flex-1"
              data-testid="button-kepware-save"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
