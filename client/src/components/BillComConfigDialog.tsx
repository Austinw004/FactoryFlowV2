import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Loader2 } from "lucide-react";

interface BillComConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillComConfigDialog({ open, onOpenChange }: BillComConfigDialogProps) {
  const { toast } = useToast();
  const [developerKey, setDeveloperKey] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [syncPayables, setSyncPayables] = useState(true);
  const [syncReceivables, setSyncReceivables] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/billcom/test", {
        developerKey,
        userName,
        password,
        orgId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Bill.com credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/billcom/configure", {
        developerKey,
        userName,
        password,
        orgId,
        environment,
        syncOptions: { syncPayables, syncReceivables },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Bill.com configured", description: "Integration saved successfully" });
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
            <DollarSign className="h-5 w-5 text-green-500" />
            Configure Bill.com
          </DialogTitle>
          <DialogDescription>
            Connect to Bill.com for AP/AR automation and payment processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="billcom-devkey">Developer Key</Label>
            <Input
              id="billcom-devkey"
              type="password"
              placeholder="Enter your Bill.com developer key"
              value={developerKey}
              onChange={(e) => setDeveloperKey(e.target.value)}
              data-testid="input-billcom-devkey"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billcom-username">Username</Label>
            <Input
              id="billcom-username"
              placeholder="Enter your Bill.com username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              data-testid="input-billcom-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billcom-password">Password</Label>
            <Input
              id="billcom-password"
              type="password"
              placeholder="Enter your Bill.com password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-billcom-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billcom-org">Organization ID</Label>
            <Input
              id="billcom-org"
              placeholder="Enter your organization ID"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              data-testid="input-billcom-org"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billcom-env">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger id="billcom-env" data-testid="select-billcom-env">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="billcom-payables">Sync accounts payable</Label>
            <Switch
              id="billcom-payables"
              checked={syncPayables}
              onCheckedChange={setSyncPayables}
              data-testid="switch-billcom-payables"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="billcom-receivables">Sync accounts receivable</Label>
            <Switch
              id="billcom-receivables"
              checked={syncReceivables}
              onCheckedChange={setSyncReceivables}
              data-testid="switch-billcom-receivables"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!developerKey || !userName || !password || testMutation.isPending}
            data-testid="button-billcom-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!developerKey || !userName || !password || saveMutation.isPending}
            data-testid="button-billcom-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
