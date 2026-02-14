import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, TrendingUp, DollarSign, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FdrAlert, CommodityPriceAlert } from "@shared/schema";

interface AlertsConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertsConfig({ open, onOpenChange }: AlertsConfigProps) {
  const { toast } = useToast();
  const [showCreateFdr, setShowCreateFdr] = useState(false);
  const [showCreateCommodity, setShowCreateCommodity] = useState(false);

  const { data: fdrAlerts, isLoading: fdrLoading } = useQuery<FdrAlert[]>({
    queryKey: ['/api/fdr-alerts'],
    enabled: open,
  });

  const { data: commodityAlerts, isLoading: commodityLoading } = useQuery<CommodityPriceAlert[]>({
    queryKey: ['/api/commodity-price-alerts'],
    enabled: open,
  });

  const { data: materials } = useQuery<any[]>({
    queryKey: ['/api/materials'],
    enabled: open && showCreateCommodity,
  });

  const createFdrAlertMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/fdr-alerts', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fdr-alerts'] });
      toast({
        title: "Alert Created",
        description: "FDR alert has been configured successfully",
      });
      setShowCreateFdr(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCommodityAlertMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/commodity-price-alerts', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commodity-price-alerts'] });
      toast({
        title: "Alert Created",
        description: "Commodity price alert has been configured successfully",
      });
      setShowCreateCommodity(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFdrAlertMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const response = await apiRequest('PATCH', `/api/fdr-alerts/${id}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fdr-alerts'] });
    },
  });

  const toggleCommodityAlertMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const response = await apiRequest('PATCH', `/api/commodity-price-alerts/${id}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commodity-price-alerts'] });
    },
  });

  const deleteFdrAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/fdr-alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fdr-alerts'] });
      toast({
        title: "Alert Deleted",
        description: "FDR alert has been removed",
      });
    },
  });

  const deleteCommodityAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/commodity-price-alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commodity-price-alerts'] });
      toast({
        title: "Alert Deleted",
        description: "Commodity alert has been removed",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" data-testid="dialog-alerts-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <Bell className="h-5 w-5" />
            Configure Alerts
          </DialogTitle>
          <DialogDescription>
            Set up smart alerts to monitor FDR thresholds and commodity price changes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fdr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fdr" data-testid="tab-fdr-alerts">
              <TrendingUp className="h-4 w-4 mr-2" />
              FDR Alerts ({fdrAlerts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="commodity" data-testid="tab-commodity-alerts">
              <DollarSign className="h-4 w-4 mr-2" />
              Commodity Alerts ({commodityAlerts?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fdr" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Get notified when FDR crosses critical thresholds
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreateFdr(!showCreateFdr)}
                data-testid="button-create-fdr-alert"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Alert
              </Button>
            </div>

            {showCreateFdr && (
              <FdrAlertForm
                onSubmit={(data) => createFdrAlertMutation.mutate(data)}
                onCancel={() => setShowCreateFdr(false)}
                isPending={createFdrAlertMutation.isPending}
              />
            )}

            <div className="space-y-3">
              {fdrLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : fdrAlerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-fdr-alerts">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No FDR alerts configured</p>
                  <p className="text-sm mt-1">Create an alert to monitor regime changes</p>
                </div>
              ) : (
                fdrAlerts?.map(alert => (
                  <Card key={alert.id} data-testid={`card-fdr-alert-${alert.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold" data-testid={`text-alert-name-${alert.id}`}>
                              {alert.name}
                            </h4>
                            <Badge variant={alert.isActive ? 'default' : 'secondary'} data-testid={`badge-status-${alert.id}`}>
                              {alert.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-condition-${alert.id}`}>
                            Alert when FDR {alert.condition.replace('_', ' ')} {alert.threshold}
                          </p>
                          {alert.lastTriggered && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-last-triggered-${alert.id}`}>
                              Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={alert.isActive === 1}
                            onCheckedChange={(checked) => 
                              toggleFdrAlertMutation.mutate({ id: alert.id, isActive: checked ? 1 : 0 })
                            }
                            data-testid={`switch-active-${alert.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteFdrAlertMutation.mutate(alert.id)}
                            disabled={deleteFdrAlertMutation.isPending}
                            data-testid={`button-delete-${alert.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="commodity" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Monitor commodity prices and get alerted on significant changes
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreateCommodity(!showCreateCommodity)}
                data-testid="button-create-commodity-alert"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Alert
              </Button>
            </div>

            {showCreateCommodity && (
              <CommodityAlertForm
                materials={materials || []}
                onSubmit={(data) => createCommodityAlertMutation.mutate(data)}
                onCancel={() => setShowCreateCommodity(false)}
                isPending={createCommodityAlertMutation.isPending}
              />
            )}

            <div className="space-y-3">
              {commodityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : commodityAlerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-commodity-alerts">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No commodity alerts configured</p>
                  <p className="text-sm mt-1">Create an alert to monitor price changes</p>
                </div>
              ) : (
                commodityAlerts?.map(alert => (
                  <Card key={alert.id} data-testid={`card-commodity-alert-${alert.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold" data-testid={`text-alert-name-${alert.id}`}>
                              {alert.name}
                            </h4>
                            <Badge variant={alert.isActive ? 'default' : 'secondary'} data-testid={`badge-status-${alert.id}`}>
                              {alert.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-condition-${alert.id}`}>
                            Alert when price {alert.condition === 'change_pct' ? `changes by ${alert.changePercentage}%` : `${alert.condition} $${alert.threshold}`}
                            {alert.timeframe && ` (${alert.timeframe})`}
                          </p>
                          {alert.lastTriggered && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-last-triggered-${alert.id}`}>
                              Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={alert.isActive === 1}
                            onCheckedChange={(checked) => 
                              toggleCommodityAlertMutation.mutate({ id: alert.id, isActive: checked ? 1 : 0 })
                            }
                            data-testid={`switch-active-${alert.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCommodityAlertMutation.mutate(alert.id)}
                            disabled={deleteCommodityAlertMutation.isPending}
                            data-testid={`button-delete-${alert.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function FdrAlertForm({ onSubmit, onCancel, isPending }: { onSubmit: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('above');
  const [threshold, setThreshold] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      condition,
      threshold: parseFloat(threshold),
      isActive: 1,
      notificationMethod: 'in_app',
    });
  };

  return (
    <Card data-testid="form-create-fdr-alert">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Create FDR Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-name">Alert Name *</Label>
            <Input
              id="alert-name"
              placeholder="e.g., Regime Transition Alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-alert-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition" data-testid="select-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="crosses_above">Crosses Above</SelectItem>
                  <SelectItem value="crosses_below">Crosses Below</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold *</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                placeholder="e.g., 1.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                data-testid="input-threshold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Alert
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CommodityAlertForm({ materials, onSubmit, onCancel, isPending }: { materials: any[]; onSubmit: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [name, setName] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [condition, setCondition] = useState('above');
  const [threshold, setThreshold] = useState('');
  const [changePercentage, setChangePercentage] = useState('');
  const [timeframe, setTimeframe] = useState('daily');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      materialId,
      condition,
      threshold: condition !== 'change_pct' ? parseFloat(threshold) : undefined,
      changePercentage: condition === 'change_pct' ? parseFloat(changePercentage) : undefined,
      timeframe: condition === 'change_pct' ? timeframe : undefined,
      isActive: 1,
      notificationMethod: 'in_app',
    });
  };

  return (
    <Card data-testid="form-create-commodity-alert">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Create Commodity Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commodity-alert-name">Alert Name *</Label>
            <Input
              id="commodity-alert-name"
              placeholder="e.g., Steel Price Alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-alert-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">Material *</Label>
            <Select value={materialId} onValueChange={setMaterialId} required>
              <SelectTrigger id="material" data-testid="select-material">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map(material => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name} ({material.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commodity-condition">Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="commodity-condition" data-testid="select-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price Above</SelectItem>
                <SelectItem value="below">Price Below</SelectItem>
                <SelectItem value="change_pct">Price Change %</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {condition === 'change_pct' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="change-percentage">Change % *</Label>
                <Input
                  id="change-percentage"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 10"
                  value={changePercentage}
                  onChange={(e) => setChangePercentage(e.target.value)}
                  required
                  data-testid="input-change-percentage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe *</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe" data-testid="select-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="commodity-threshold">Price Threshold ($) *</Label>
              <Input
                id="commodity-threshold"
                type="number"
                step="0.01"
                placeholder="e.g., 1500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                data-testid="input-threshold"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Alert
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
