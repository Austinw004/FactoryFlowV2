import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface OPCUAConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OPCUAConfigDialog({ open, onOpenChange }: OPCUAConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [endpointUrl, setEndpointUrl] = useState("");
  const [securityMode, setSecurityMode] = useState("SignAndEncrypt");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncMachineData, setSyncMachineData] = useState(true);
  const [syncAlarms, setSyncAlarms] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/opc-ua/test", {
        endpointUrl,
        securityMode,
        username,
        password
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "OPC-UA server connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to OPC-UA server", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/opc-ua/configure", {
        endpointUrl,
        securityMode,
        username,
        password,
        syncOptions: { syncMachineData, syncAlarms }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "OPC-UA integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = endpointUrl && securityMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure OPC-UA</DialogTitle>
          <DialogDescription>
            Connect to industrial equipment via OPC-UA protocol for real-time machine data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opcua-url">Endpoint URL</Label>
            <Input
              id="opcua-url"
              data-testid="input-opcua-url"
              placeholder="opc.tcp://192.168.1.100:4840"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opcua-security">Security Mode</Label>
            <Select value={securityMode} onValueChange={setSecurityMode}>
              <SelectTrigger data-testid="select-opcua-security">
                <SelectValue placeholder="Select security mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Sign">Sign</SelectItem>
                <SelectItem value="SignAndEncrypt">Sign and Encrypt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opcua-username">Username (Optional)</Label>
            <Input
              id="opcua-username"
              data-testid="input-opcua-username"
              placeholder="OPC-UA username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opcua-password">Password (Optional)</Label>
            <Input
              id="opcua-password"
              data-testid="input-opcua-password"
              type="password"
              placeholder="OPC-UA password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Collection</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-machine" className="text-sm font-normal">Machine Data & Metrics</Label>
              <Switch id="sync-machine" checked={syncMachineData} onCheckedChange={setSyncMachineData} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-alarms" className="text-sm font-normal">Alarms & Events</Label>
              <Switch id="sync-alarms" checked={syncAlarms} onCheckedChange={setSyncAlarms} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-opcua-test"
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
              data-testid="button-opcua-save"
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
