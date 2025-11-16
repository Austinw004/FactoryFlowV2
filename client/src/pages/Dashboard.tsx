import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { ForecastChart } from "@/components/ForecastChart";
import { BudgetGauge } from "@/components/BudgetGauge";
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const forecastData = [
    { month: "Jan", historical: 4000 },
    { month: "Feb", historical: 4200 },
    { month: "Mar", historical: 4100 },
    { month: "Apr", historical: 4500 },
    { month: "May", historical: 4700 },
    { month: "Jun", historical: 4600 },
    { month: "Jul", forecast: 4800 },
    { month: "Aug", forecast: 4950 },
    { month: "Sep", forecast: 5100 },
  ];

  const allocationData = [
    { sku: "SKU_A", plannedUnits: 5000, allocatedUnits: 4850, fillRate: 97, priority: 1.0 },
    { sku: "SKU_B", plannedUnits: 3200, allocatedUnits: 2880, fillRate: 90, priority: 0.8 },
    { sku: "SKU_C", plannedUnits: 7500, allocatedUnits: 7125, fillRate: 95, priority: 1.2 },
    { sku: "SKU_D", plannedUnits: 2100, allocatedUnits: 1890, fillRate: 90, priority: 0.9 },
  ];

  const policySignals = [
    { signal: "REDUCE_INVENTORY", intensity: 0.8 },
    { signal: "TIGHTEN_CREDIT_TERMS", intensity: 0.7 },
    { signal: "DEFER_EXPANSION_CAPEX", intensity: 0.9 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manufacturing allocation intelligence overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-import-data">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button variant="outline" data-testid="button-run-scenario">
            <GitCompare className="h-4 w-4 mr-2" />
            Run Scenario
          </Button>
          <Button data-testid="button-new-allocation">
            <Plus className="h-4 w-4 mr-2" />
            New Allocation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label="FDR Score"
          value="1.23"
          subtitle="Healthy Expansion"
          trend={{ value: "5%", positive: true }}
        />
        <KPICard
          icon={DollarSign}
          label="Budget Health"
          value="$750K"
          subtitle="Available"
          trend={{ value: "12%", positive: true }}
        />
        <KPICard
          icon={Package}
          label="Avg Fill Rate"
          value="94.2%"
          trend={{ value: "3%", positive: true }}
        />
        <KPICard
          icon={AlertCircle}
          label="Active Signals"
          value="3"
          subtitle="Policy alerts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RegimeStatus 
            regime="HEALTHY_EXPANSION" 
            fdr={1.23} 
            intensity={65} 
          />
        </div>
        <BudgetGauge total={750000} spent={547500} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Allocations</h2>
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View All
              </Button>
            </div>
            <AllocationTable allocations={allocationData} />
          </Card>
        </div>
        <PolicySignals signals={policySignals} />
      </div>

      <ForecastChart data={forecastData} title="Demand Trend Analysis" />
    </div>
  );
}
