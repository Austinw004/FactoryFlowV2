import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Loader2 } from "lucide-react";

interface Project44ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Project44ConfigDialog({ open, onOpenChange }: Project44ConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [trackShipments, setTrackShipments] = useState(true);
  const [trackETA, setTrackETA] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/project44/test", {
        apiKey,
        clientId,
        clientSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "project44 credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/project44/configure", {
        apiKey,
        clientId,
        clientSecret,
        syncOptions: { trackShipments, trackETA },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "project44 configured", description: "Integration saved successfully" });
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
            <Truck className="h-5 w-5 text-blue-600" />
            Configure project44
          </DialogTitle>
          <DialogDescription>
            Connect to project44 for real-time supply chain visibility and tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="p44-api-key">API Key</Label>
            <Input
              id="p44-api-key"
              type="password"
              placeholder="Enter your project44 API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-p44-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p44-client-id">Client ID</Label>
            <Input
              id="p44-client-id"
              placeholder="Enter your OAuth client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="input-p44-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p44-client-secret">Client Secret</Label>
            <Input
              id="p44-client-secret"
              type="password"
              placeholder="Enter your client secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              data-testid="input-p44-client-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="p44-shipments">Track shipments</Label>
            <Switch
              id="p44-shipments"
              checked={trackShipments}
              onCheckedChange={setTrackShipments}
              data-testid="switch-p44-shipments"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="p44-eta">Track ETA predictions</Label>
            <Switch
              id="p44-eta"
              checked={trackETA}
              onCheckedChange={setTrackETA}
              data-testid="switch-p44-eta"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !clientId || !clientSecret || testMutation.isPending}
            data-testid="button-p44-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !clientId || !clientSecret || saveMutation.isPending}
            data-testid="button-p44-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
