import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Radio, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Gauge
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function PredictiveMaintenance() {
  const { toast } = useToast();
  const [openSensorDialog, setOpenSensorDialog] = useState(false);

  const { data: sensors = [] as any[], isLoading: sensorsLoading } = useQuery<any[]>({
    queryKey: ["/api/predictive-maintenance/sensors"],
  });

  const { data: alerts = [] as any[], isLoading: alertsLoading } = useQuery<any[]>({
    queryKey: ["/api/predictive-maintenance/alerts"],
  });

  const { data: predictions = [] as any[], isLoading: predictionsLoading } = useQuery<any[]>({
    queryKey: ["/api/predictive-maintenance/predictions"],
  });

  const { data: machinery = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/machinery"],
  });

  const { data: regime } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  const createSensorMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("POST", "/api/predictive-maintenance/sensors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictive-maintenance/sensors"] });
      toast({ title: "Sensor created successfully" });
      setOpenSensorDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to create sensor", 
        variant: "destructive" 
      });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) =>
      apiRequest("PATCH", `/api/predictive-maintenance/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictive-maintenance/alerts"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) =>
      apiRequest("PATCH", `/api/predictive-maintenance/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictive-maintenance/alerts"] });
      toast({ title: "Alert resolved" });
    },
  });

  const handleCreateSensor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSensorMutation.mutate({
      machineryId: formData.get("machineryId"),
      sensorType: formData.get("sensorType"),
      sensorId: formData.get("sensorId"),
      location: formData.get("location"),
      unit: formData.get("unit"),
      normalMin: parseFloat(formData.get("normalMin") as string),
      normalMax: parseFloat(formData.get("normalMax") as string),
      warningMin: parseFloat(formData.get("warningMin") as string),
      warningMax: parseFloat(formData.get("warningMax") as string),
      criticalMin: parseFloat(formData.get("criticalMin") as string),
      criticalMax: parseFloat(formData.get("criticalMax") as string),
    });
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { variant: "destructive" as const, label: "Critical" },
      high: { variant: "destructive" as const, label: "High", className: "bg-orange-600" },
      medium: { variant: "default" as const, label: "Medium", className: "bg-yellow-600" },
      low: { variant: "secondary" as const, label: "Low" },
    };
    const c = config[severity as keyof typeof config] || config.medium;
    return <Badge variant={c.variant} className={(c as any).className}>{c.label}</Badge>;
  };

  const getRegimeBadge = (regimeName: string) => {
    const regimeConfig = {
      HEALTHY_EXPANSION: { className: "bg-green-600", label: "Healthy Expansion" },
      ASSET_LED_GROWTH: { className: "bg-orange-600", label: "Asset-Led Growth" },
      IMBALANCED_EXCESS: { className: "bg-red-600", label: "Imbalanced Excess" },
      REAL_ECONOMY_LEAD: { className: "bg-blue-600", label: "Real Economy Lead" },
    };
    const config = regimeConfig[regimeName as keyof typeof regimeConfig] || { className: "", label: regimeName };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const activeSensors = sensors.filter((s: any) => s.status === "active").length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical" && a.status === "active").length;
  const avgConfidence = predictions.length > 0 
    ? predictions.reduce((acc: number, p: any) => acc + p.confidence, 0) / predictions.length 
    : 0;

  const getRegimeMaintenanceGuidance = () => {
    if (!regime) return null;
    const guidance: Record<string, string> = {
      HEALTHY_EXPANSION: "Optimal time for proactive maintenance investments. Consider upgrading equipment.",
      ASSET_LED_GROWTH: "Balance maintenance costs carefully. Focus on critical equipment only.",
      IMBALANCED_EXCESS: "Defer non-critical maintenance. Prepare for potential downturn.",
      REAL_ECONOMY_LEAD: "Increase maintenance frequency to support high production demand.",
    };
    return guidance[regime.regime] || "Monitor regime changes for maintenance planning.";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-predictive-maintenance">
            <Radio className="h-8 w-8" />
            Predictive Maintenance & IoT Sensors
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time sensor monitoring, ML-based failure predictions, and regime-aware maintenance scheduling
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-fdr">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Sensors</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-active-sensors">
              {activeSensors}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {sensors.length} total sensors deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Critical Alerts</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-critical-alerts">
              {criticalAlerts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {alerts.filter((a: any) => a.status === "active").length} total active alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Prediction Confidence</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-avg-confidence">
              {avgConfidence.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {predictions.length} active predictions
            </p>
          </CardContent>
        </Card>
      </div>

      {regime && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Regime-Aware Maintenance Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{getRegimeMaintenanceGuidance()}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="sensors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sensors" data-testid="tab-sensors">
            <Gauge className="h-4 w-4 mr-2" />
            Sensors
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Equipment Sensors</h2>
            <Dialog open={openSensorDialog} onOpenChange={setOpenSensorDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-sensor">
                  <Radio className="h-4 w-4 mr-2" />
                  Add Sensor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Equipment Sensor</DialogTitle>
                  <DialogDescription>
                    Configure a new IoT sensor for equipment monitoring
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSensor}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="machineryId">Equipment</Label>
                      <Select name="machineryId" required>
                        <SelectTrigger data-testid="select-machinery">
                          <SelectValue placeholder="Select machinery" />
                        </SelectTrigger>
                        <SelectContent>
                          {machinery.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sensorType">Sensor Type</Label>
                      <Select name="sensorType" required>
                        <SelectTrigger data-testid="select-sensor-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vibration">Vibration</SelectItem>
                          <SelectItem value="temperature">Temperature</SelectItem>
                          <SelectItem value="pressure">Pressure</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="flow">Flow</SelectItem>
                          <SelectItem value="acoustic">Acoustic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sensorId">Sensor ID</Label>
                      <Input id="sensorId" name="sensorId" placeholder="SEN-001" required data-testid="input-sensor-id" />
                    </div>
                    <div>
                      <Label htmlFor="location">Location on Equipment</Label>
                      <Input id="location" name="location" placeholder="Bearing" required data-testid="input-location" />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select name="unit" required>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="celsius">Celsius</SelectItem>
                          <SelectItem value="hz">Hz (Vibration)</SelectItem>
                          <SelectItem value="psi">PSI (Pressure)</SelectItem>
                          <SelectItem value="amps">Amps (Current)</SelectItem>
                          <SelectItem value="gpm">GPM (Flow)</SelectItem>
                          <SelectItem value="db">dB (Acoustic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Normal Range</Label>
                      <div className="flex gap-2">
                        <Input type="number" name="normalMin" placeholder="Min" step="0.1" required data-testid="input-normal-min" />
                        <Input type="number" name="normalMax" placeholder="Max" step="0.1" required data-testid="input-normal-max" />
                      </div>
                    </div>
                    <div>
                      <Label>Warning Thresholds</Label>
                      <div className="flex gap-2">
                        <Input type="number" name="warningMin" placeholder="Min" step="0.1" required data-testid="input-warning-min" />
                        <Input type="number" name="warningMax" placeholder="Max" step="0.1" required data-testid="input-warning-max" />
                      </div>
                    </div>
                    <div>
                      <Label>Critical Thresholds</Label>
                      <div className="flex gap-2">
                        <Input type="number" name="criticalMin" placeholder="Min" step="0.1" required data-testid="input-critical-min" />
                        <Input type="number" name="criticalMax" placeholder="Max" step="0.1" required data-testid="input-critical-max" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-sensor">Create Sensor</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sensor ID</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Thresholds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sensorsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : sensors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sensors configured. Add your first sensor to start monitoring.
                    </TableCell>
                  </TableRow>
                ) : (
                  sensors.map((sensor: any) => (
                    <TableRow key={sensor.id} data-testid={`row-sensor-${sensor.id}`}>
                      <TableCell className="font-mono">{sensor.sensorId}</TableCell>
                      <TableCell>{machinery.find((m: any) => m.id === sensor.machineryId)?.name}</TableCell>
                      <TableCell className="capitalize">{sensor.sensorType}</TableCell>
                      <TableCell>{sensor.location}</TableCell>
                      <TableCell>
                        <Badge variant={sensor.status === "active" ? "default" : "secondary"}>
                          {sensor.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>Normal: {sensor.normalMin}-{sensor.normalMax} {sensor.unit}</div>
                        <div>Warning: {sensor.warningMin}-{sensor.warningMax}</div>
                        <div>Critical: {sensor.criticalMin}-{sensor.criticalMax}</div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Maintenance Alerts</h2>
          </div>

          {alertsLoading ? (
            <Card><CardContent className="p-6">Loading alerts...</CardContent></Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No active alerts. Your equipment is running smoothly.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getSeverityBadge(alert.severity)}
                        <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                          {alert.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {alert.predictedFailureDate && (
                        <div>
                          <div className="text-muted-foreground">Predicted Failure</div>
                          <div className="font-medium">{format(new Date(alert.predictedFailureDate), "PPP")}</div>
                        </div>
                      )}
                      {alert.confidence && (
                        <div>
                          <div className="text-muted-foreground">Confidence</div>
                          <div className="font-medium">{alert.confidence.toFixed(1)}%</div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground">Equipment</div>
                        <div className="font-medium">{machinery.find((m: any) => m.id === alert.machineryId)?.name}</div>
                      </div>
                    </div>

                    {alert.recommendedActions && (
                      <div>
                        <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {alert.recommendedActions.map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {alert.status === "active" && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                          data-testid={`button-acknowledge-${alert.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => resolveAlertMutation.mutate(alert.id)}
                          data-testid={`button-resolve-${alert.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Failure Predictions</h2>
          </div>

          {predictionsLoading ? (
            <Card><CardContent className="p-6">Loading predictions...</CardContent></Card>
          ) : predictions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No predictions available yet. ML models are analyzing sensor data.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {predictions.map((prediction: any) => (
                <Card key={prediction.id} data-testid={`card-prediction-${prediction.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{prediction.failureMode || prediction.predictionType}</CardTitle>
                        <CardDescription>
                          {machinery.find((m: any) => m.id === prediction.machineryId)?.name}
                        </CardDescription>
                      </div>
                      <Badge className={prediction.confidence >= 80 ? "bg-red-600" : prediction.confidence >= 60 ? "bg-orange-600" : "bg-yellow-600"}>
                        {prediction.confidence.toFixed(0)}% confidence
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Predicted Date</div>
                        <div className="font-medium">{format(new Date(prediction.predictedDate), "PPP")}</div>
                      </div>
                      {prediction.timeToFailure && (
                        <div>
                          <div className="text-muted-foreground">Time to Failure</div>
                          <div className="font-medium">{prediction.timeToFailure.toFixed(0)} hours</div>
                        </div>
                      )}
                    </div>

                    {prediction.impactAssessment && (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium mb-1">Impact Assessment</div>
                        <div className="text-xs">
                          {typeof prediction.impactAssessment === 'string' 
                            ? prediction.impactAssessment 
                            : JSON.stringify(prediction.impactAssessment)}
                        </div>
                      </div>
                    )}

                    {prediction.mlModel && (
                      <div className="text-xs text-muted-foreground">
                        Model: {prediction.mlModel}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
