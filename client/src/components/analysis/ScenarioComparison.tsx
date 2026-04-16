import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { FDRTimelineChart } from "./FDRTimelineChart";
import type { ScenarioBookmark } from "@shared/schema";

interface ScenarioComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: ScenarioBookmark[];
}

export function ScenarioComparison({ open, onOpenChange, scenarios }: ScenarioComparisonProps) {
  if (scenarios.length < 2 || scenarios.length > 3) {
    return null;
  }

  const getComparisonColor = (value: number, isBetter: 'higher' | 'lower') => {
    if (value === 0) return 'text-muted-foreground';
    const isPositive = value > 0;
    const shouldBeGreen = (isPositive && isBetter === 'higher') || (!isPositive && isBetter === 'lower');
    return shouldBeGreen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getComparisonIcon = (value: number, isBetter: 'higher' | 'lower') => {
    if (value === 0) return <Minus className="h-4 w-4" />;
    const isPositive = value > 0;
    const shouldBeGreen = (isPositive && isBetter === 'higher') || (!isPositive && isBetter === 'lower');
    return isPositive ? (
      shouldBeGreen ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
    ) : (
      shouldBeGreen ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />
    );
  };

  const extractMetric = (scenario: ScenarioBookmark, path: string): any => {
    const results = scenario.results as any;
    if (!results) return null;
    
    const keys = path.split('.');
    let value = results;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return null;
    }
    return value;
  };

  const metrics = [
    { label: 'FDR Change', path: 'newFDR', format: (v: number) => v?.toFixed(2) || 'N/A', better: 'lower' as 'higher' | 'lower' },
    { label: 'New Regime', path: 'newRegime', format: (v: string) => v || 'N/A', better: null },
    { label: 'Revenue Impact', path: 'revenueImpact', format: (v: number) => `$${(v || 0).toLocaleString()}`, better: 'higher' as 'higher' | 'lower' },
    { label: 'Revenue Impact %', path: 'revenueImpactPercent', format: (v: number) => `${(v || 0).toFixed(1)}%`, better: 'higher' as 'higher' | 'lower' },
    { label: 'Cost Impact', path: 'costImpact', format: (v: number) => `$${(v || 0).toLocaleString()}`, better: 'lower' as 'higher' | 'lower' },
    { label: 'Margin Impact', path: 'marginImpact', format: (v: number) => `${(v || 0).toFixed(1)}%`, better: 'higher' as 'higher' | 'lower' },
    { label: 'Cash Flow Impact', path: 'cashFlowImpact', format: (v: number) => `$${(v || 0).toLocaleString()}`, better: 'higher' as 'higher' | 'lower' },
    { label: 'Production Volume Change', path: 'productionVolumeChange', format: (v: number) => `${(v || 0).toFixed(1)}%`, better: 'higher' as 'higher' | 'lower' },
  ];

  const fdrTimelineData = scenarios.map((scenario, idx) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b'];
    const results = scenario.results as any;
    
    const durationMonths = results?.durationMonths || 12;
    const startFDR = scenario.fdrAtTime || 1.0;
    const endFDR = results?.newFDR || startFDR;
    
    const data = [];
    for (let i = 0; i <= durationMonths; i++) {
      const fdr = startFDR + (endFDR - startFDR) * (i / durationMonths);
      data.push({
        month: i,
        label: `M${i}`,
        fdr,
      });
    }
    
    return {
      name: scenario.name,
      color: colors[idx],
      data,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" data-testid="dialog-scenario-comparison">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Scenario Comparison</DialogTitle>
          <DialogDescription>
            Compare key metrics and performance across {scenarios.length} scenarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(scenario => (
              <Card key={scenario.id} data-testid={`card-scenario-${scenario.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base" data-testid={`text-scenario-name-${scenario.id}`}>
                    {scenario.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {scenario.notes && (
                    <p className="text-muted-foreground text-xs" data-testid={`text-notes-${scenario.id}`}>
                      {scenario.notes}
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Initial FDR:</span>
                    <span className="font-semibold" data-testid={`text-initial-fdr-${scenario.id}`}>
                      {scenario.fdrAtTime?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Initial Regime:</span>
                    <Badge variant="outline" data-testid={`badge-regime-${scenario.id}`}>
                      {scenario.regimeAtTime || 'N/A'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <FDRTimelineChart
            data={[]}
            scenarios={fdrTimelineData}
            title="FDR Progression Comparison"
            description="How each scenario's FDR evolves over time"
          />

          <Card data-testid="card-metrics-comparison">
            <CardHeader>
              <CardTitle className="text-base">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Metric</TableHead>
                      {scenarios.map(scenario => (
                        <TableHead key={scenario.id} data-testid={`header-${scenario.id}`}>
                          {scenario.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map(metric => {
                      const values = scenarios.map(s => extractMetric(s, metric.path));
                      const numericValues = values.map(v => typeof v === 'number' ? v : null);
                      const bestValue = metric.better && numericValues.some(v => v !== null)
                        ? (metric.better === 'higher' 
                            ? Math.max(...numericValues.filter(v => v !== null) as number[])
                            : Math.min(...numericValues.filter(v => v !== null) as number[]))
                        : null;

                      return (
                        <TableRow key={metric.label}>
                          <TableCell className="font-medium" data-testid={`metric-${metric.label}`}>
                            {metric.label}
                          </TableCell>
                          {scenarios.map((scenario, idx) => {
                            const value = values[idx];
                            const numericValue = numericValues[idx];
                            const isBest = metric.better && bestValue !== null && numericValue === bestValue;

                            return (
                              <TableCell 
                                key={scenario.id}
                                className={isBest ? 'font-semibold' : ''}
                                data-testid={`value-${metric.label}-${scenario.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  {metric.better && numericValue !== null && (
                                    <span className={getComparisonColor(numericValue, metric.better)}>
                                      {getComparisonIcon(numericValue, metric.better)}
                                    </span>
                                  )}
                                  <span className={isBest ? 'text-primary' : ''}>
                                    {(metric.format as (v: any) => any)(value)}
                                  </span>
                                  {isBest && <Badge variant="outline" className="ml-1 text-xs">Best</Badge>}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
