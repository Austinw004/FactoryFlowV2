import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Loader2 } from "lucide-react";

interface TeamcenterConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamcenterConfigDialog({ open, onOpenChange }: TeamcenterConfigDialogProps) {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncBOM, setSyncBOM] = useState(true);
  const [syncChanges, setSyncChanges] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/teamcenter/test", {
        serverUrl,
        username,
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Siemens Teamcenter credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/teamcenter/configure", {
        serverUrl,
        username,
        password,
        syncOptions: { syncBOM, syncChanges },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Siemens Teamcenter configured", description: "Integration saved successfully" });
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
            <Settings className="h-5 w-5 text-teal-600" />
            Configure Siemens Teamcenter
          </DialogTitle>
          <DialogDescription>
            Connect to Siemens Teamcenter for product lifecycle management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teamcenter-url">Server URL</Label>
            <Input
              id="teamcenter-url"
              placeholder="https://your-teamcenter-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              data-testid="input-teamcenter-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamcenter-username">Username</Label>
            <Input
              id="teamcenter-username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-teamcenter-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamcenter-password">Password</Label>
            <Input
              id="teamcenter-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-teamcenter-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="teamcenter-bom">Sync BOM data</Label>
            <Switch
              id="teamcenter-bom"
              checked={syncBOM}
              onCheckedChange={setSyncBOM}
              data-testid="switch-teamcenter-bom"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="teamcenter-changes">Sync engineering changes</Label>
            <Switch
              id="teamcenter-changes"
              checked={syncChanges}
              onCheckedChange={setSyncChanges}
              data-testid="switch-teamcenter-changes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!serverUrl || !username || !password || testMutation.isPending}
            data-testid="button-teamcenter-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!serverUrl || !username || !password || saveMutation.isPending}
            data-testid="button-teamcenter-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
