import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Zap,
  ShieldCheck,
  BarChart3,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PlatformValueData {
  totalValueDelivered: number;
  procurementSavings: number;
  forecastAccuracyGains: number;
  riskMitigationValue: number;
  timeSavedHours: number;
  timeSavedDollars: number;
  inventoryOptimization: number;
  valueGrowthRate: number;
  monthlyValueTrend: { month: string; value: number }[];
  valueBreakdown: { category: string; value: number; percent: number }[];
  platformScore: number;
  scoreComponents: {
    dataQuality: number;
    featureAdoption: number;
    forecastAccuracy: number;
    supplierCoverage: number;
    integrationDepth: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function AnimatedCounter({ value, prefix = "$", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const formattedValue = value >= 1000000 
    ? `${(value / 1000000).toFixed(2)}M`
    : value >= 1000 
      ? `${(value / 1000).toFixed(1)}K`
      : value.toFixed(0);
  
  return (
    <span className="tabular-nums">
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeDashoffset = circumference - progress;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${getScoreColor(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`} data-testid="text-platform-score">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

function ValueBreakdownBar({ data }: { data: { category: string; value: number; percent: number }[] }) {
  const colors = [
    "bg-blue-500",
    "bg-green-500", 
    "bg-yellow-500",
    "bg-purple-500",
    "bg-orange-500"
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {data.map((item, i) => (
          <div
            key={item.category}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${item.percent}%` }}
            title={`${item.category}: ${formatCurrency(item.value)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((item, i) => (
          <div key={item.category} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-muted-foreground truncate">{item.category}</span>
            <span className="font-medium ml-auto">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlatformValueScore({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery<PlatformValueData>({
    queryKey: ["/api/platform/value-score"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-platform-value-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const valueData = data || {
    totalValueDelivered: 0,
    procurementSavings: 0,
    forecastAccuracyGains: 0,
    riskMitigationValue: 0,
    timeSavedHours: 0,
    timeSavedDollars: 0,
    inventoryOptimization: 0,
    valueGrowthRate: 0,
    monthlyValueTrend: [],
    valueBreakdown: [],
    platformScore: 0,
    scoreComponents: {
      dataQuality: 0,
      featureAdoption: 0,
      forecastAccuracy: 0,
      supplierCoverage: 0,
      integrationDepth: 0,
    },
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20" data-testid="card-platform-value-compact">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Value Delivered</p>
                <p className="text-xl font-bold text-primary" data-testid="text-total-value-compact">
                  <AnimatedCounter value={valueData.totalValueDelivered} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-sm font-medium">+{valueData.valueGrowthRate.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20" data-testid="card-platform-value-hero">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Platform Value Score
              </CardTitle>
              <CardDescription>
                Total measurable value delivered by Prescient Labs
              </CardDescription>
            </div>
            {valueData.valueGrowthRate > 0 && (
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {valueData.valueGrowthRate.toFixed(1)}% growth
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ScoreRing score={valueData.platformScore} size={140} />
            
            <div className="flex-1 space-y-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Total Value Delivered</p>
                <p className="text-4xl font-bold text-primary" data-testid="text-total-value">
                  <AnimatedCounter value={valueData.totalValueDelivered} />
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Procurement Savings</p>
                    <p className="font-semibold text-sm" data-testid="text-procurement-savings">
                      {formatCurrency(valueData.procurementSavings)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Forecast Gains</p>
                    <p className="font-semibold text-sm" data-testid="text-forecast-gains">
                      {formatCurrency(valueData.forecastAccuracyGains)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Mitigation</p>
                    <p className="font-semibold text-sm" data-testid="text-risk-mitigation">
                      {formatCurrency(valueData.riskMitigationValue)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Saved</p>
                    <p className="font-semibold text-sm" data-testid="text-time-saved">
                      {valueData.timeSavedHours}h ({formatCurrency(valueData.timeSavedDollars)})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-value-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Value Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {valueData.valueBreakdown.length > 0 ? (
              <ValueBreakdownBar data={valueData.valueBreakdown} />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Start using platform features to see value breakdown
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-score-components">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score Components
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(valueData.scoreComponents).map(([key, value]) => {
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                  <Progress value={value} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PlatformValueWidget() {
  const { data } = useQuery<PlatformValueData>({
    queryKey: ["/api/platform/value-score"],
    refetchInterval: 60000,
  });

  const totalValue = data?.totalValueDelivered || 0;
  const score = data?.platformScore || 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Value:</span>
        <span className="font-semibold text-primary text-sm" data-testid="widget-value">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Score:</span>
        <span className="font-semibold text-sm" data-testid="widget-score">{score}</span>
      </div>
    </div>
  );
}

export default PlatformValueScore;
