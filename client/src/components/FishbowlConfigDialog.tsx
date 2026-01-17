import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Loader2 } from "lucide-react";

interface FishbowlConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FishbowlConfigDialog({ open, onOpenChange }: FishbowlConfigDialogProps) {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncParts, setSyncParts] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/fishbowl/test", {
        serverUrl,
        username,
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Fishbowl credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/fishbowl/configure", {
        serverUrl,
        username,
        password,
        syncOptions: { syncInventory, syncParts },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Fishbowl configured", description: "Integration saved successfully" });
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
            <Package className="h-5 w-5 text-green-600" />
            Configure Fishbowl Inventory
          </DialogTitle>
          <DialogDescription>
            Connect to Fishbowl for inventory management and manufacturing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fishbowl-url">Server URL</Label>
            <Input
              id="fishbowl-url"
              placeholder="https://your-fishbowl-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              data-testid="input-fishbowl-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fishbowl-username">Username</Label>
            <Input
              id="fishbowl-username"
              placeholder="Enter your Fishbowl username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-fishbowl-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fishbowl-password">Password</Label>
            <Input
              id="fishbowl-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-fishbowl-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="fishbowl-inventory">Sync inventory levels</Label>
            <Switch
              id="fishbowl-inventory"
              checked={syncInventory}
              onCheckedChange={setSyncInventory}
              data-testid="switch-fishbowl-inventory"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="fishbowl-parts">Sync parts catalog</Label>
            <Switch
              id="fishbowl-parts"
              checked={syncParts}
              onCheckedChange={setSyncParts}
              data-testid="switch-fishbowl-parts"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!serverUrl || !username || !password || testMutation.isPending}
            data-testid="button-fishbowl-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!serverUrl || !username || !password || saveMutation.isPending}
            data-testid="button-fishbowl-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
