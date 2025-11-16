import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign } from "lucide-react";

interface BudgetGaugeProps {
  total: number;
  spent: number;
  currency?: string;
}

export function BudgetGauge({ total, spent, currency = "$" }: BudgetGaugeProps) {
  const percentage = (spent / total) * 100;
  const remaining = total - spent;
  
  return (
    <Card className="p-6" data-testid="card-budget-gauge">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Budget Allocation</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-mono font-semibold" data-testid="text-budget-spent">
              {currency}{spent.toLocaleString()}
            </span>
          </div>
          <Progress value={percentage} className="h-3" data-testid="progress-budget" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-mono font-semibold" data-testid="text-budget-remaining">
              {currency}{remaining.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Budget</span>
            <span className="font-mono font-semibold">
              {currency}{total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
