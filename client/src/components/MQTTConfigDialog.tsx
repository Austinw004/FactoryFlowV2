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

interface MQTTConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MQTTConfigDialog({ open, onOpenChange }: MQTTConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [brokerUrl, setBrokerUrl] = useState("");
  const [port, setPort] = useState("1883");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useTLS, setUseTLS] = useState(false);
  const [subscribeSensors, setSubscribeSensors] = useState(true);
  const [subscribeAlerts, setSubscribeAlerts] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/mqtt/test", {
        brokerUrl,
        port: parseInt(port),
        username,
        password,
        useTLS
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "MQTT broker connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to MQTT broker", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/mqtt/configure", {
        brokerUrl,
        port: parseInt(port),
        username,
        password,
        useTLS,
        syncOptions: { subscribeSensors, subscribeAlerts }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "MQTT integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = brokerUrl && port;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure MQTT Broker</DialogTitle>
          <DialogDescription>
            Connect to IoT devices and sensors via MQTT messaging protocol
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mqtt-url">Broker URL</Label>
            <Input
              id="mqtt-url"
              data-testid="input-mqtt-url"
              placeholder="mqtt.example.com"
              value={brokerUrl}
              onChange={(e) => setBrokerUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mqtt-port">Port</Label>
            <Input
              id="mqtt-port"
              data-testid="input-mqtt-port"
              placeholder="1883"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mqtt-username">Username (Optional)</Label>
            <Input
              id="mqtt-username"
              data-testid="input-mqtt-username"
              placeholder="MQTT username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mqtt-password">Password (Optional)</Label>
            <Input
              id="mqtt-password"
              data-testid="input-mqtt-password"
              type="password"
              placeholder="MQTT password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="use-tls" className="text-sm font-normal">Use TLS/SSL</Label>
            <Switch id="use-tls" checked={useTLS} onCheckedChange={setUseTLS} />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Subscriptions</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sub-sensors" className="text-sm font-normal">Sensor Data Topics</Label>
              <Switch id="sub-sensors" checked={subscribeSensors} onCheckedChange={setSubscribeSensors} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sub-alerts" className="text-sm font-normal">Alert Topics</Label>
              <Switch id="sub-alerts" checked={subscribeAlerts} onCheckedChange={setSubscribeAlerts} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-mqtt-test"
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
              data-testid="button-mqtt-save"
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
