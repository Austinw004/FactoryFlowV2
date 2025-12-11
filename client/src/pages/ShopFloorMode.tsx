import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  PlayCircle, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ChevronLeft,
  Factory,
  Gauge,
  Radio,
  Package,
  Plus,
  Send,
  RotateCcw,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

export default function ShopFloorMode() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("production");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/operations">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" data-testid="heading-shop-floor">
                <Factory className="h-6 w-6" />
                Shop Floor Mode
              </h1>
              <p className="text-sm text-muted-foreground">Quick entry for floor workers</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-14">
            <TabsTrigger value="production" className="text-base py-3" data-testid="tab-production">
              <PlayCircle className="h-5 w-5 mr-2" />
              Production
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-base py-3" data-testid="tab-maintenance">
              <Wrench className="h-5 w-5 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-base py-3" data-testid="tab-issues">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="production" className="mt-4">
            <ProductionQuickEntry />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <MaintenanceQuickEntry />
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <IssueReporting />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProductionQuickEntry() {
  const { toast } = useToast();
  const [productLine, setProductLine] = useState("");
  const [producedUnits, setProducedUnits] = useState("");
  const [defectUnits, setDefectUnits] = useState("0");
  const [downtimeMinutes, setDowntimeMinutes] = useState("0");

  const createRun = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      
      return await apiRequest("POST", "/api/production/runs", {
        productLine,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        plannedUnits: parseInt(producedUnits) || 0,
        producedUnits: parseInt(producedUnits) || 0,
        defectUnits: parseInt(defectUnits) || 0,
        plannedDuration: 480,
        downtimeMinutes: parseInt(downtimeMinutes) || 0,
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/runs"] });
      toast({ title: "Production run logged successfully" });
      setProductLine("");
      setProducedUnits("");
      setDefectUnits("0");
      setDowntimeMinutes("0");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log run", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!productLine || !producedUnits) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createRun.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-green-600" />
          Log Production Run
        </CardTitle>
        <CardDescription>Quick entry for shift production data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base">Product Line *</Label>
          <Input
            value={productLine}
            onChange={(e) => setProductLine(e.target.value)}
            placeholder="e.g., Assembly Line A"
            className="h-14 text-lg"
            data-testid="input-product-line"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-base">Units Produced *</Label>
            <Input
              type="number"
              value={producedUnits}
              onChange={(e) => setProducedUnits(e.target.value)}
              placeholder="0"
              className="h-14 text-lg text-center"
              data-testid="input-produced-units"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">Defect Units</Label>
            <Input
              type="number"
              value={defectUnits}
              onChange={(e) => setDefectUnits(e.target.value)}
              placeholder="0"
              className="h-14 text-lg text-center"
              data-testid="input-defect-units"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Downtime (minutes)</Label>
          <Input
            type="number"
            value={downtimeMinutes}
            onChange={(e) => setDowntimeMinutes(e.target.value)}
            placeholder="0"
            className="h-14 text-lg text-center"
            data-testid="input-downtime"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full h-16 text-lg"
          disabled={createRun.isPending}
          data-testid="button-submit-production"
        >
          {createRun.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-6 w-6 mr-2" />
              Log Production Run
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function MaintenanceQuickEntry() {
  const { toast } = useToast();
  
  const { data: machinery = [] } = useQuery<any[]>({
    queryKey: ["/api/machinery"],
  });

  const [selectedMachine, setSelectedMachine] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [notes, setNotes] = useState("");

  const logMaintenance = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/machinery/${selectedMachine}/maintenance`, {
        maintenanceType,
        description: notes || `${maintenanceType} maintenance completed`,
        performedDate: new Date().toISOString(),
        cost: 0,
        performedBy: "Shop Floor Worker",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machinery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operations/attention"] });
      toast({ title: "Maintenance logged successfully" });
      setSelectedMachine("");
      setMaintenanceType("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log maintenance", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedMachine || !maintenanceType) {
      toast({ title: "Please select machine and maintenance type", variant: "destructive" });
      return;
    }
    logMaintenance.mutate();
  };

  const needingMaintenance = machinery.filter((m: any) => {
    if (!m.nextMaintenanceDate) return false;
    const nextMaint = new Date(m.nextMaintenanceDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return nextMaint <= thirtyDaysFromNow;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          Log Maintenance Complete
        </CardTitle>
        <CardDescription>Mark maintenance as done</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {needingMaintenance.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {needingMaintenance.length} machine{needingMaintenance.length > 1 ? 's' : ''} need maintenance
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base">Select Machine *</Label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="h-14 text-lg" data-testid="select-machine">
              <SelectValue placeholder="Choose machine..." />
            </SelectTrigger>
            <SelectContent>
              {machinery.map((m: any) => (
                <SelectItem key={m.id} value={m.id} className="py-3">
                  <div className="flex items-center gap-2">
                    {m.name}
                    {needingMaintenance.some((nm: any) => nm.id === m.id) && (
                      <Badge variant="outline" className="text-xs">Due</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Maintenance Type *</Label>
          <div className="grid grid-cols-2 gap-3">
            {["Preventive", "Repair", "Inspection", "Calibration"].map((type) => (
              <Button
                key={type}
                variant={maintenanceType === type ? "default" : "outline"}
                className="h-14 text-base"
                onClick={() => setMaintenanceType(type)}
                data-testid={`button-type-${type.toLowerCase()}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            className="min-h-[100px] text-base"
            data-testid="input-notes"
          />
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full h-16 text-lg"
          disabled={logMaintenance.isPending}
          data-testid="button-submit-maintenance"
        >
          {logMaintenance.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-6 w-6 mr-2" />
              Mark Maintenance Complete
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function IssueReporting() {
  const { toast } = useToast();
  
  const { data: machinery = [] } = useQuery<any[]>({
    queryKey: ["/api/machinery"],
  });

  const [selectedMachine, setSelectedMachine] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");

  const reportIssue = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sensor-alerts", {
        machineryId: selectedMachine,
        sensorId: null,
        severity: severity.toLowerCase(),
        alertType: "manual_report",
        message: description,
        currentValue: 0,
        thresholdValue: 0,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operations/attention"] });
      toast({ title: "Issue reported successfully" });
      setSelectedMachine("");
      setSeverity("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to report issue", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedMachine || !severity || !description) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    reportIssue.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Report Equipment Issue
        </CardTitle>
        <CardDescription>Flag problems for maintenance team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base">Equipment *</Label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="h-14 text-lg" data-testid="select-machine-issue">
              <SelectValue placeholder="Choose equipment..." />
            </SelectTrigger>
            <SelectContent>
              {machinery.map((m: any) => (
                <SelectItem key={m.id} value={m.id} className="py-3">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Severity *</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={severity === "Critical" ? "destructive" : "outline"}
              className="h-14 text-base"
              onClick={() => setSeverity("Critical")}
              data-testid="button-severity-critical"
            >
              Critical
            </Button>
            <Button
              variant={severity === "High" ? "default" : "outline"}
              className={`h-14 text-base ${severity === "High" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              onClick={() => setSeverity("High")}
              data-testid="button-severity-high"
            >
              High
            </Button>
            <Button
              variant={severity === "Medium" ? "default" : "outline"}
              className={`h-14 text-base ${severity === "Medium" ? "bg-yellow-600 hover:bg-yellow-700" : ""}`}
              onClick={() => setSeverity("Medium")}
              data-testid="button-severity-medium"
            >
              Medium
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">What's the problem? *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            className="min-h-[120px] text-base"
            data-testid="input-issue-description"
          />
        </div>

        <Button 
          onClick={handleSubmit}
          variant="destructive"
          className="w-full h-16 text-lg"
          disabled={reportIssue.isPending}
          data-testid="button-submit-issue"
        >
          {reportIssue.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Send className="h-6 w-6 mr-2" />
              Report Issue
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
