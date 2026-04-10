import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { IndustryCommoditySuggestions } from "@/components/IndustryCommoditySuggestions";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Target,
  Clock,
  BarChart3,
  Zap,
  Info,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForecastPoint {
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  changePercent: number;
}

interface PriceForecast {
  materialCode: string;
  materialName: string;
  currentPrice: number;
  currency: string;
  unit: string;
  forecasts: {
    days30: ForecastPoint;
    days60: ForecastPoint;
    days90: ForecastPoint;
  };
  confidence: number;
  trend: 'rising' | 'falling' | 'stable';
  volatility: 'low' | 'medium' | 'high';
  drivers: string[];
  regimeImpact: string;
  recommendation: string;
}

interface ForecastData {
  forecasts: PriceForecast[];
  regime: string;
  fdr: number;
  generatedAt: string;
}

interface ForecastSummary {
  totalMaterials: number;
  risingCount: number;
  fallingCount: number;
  stableCount: number;
  highVolatilityCount: number;
  avgChange30Day: number;
  avgChange90Day: number;
  topRising: PriceForecast[];
  topFalling: PriceForecast[];
  urgentActions: PriceForecast[];
  regime: string;
  fdr: number;
}

function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function TrendIcon({ trend }: { trend: 'rising' | 'falling' | 'stable' }) {
  switch (trend) {
    case 'rising':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'falling':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'stable':
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function VolatilityBadge({ volatility }: { volatility: 'low' | 'medium' | 'high' }) {
  const variants: Record<string, string> = {
    low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  return (
    <Badge className={variants[volatility]}>
      {volatility.charAt(0).toUpperCase() + volatility.slice(1)} Volatility
    </Badge>
  );
}

function ForecastChart({ forecast }: { forecast: PriceForecast }) {
  const data = [
    { name: 'Now', price: forecast.currentPrice, low: forecast.currentPrice, high: forecast.currentPrice },
    { name: '30d', price: forecast.forecasts.days30.predictedPrice, low: forecast.forecasts.days30.lowerBound, high: forecast.forecasts.days30.upperBound },
    { name: '60d', price: forecast.forecasts.days60.predictedPrice, low: forecast.forecasts.days60.lowerBound, high: forecast.forecasts.days60.upperBound },
    { name: '90d', price: forecast.forecasts.days90.predictedPrice, low: forecast.forecasts.days90.lowerBound, high: forecast.forecasts.days90.upperBound },
  ];

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis 
          domain={['auto', 'auto']} 
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => v.toFixed(0)}
          width={40}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          formatter={(value: number) => [formatCurrency(value, forecast.currency), 'Price']}
        />
        <ReferenceLine y={forecast.currentPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke={forecast.trend === 'rising' ? '#ef4444' : forecast.trend === 'falling' ? '#22c55e' : 'hsl(var(--primary))'}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ForecastCard({ forecast }: { forecast: PriceForecast }) {
  const change90 = forecast.forecasts.days90.changePercent;
  const isPositive = change90 > 0;

  return (
    <Card className="hover-elevate" data-testid={`card-forecast-${forecast.materialCode}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" data-testid={`text-material-name-${forecast.materialCode}`}>
              {forecast.materialName}
            </CardTitle>
            <CardDescription className="text-xs">{forecast.materialCode}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={forecast.trend} />
            <VolatilityBadge volatility={forecast.volatility} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold" data-testid={`text-current-price-${forecast.materialCode}`}>
            {formatCurrency(forecast.currentPrice, forecast.currency)}
          </span>
          <span className="text-xs text-muted-foreground">{forecast.unit}</span>
        </div>

        <ForecastChart forecast={forecast} />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">30 Day</p>
            <p className={`text-sm font-semibold ${forecast.forecasts.days30.changePercent > 0 ? 'text-green-600 dark:text-green-400' : forecast.forecasts.days30.changePercent < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {forecast.forecasts.days30.changePercent > 0 ? '+' : ''}{forecast.forecasts.days30.changePercent}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">60 Day</p>
            <p className={`text-sm font-semibold ${forecast.forecasts.days60.changePercent > 0 ? 'text-green-600 dark:text-green-400' : forecast.forecasts.days60.changePercent < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {forecast.forecasts.days60.changePercent > 0 ? '+' : ''}{forecast.forecasts.days60.changePercent}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">90 Day</p>
            <p className={`text-sm font-semibold ${forecast.forecasts.days90.changePercent > 0 ? 'text-green-600 dark:text-green-400' : forecast.forecasts.days90.changePercent < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {forecast.forecasts.days90.changePercent > 0 ? '+' : ''}{forecast.forecasts.days90.changePercent}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{forecast.confidence}%</span>
          </div>
          <Progress value={forecast.confidence} className="h-1.5" />
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs" data-testid={`text-recommendation-${forecast.materialCode}`}>
              {forecast.recommendation}
            </p>
          </div>
        </div>

        {forecast.drivers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Price Drivers</p>
            <div className="flex flex-wrap gap-1">
              {forecast.drivers.slice(0, 2).map((driver, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {driver}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommodityForecasts() {
  const { data: forecastData, isLoading: forecastLoading } = useQuery<ForecastData>({
    queryKey: ["/api/commodity-forecasts"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<ForecastSummary>({
    queryKey: ["/api/commodity-forecasts/summary"],
  });

  const isLoading = forecastLoading || summaryLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-commodity-forecasts">
            Commodity Price Forecasts
          </h1>
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-5 w-5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                AI-powered price predictions based on historical trends, economic regime analysis, 
                and seasonal patterns. Use these forecasts to optimize procurement timing.
              </p>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-muted-foreground">
          30/60/90 day price predictions for tracked commodities and materials
        </p>
      </div>

      <IndustryCommoditySuggestions />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="card-summary-materials">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Materials Tracked</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-materials">
                  {summary.totalMaterials}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.risingCount} rising, {summary.fallingCount} falling
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-30day">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg 30-Day Change</CardTitle>
                {summary.avgChange30Day > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : summary.avgChange30Day < 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.avgChange30Day > 0 ? 'text-green-600 dark:text-green-400' : summary.avgChange30Day < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {summary.avgChange30Day > 0 ? '+' : ''}{summary.avgChange30Day}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Short-term outlook
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-90day">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg 90-Day Change</CardTitle>
                {summary.avgChange90Day > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : summary.avgChange90Day < 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.avgChange90Day > 0 ? 'text-green-600 dark:text-green-400' : summary.avgChange90Day < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {summary.avgChange90Day > 0 ? '+' : ''}{summary.avgChange90Day}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Long-term outlook
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-urgent">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-urgent-count">
                  {summary.urgentActions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.highVolatilityCount} high volatility
                </p>
              </CardContent>
            </Card>
          </div>

          {summary.urgentActions.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10" data-testid="card-urgent-actions">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Urgent Price Actions
                </CardTitle>
                <CardDescription>
                  Materials with significant short-term price movements requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.urgentActions.map((item) => (
                    <div 
                      key={item.materialCode}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border"
                    >
                      <div className="flex items-center gap-3">
                        <TrendIcon trend={item.trend} />
                        <div>
                          <p className="font-medium">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground">{item.recommendation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${item.forecasts.days30.changePercent > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {item.forecasts.days30.changePercent > 0 ? '+' : ''}{item.forecasts.days30.changePercent}%
                        </p>
                        <p className="text-xs text-muted-foreground">30-day forecast</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Current Regime: <strong className="text-foreground">{summary.regime?.replace(/_/g, ' ')}</strong></span>
            </div>
            <span>|</span>
            <span>FDR: <strong className="text-foreground">{summary.fdr?.toFixed(2)}</strong></span>
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">All Material Forecasts</h2>
        {forecastLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : forecastData?.forecasts && forecastData.forecasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecastData.forecasts.map((forecast) => (
              <ForecastCard key={forecast.materialCode} forecast={forecast} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Materials to Forecast</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Add materials to your catalog to see price forecasts. The forecasting engine 
                analyzes commodity codes to generate predictions.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
