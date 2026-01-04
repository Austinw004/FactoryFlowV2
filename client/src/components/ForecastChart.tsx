import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { getRelativeTime } from "@/lib/utils";
import { Clock } from "lucide-react";

interface ForecastDataPoint {
  month: string;
  historical?: number;
  forecast?: number;
  confidence?: number;
  forecastLower?: number;
  forecastUpper?: number;
}

interface ForecastChartProps {
  data: ForecastDataPoint[];
  title: string;
  lastUpdated?: string | Date;
  confidenceLevel?: number;
}

function processDataWithConfidenceBands(data: ForecastDataPoint[], confidenceMargin = 0.15): ForecastDataPoint[] {
  return data.map(point => {
    if (point.forecast !== undefined && point.forecast !== null) {
      const margin = point.forecast * confidenceMargin;
      return {
        ...point,
        forecastLower: point.forecastLower ?? Math.round(point.forecast - margin),
        forecastUpper: point.forecastUpper ?? Math.round(point.forecast + margin),
      };
    }
    return point;
  });
}

export function ForecastChart({ data, title, lastUpdated, confidenceLevel = 85 }: ForecastChartProps) {
  const processedData = processDataWithConfidenceBands(data);
  
  return (
    <Card className="p-6" data-testid="card-forecast-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {confidenceLevel}% confidence
          </Badge>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-last-updated">
              <Clock className="h-3 w-3" />
              {getRelativeTime(lastUpdated)}
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={processedData}>
          <defs>
            <linearGradient id="confidenceBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'forecastLower' || name === 'forecastUpper') return null;
              return [value?.toLocaleString() ?? '-', name];
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend 
            formatter={(value) => {
              if (value === 'forecast') return `Forecast (${confidenceLevel}% CI)`;
              if (value === 'historical') return 'Historical';
              return value;
            }}
          />
          <Area
            type="monotone"
            dataKey="forecastUpper"
            stroke="none"
            fill="url(#confidenceBandGradient)"
            name="forecastUpper"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="forecastLower"
            stroke="none"
            fill="hsl(var(--card))"
            name="forecastLower"
            legendType="none"
          />
          <Line 
            type="monotone" 
            dataKey="historical" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="historical"
            dot={{ r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="forecast"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Shaded area shows {confidenceLevel}% confidence interval for forecast predictions
      </p>
    </Card>
  );
}
