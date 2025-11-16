import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ForecastDataPoint {
  month: string;
  historical?: number;
  forecast?: number;
  confidence?: number;
}

interface ForecastChartProps {
  data: ForecastDataPoint[];
  title: string;
}

export function ForecastChart({ data, title }: ForecastChartProps) {
  return (
    <Card className="p-6" data-testid="card-forecast-chart">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="historical" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="Historical"
            dot={{ r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Forecast"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
