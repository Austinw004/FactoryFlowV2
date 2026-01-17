import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Database } from "lucide-react";

interface SnowflakeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SnowflakeConfigDialog({ open, onOpenChange }: SnowflakeConfigDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    accountIdentifier: "",
    username: "",
    password: "",
    warehouse: "",
    database: "",
    schema: "",
    role: "",
    syncMaterials: true,
    syncForecasts: true,
    syncSuppliers: true,
    syncCommodities: true,
    syncRFQs: false,
  });

  const handleTestConnection = async () => {
    if (!config.accountIdentifier || !config.username || !config.password) {
      toast({
        title: "Missing credentials",
        description: "Please enter account identifier, username, and password",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      const response = await apiRequest("POST", "/api/integrations/snowflake/test", {
        accountIdentifier: config.accountIdentifier,
        username: config.username,
        password: config.password,
        warehouse: config.warehouse,
      });
      const data = await response.json();
      if (data.success) {
        setTestSuccess(true);
        toast({
          title: "Connection successful",
          description: "Snowflake connection verified",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Could not connect to Snowflake",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Snowflake",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/snowflake/configure", {
        ...config,
        enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "Configuration saved",
        description: "Snowflake integration has been configured",
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
      <DialogContent className="max-w-lg" data-testid="dialog-snowflake-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Configure Snowflake
          </DialogTitle>
          <DialogDescription>
            Connect your Snowflake data warehouse to export Prescient Labs data for advanced analytics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountIdentifier">Account Identifier</Label>
              <Input
                id="accountIdentifier"
                data-testid="input-account-identifier"
                placeholder="xy12345.us-east-1"
                value={config.accountIdentifier}
                onChange={(e) => setConfig({ ...config, accountIdentifier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Input
                id="warehouse"
                data-testid="input-warehouse"
                placeholder="COMPUTE_WH"
                value={config.warehouse}
                onChange={(e) => setConfig({ ...config, warehouse: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder="your_username"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="••••••••"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                data-testid="input-database"
                placeholder="PRESCIENT_DATA"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema">Schema</Label>
              <Input
                id="schema"
                data-testid="input-schema"
                placeholder="PUBLIC"
                value={config.schema}
                onChange={(e) => setConfig({ ...config, schema: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                data-testid="input-role"
                placeholder="ACCOUNTADMIN"
                value={config.role}
                onChange={(e) => setConfig({ ...config, role: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Export Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="syncMaterials" className="text-sm">Materials Catalog</Label>
                <Switch
                  id="syncMaterials"
                  data-testid="switch-materials"
                  checked={config.syncMaterials}
                  onCheckedChange={(checked) => setConfig({ ...config, syncMaterials: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncForecasts" className="text-sm">Demand Forecasts</Label>
                <Switch
                  id="syncForecasts"
                  data-testid="switch-forecasts"
                  checked={config.syncForecasts}
                  onCheckedChange={(checked) => setConfig({ ...config, syncForecasts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncSuppliers" className="text-sm">Supplier Data</Label>
                <Switch
                  id="syncSuppliers"
                  data-testid="switch-suppliers"
                  checked={config.syncSuppliers}
                  onCheckedChange={(checked) => setConfig({ ...config, syncSuppliers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncCommodities" className="text-sm">Commodity Prices</Label>
                <Switch
                  id="syncCommodities"
                  data-testid="switch-commodities"
                  checked={config.syncCommodities}
                  onCheckedChange={(checked) => setConfig({ ...config, syncCommodities: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncRFQs" className="text-sm">RFQ History</Label>
                <Switch
                  id="syncRFQs"
                  data-testid="switch-rfqs"
                  checked={config.syncRFQs}
                  onCheckedChange={(checked) => setConfig({ ...config, syncRFQs: checked })}
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
