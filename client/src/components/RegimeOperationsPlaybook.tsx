import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Zap, 
  Users, 
  Wrench, 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from "lucide-react";

interface RegimeData {
  regime: string;
  fdr: number;
  lastUpdated?: string;
}

interface PlaybookAction {
  icon: any;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface RegimePlaybook {
  name: string;
  summary: string;
  color: string;
  staffing: PlaybookAction[];
  maintenance: PlaybookAction[];
  inventory: PlaybookAction[];
  spending: PlaybookAction[];
}

const playbooks: Record<string, RegimePlaybook> = {
  HEALTHY_EXPANSION: {
    name: "Healthy Expansion",
    summary: "Growth conditions are strong with balanced financial and real economy metrics. Time to invest strategically.",
    color: "bg-green-600",
    staffing: [
      { icon: Users, title: "Hire Strategically", description: "Add permanent staff in key production roles. Invest in training programs.", priority: "high" },
      { icon: Clock, title: "Extend Shifts If Needed", description: "Consider adding shifts to meet demand. Overtime is acceptable short-term.", priority: "medium" },
      { icon: TrendingUp, title: "Skills Development", description: "Cross-train workers for flexibility. Build internal talent pipeline.", priority: "medium" },
    ],
    maintenance: [
      { icon: Wrench, title: "Invest in Upgrades", description: "Optimal time for equipment upgrades and replacements. Capex approvals favorable.", priority: "high" },
      { icon: CheckCircle, title: "Proactive Maintenance", description: "Stay ahead of maintenance schedules. Fix minor issues before they grow.", priority: "high" },
      { icon: Package, title: "Stock Spare Parts", description: "Build spare parts inventory. Lead times may extend as demand grows.", priority: "medium" },
    ],
    inventory: [
      { icon: Package, title: "Build Strategic Stock", description: "Increase safety stock for critical materials. Demand growth expected.", priority: "high" },
      { icon: DollarSign, title: "Lock In Prices", description: "Negotiate longer-term contracts at current prices before inflation.", priority: "high" },
      { icon: TrendingUp, title: "Expand Supplier Base", description: "Qualify backup suppliers now while you have leverage.", priority: "medium" },
    ],
    spending: [
      { icon: DollarSign, title: "Approve Capex Projects", description: "Green light delayed investments. Payback periods will be shorter.", priority: "high" },
      { icon: TrendingUp, title: "Increase R&D Budget", description: "Invest in product development and process improvements.", priority: "medium" },
      { icon: Users, title: "Training Investment", description: "Allocate budget for workforce development programs.", priority: "medium" },
    ],
  },
  ASSET_LED_GROWTH: {
    name: "Asset-Led Growth",
    summary: "Financial assets are outpacing the real economy. Exercise caution - a correction may be coming.",
    color: "bg-orange-600",
    staffing: [
      { icon: Clock, title: "Use Temp Workers", description: "Flex capacity with temporary staff. Avoid permanent commitments.", priority: "high" },
      { icon: Users, title: "Freeze Non-Essential Hiring", description: "Limit new hires to critical roles only. Backfill only.", priority: "high" },
      { icon: AlertTriangle, title: "Prepare for Slowdown", description: "Document processes. Identify roles that could be consolidated.", priority: "medium" },
    ],
    maintenance: [
      { icon: Wrench, title: "Prioritize Critical Equipment", description: "Focus maintenance budget on production-critical assets only.", priority: "high" },
      { icon: Clock, title: "Defer Non-Critical Work", description: "Postpone cosmetic repairs and nice-to-have upgrades.", priority: "medium" },
      { icon: Shield, title: "Extend Equipment Life", description: "Maximize useful life of current equipment before replacement.", priority: "medium" },
    ],
    inventory: [
      { icon: Package, title: "Maintain Current Levels", description: "Don't overbuild inventory. Watch demand signals closely.", priority: "high" },
      { icon: DollarSign, title: "Shorter Contract Terms", description: "Avoid long-term price locks. Keep flexibility.", priority: "high" },
      { icon: AlertTriangle, title: "Monitor Supplier Health", description: "Watch for signs of financial stress in your supply chain.", priority: "medium" },
    ],
    spending: [
      { icon: DollarSign, title: "Review All Commitments", description: "Audit pending POs and contracts. Cancel what you can.", priority: "high" },
      { icon: AlertTriangle, title: "Build Cash Reserves", description: "Preserve cash for the potential downturn ahead.", priority: "high" },
      { icon: Clock, title: "Delay Large Capex", description: "Postpone major equipment purchases if possible.", priority: "medium" },
    ],
  },
  IMBALANCED_EXCESS: {
    name: "Imbalanced Excess",
    summary: "Warning: Financial excess is high. Prepare for correction. Defensive posture recommended.",
    color: "bg-red-600",
    staffing: [
      { icon: AlertTriangle, title: "Reduce Overtime", description: "Eliminate non-essential overtime immediately.", priority: "high" },
      { icon: Users, title: "Natural Attrition Only", description: "Don't backfill departures unless critical. Hiring freeze.", priority: "high" },
      { icon: Clock, title: "Cross-Train Aggressively", description: "Ensure coverage with fewer people. Build flexibility.", priority: "high" },
    ],
    maintenance: [
      { icon: Wrench, title: "Safety-Critical Only", description: "Only perform maintenance required for safety or production.", priority: "high" },
      { icon: Clock, title: "Maximum Deferral", description: "Push all non-critical maintenance to next quarter.", priority: "high" },
      { icon: DollarSign, title: "Reduce Parts Inventory", description: "Draw down spare parts to free up cash.", priority: "medium" },
    ],
    inventory: [
      { icon: TrendingDown, title: "Draw Down Stock", description: "Reduce inventory levels. Convert to cash before demand drops.", priority: "high" },
      { icon: DollarSign, title: "Spot Buying Only", description: "No long-term commitments. Buy only what you need.", priority: "high" },
      { icon: AlertTriangle, title: "Stress Test Suppliers", description: "Which suppliers might fail in a downturn? Have backups.", priority: "medium" },
    ],
    spending: [
      { icon: DollarSign, title: "Emergency Cash Mode", description: "Maximize cash reserves. Cut all discretionary spending.", priority: "high" },
      { icon: AlertTriangle, title: "Cancel Pending Orders", description: "Review all POs. Cancel or reduce where possible.", priority: "high" },
      { icon: Clock, title: "Freeze All Capex", description: "No new equipment purchases until regime improves.", priority: "high" },
    ],
  },
  REAL_ECONOMY_LEAD: {
    name: "Real Economy Lead",
    summary: "Counter-cyclical opportunity! Real economy is strong while assets lag. Aggressive buying recommended.",
    color: "bg-blue-600",
    staffing: [
      { icon: Users, title: "Aggressive Hiring", description: "Labor market is favorable. Lock in top talent now.", priority: "high" },
      { icon: TrendingUp, title: "Expand Workforce", description: "Add capacity ahead of competitors. Train new hires.", priority: "high" },
      { icon: Clock, title: "Maximize Shifts", description: "Run full capacity. Demand will grow.", priority: "medium" },
    ],
    maintenance: [
      { icon: Wrench, title: "Major Overhauls Now", description: "Perfect time for major maintenance while costs are low.", priority: "high" },
      { icon: Package, title: "Stock Up on Parts", description: "Buy spare parts at favorable prices. Build reserves.", priority: "high" },
      { icon: TrendingUp, title: "Upgrade Equipment", description: "Replace aging equipment. Vendors may offer deals.", priority: "medium" },
    ],
    inventory: [
      { icon: Package, title: "Maximum Inventory Build", description: "Buy aggressively at low prices. Store for future.", priority: "high" },
      { icon: DollarSign, title: "Lock In Long-Term Contracts", description: "Secure favorable pricing for 12-24 months.", priority: "high" },
      { icon: TrendingUp, title: "Qualify New Suppliers", description: "Add capacity. You'll need it when expansion hits.", priority: "medium" },
    ],
    spending: [
      { icon: DollarSign, title: "Accelerate Capex", description: "Buy equipment, expand facilities. Best ROI timing.", priority: "high" },
      { icon: TrendingUp, title: "Strategic Acquisitions", description: "Consider M&A opportunities. Valuations are favorable.", priority: "medium" },
      { icon: Package, title: "Pre-Buy Materials", description: "Forward purchase key commodities at current prices.", priority: "high" },
    ],
  },
};

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function RegimeOperationsPlaybook() {
  const { data: regime, isLoading } = useQuery<RegimeData>({
    queryKey: ["/api/economics/regime"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentRegime = regime?.regime || "HEALTHY_EXPANSION";
  const playbook = playbooks[currentRegime] || playbooks.HEALTHY_EXPANSION;

  const renderActions = (actions: PlaybookAction[]) => (
    <div className="space-y-3 pt-2">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{action.title}</p>
                <Badge className={`text-xs ${priorityColors[action.priority]}`}>
                  {action.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card data-testid="card-regime-playbook">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${playbook.color}`} />
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Regime Operations Playbook
            </CardTitle>
            <CardDescription className="mt-1">
              Current Regime: <Badge className={playbook.color}>{playbook.name}</Badge>
              {regime?.fdr && <span className="ml-2">FDR: {regime.fdr.toFixed(2)}</span>}
            </CardDescription>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{playbook.summary}</p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="staffing" className="w-full">
          <AccordionItem value="staffing">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staffing & Workforce
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {renderActions(playbook.staffing)}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="maintenance">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance & Equipment
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {renderActions(playbook.maintenance)}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="inventory">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory & Procurement
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {renderActions(playbook.inventory)}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="spending">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Spending & Investment
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {renderActions(playbook.spending)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
