import { KPICard } from '../KPICard';
import { TrendingUp, DollarSign, Package, AlertCircle } from 'lucide-react';

export default function KPICardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
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
        label="Fill Rate"
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
  );
}
