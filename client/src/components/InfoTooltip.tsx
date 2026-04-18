import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  term: string;
  className?: string;
}

const tooltipDefinitions: Record<string, { title: string; description: string }> = {
  fdr: {
    title: "Financial-to-Real Divergence (FDR)",
    description: "A score measuring the gap between financial markets and the real economy. Higher scores indicate potential overheating; lower scores suggest healthy alignment."
  },
  regime: {
    title: "Economic Regime",
    description: "The current state of the economy based on market signals. Regimes include Healthy Expansion (buy normally), Asset-Led Growth (lock in prices), Imbalanced Excess (defer purchases), and Real Economy Lead (buy aggressively)."
  },
  mape: {
    title: "Mean Absolute Percentage Error (MAPE)",
    description: "A measure of forecast accuracy. Lower is better. Under 10% is excellent, 10-20% is good, over 20% needs attention."
  },
  marketSignal: {
    title: "Market Timing Signal",
    description: "A recommendation for when to make purchases based on current economic conditions. Signals include Buy Now, Lock Prices, Defer, or Counter-Cyclical Opportunity."
  },
  allocation: {
    title: "Material Allocation",
    description: "How to split limited materials across your products for maximum value. The optimizer considers demand forecasts, margins, and priorities."
  },
  oee: {
    title: "Overall Equipment Effectiveness (OEE)",
    description: "A measure of manufacturing productivity combining availability, performance, and quality. 85%+ is world-class, 60-85% is typical."
  },
  leadTime: {
    title: "Lead Time",
    description: "The time between placing an order and receiving the materials. Shorter lead times give you more flexibility to respond to demand changes."
  },
  safetyStock: {
    title: "Safety Stock",
    description: "Extra inventory kept on hand to protect against unexpected demand spikes or supply delays."
  },
  reorderPoint: {
    title: "Reorder Point",
    description: "The inventory level at which you should place a new order. Calculated based on lead time, usage rate, and safety stock."
  },
  supplierRisk: {
    title: "Supplier Risk Score",
    description: "A rating of how reliable a supplier is, based on their location, financial health, delivery history, and exposure to economic conditions."
  },
  demandForecast: {
    title: "Demand Forecast",
    description: "A prediction of how many units you'll sell in the future. Our forecasts adjust automatically based on current economic conditions."
  },
  confidenceInterval: {
    title: "Confidence Interval",
    description: "The range where actual demand is likely to fall. A wider range means more uncertainty; a narrower range means higher confidence."
  },
  "tracking-signal": {
    title: "Tracking Signal",
    description: "Measures persistent forecast drift over time. Values between -4 and +4 are normal. Values outside this range indicate the forecast is consistently biased and may need recalibration."
  },
  "theils-u": {
    title: "Theil's U Statistic",
    description: "Compares forecast accuracy to a naive forecast (using the previous value as the prediction). Values below 1.0 mean your forecast beats the naive approach; values above 1.0 mean it underperforms."
  },
  "directional-accuracy": {
    title: "Directional Accuracy",
    description: "The percentage of times the forecast correctly predicted whether demand would go up or down. 70%+ is strong, 50-70% is moderate."
  },
  "confidence-hit-rate": {
    title: "Confidence Hit Rate",
    description: "The percentage of actual values that fell within the predicted confidence bounds. 80%+ indicates reliable uncertainty estimates."
  }
};

export function InfoTooltip({ term, className = "" }: InfoTooltipProps) {
  const definition = tooltipDefinitions[term];
  
  if (!definition) {
    return null;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          type="button"
          className={`inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors ${className}`}
          aria-label={`Learn more about ${definition.title}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs p-3" side="top">
        <p className="font-semibold text-sm mb-1">{definition.title}</p>
        <p className="text-xs text-muted-foreground">{definition.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TermWithTooltip({ 
  term, 
  children, 
  className = "" 
}: { 
  term: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
      <InfoTooltip term={term} />
    </span>
  );
}
