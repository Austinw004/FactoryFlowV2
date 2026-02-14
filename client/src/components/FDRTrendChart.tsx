import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface EconomicSnapshot {
  id: string;
  timestamp: string;
  fdr: number;
  regime: string;
}

const regimeColors: Record<string, string> = {
  HEALTHY_EXPANSION: "hsl(var(--chart-2))",
  ASSET_LED_GROWTH: "hsl(var(--chart-4))",
  IMBALANCED_EXCESS: "hsl(var(--destructive))",
  REAL_ECONOMY_LEAD: "hsl(var(--chart-1))",
};

const regimeLabels: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

export function FDRTrendChart() {
  const { data: snapshots = [], isLoading } = useQuery<EconomicSnapshot[]>({
    queryKey: ['/api/economics/snapshots'],
  });
  
  // Sort by timestamp and take last 30 data points
  const chartData = snapshots
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-30)
    .map(s => ({
      time: new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fdr: s.fdr,
      regime: s.regime,
      regimeLabel: regimeLabels[s.regime] || s.regime,
    }));
  
  // Detect regime transitions
  const transitions: Array<{ time: string; from: string; to: string }> = [];
  for (let i = 1; i < chartData.length; i++) {
    if (chartData[i].regime !== chartData[i - 1].regime) {
      transitions.push({
        time: chartData[i].time,
        from: chartData[i - 1].regime,
        to: chartData[i].regime,
      });
    }
  }
  
  const currentFDR = chartData.length > 0 ? chartData[chartData.length - 1].fdr : null;
  const currentRegime = chartData.length > 0 ? chartData[chartData.length - 1].regime : null;
  
  if (isLoading || chartData.length === 0) {
    return (
      <Card data-testid="card-fdr-trend">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            FDR Historical Trend
          </CardTitle>
          <CardDescription>Financial-to-Real Divergence over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {isLoading ? "Loading trend data..." : "No historical data available"}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="card-fdr-trend">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              FDR Historical Trend
            </CardTitle>
            <CardDescription>
              Financial-to-Real Divergence over time · {chartData.length} data points
            </CardDescription>
          </div>
          {currentFDR && currentRegime && (
            <div className="text-right">
              <p className="text-2xl font-mono font-semibold">{Number.isFinite(currentFDR) ? currentFDR.toFixed(2) : '—'}</p>
              <Badge variant="secondary" className="mt-1">
                {regimeLabels[currentRegime]}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="time"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'FDR Ratio', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'fdr') return [Number.isFinite(value) ? value.toFixed(2) : '—', 'FDR'];
                return [value, name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Reference lines for thresholds */}
            <ReferenceLine y={0.5} stroke="hsl(var(--chart-1))" strokeDasharray="3 3" label="Low" />
            <ReferenceLine y={1.0} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" label="Mid" />
            <ReferenceLine y={1.5} stroke="hsl(var(--chart-4))" strokeDasharray="3 3" label="High" />
            
            <Line
              type="monotone"
              dataKey="fdr"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="FDR Ratio"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {transitions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Recent Regime Transitions ({transitions.length})</p>
            </div>
            <div className="space-y-1">
              {transitions.slice(-3).map((t, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span className="text-muted-foreground">{t.time}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {regimeLabels[t.from] || t.from}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="default" className="text-xs">
                      {regimeLabels[t.to] || t.to}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
