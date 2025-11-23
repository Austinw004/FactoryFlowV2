import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FDRDataPoint {
  month: number;
  label: string;
  fdr: number;
  regime?: string;
  scenarioName?: string;
}

interface FDRTimelineChartProps {
  data: FDRDataPoint[];
  scenarios?: Array<{
    name: string;
    color: string;
    data: FDRDataPoint[];
  }>;
  title?: string;
  description?: string;
  showThresholds?: boolean;
}

export function FDRTimelineChart({ 
  data, 
  scenarios, 
  title = "FDR Timeline Projection", 
  description = "Financial Decoupling Ratio changes over scenario duration",
  showThresholds = true 
}: FDRTimelineChartProps) {
  const combinedData = scenarios ? 
    combineScenarioData(scenarios) : 
    data;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Card data-testid="card-fdr-timeline">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              label={{ value: 'FDR', angle: -90, position: 'insideLeft' }}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number) => value.toFixed(2)}
            />
            <Legend />
            
            {showThresholds && (
              <>
                <ReferenceLine 
                  y={1.5} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ value: "Bubble Risk (1.5)", position: "right", fill: "#ef4444" }}
                />
                <ReferenceLine 
                  y={0.9} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  label={{ value: "Recession Risk (0.9)", position: "right", fill: "#f59e0b" }}
                />
              </>
            )}
            
            {scenarios ? (
              scenarios.map((scenario, idx) => (
                <Line
                  key={scenario.name}
                  type="monotone"
                  dataKey={scenario.name}
                  stroke={scenario.color || colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={scenario.name}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="fdr"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="FDR"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function combineScenarioData(scenarios: Array<{ name: string; data: FDRDataPoint[] }>) {
  if (scenarios.length === 0) return [];
  
  const maxLength = Math.max(...scenarios.map(s => s.data.length));
  const combined: any[] = [];
  
  for (let i = 0; i < maxLength; i++) {
    const point: any = {
      label: scenarios[0].data[i]?.label || `Month ${i}`,
      month: i,
    };
    
    scenarios.forEach(scenario => {
      if (scenario.data[i]) {
        point[scenario.name] = scenario.data[i].fdr;
      }
    });
    
    combined.push(point);
  }
  
  return combined;
}
