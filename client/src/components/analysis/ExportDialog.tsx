import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, FileDown, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioData?: {
    type: 'economic' | 'geopolitical' | 'combined';
    results?: any;
    configuration?: any;
  };
}

export function ExportDialog({ open, onOpenChange, scenarioData }: ExportDialogProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | null>(null);
  
  const [includeResults, setIncludeResults] = useState(true);
  const [includeConfiguration, setIncludeConfiguration] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeRisks, setIncludeRisks] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);

  const handleExportCSV = async () => {
    if (!scenarioData?.results) {
      toast({
        title: "Nothing to export yet",
        description: "Run the scenario first — once results are calculated you can export CSV or PDF from here.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    setExportFormat('csv');

    try {
      const results = scenarioData.results as any;
      const csvRows: string[] = [];

      csvRows.push('Metric,Value');
      csvRows.push(`Scenario Type,${scenarioData.type}`);
      csvRows.push('');

      if (includeResults) {
        csvRows.push('SCENARIO RESULTS');
        csvRows.push(`Scenario Name,${results.scenarioName || 'N/A'}`);
        csvRows.push(`Confidence,${results.confidence || 0}%`);
        csvRows.push(`New FDR,${results.newFDR || 'N/A'}`);
        csvRows.push(`New Regime,${results.newRegime || 'N/A'}`);
        csvRows.push(`Regime Stability,${results.regimeStability || 'N/A'}`);
        csvRows.push(`Revenue Impact,$${results.revenueImpact?.toLocaleString() || 0}`);
        csvRows.push(`Revenue Impact %,${results.revenueImpactPercent || 0}%`);
        csvRows.push(`Cost Impact,$${results.costImpact?.toLocaleString() || 0}`);
        csvRows.push(`Cost Impact %,${results.costImpactPercent || 0}%`);
        csvRows.push(`Margin Impact,${results.marginImpact || 0}%`);
        csvRows.push(`Production Volume Change,${results.productionVolumeChange || 0}%`);
        csvRows.push(`Inventory Requirement,${results.inventoryRequirement?.toLocaleString() || 0}`);
        csvRows.push(`Cash Flow Impact,$${results.cashFlowImpact?.toLocaleString() || 0}`);
        csvRows.push('');
      }

      if (includeRecommendations && results.recommendations?.length > 0) {
        csvRows.push('RECOMMENDATIONS');
        csvRows.push('Category,Action,Priority,Impact,Timeline');
        results.recommendations.forEach((rec: any) => {
          csvRows.push(`${rec.category},${rec.action},${rec.priority},${rec.impact},${rec.timeline}`);
        });
        csvRows.push('');
      }

      if (includeRisks && results.risks?.length > 0) {
        csvRows.push('RISKS');
        csvRows.push('Factor,Probability,Impact,Mitigation');
        results.risks.forEach((risk: any) => {
          csvRows.push(`${risk.factor},${risk.probability},${risk.impact},${risk.mitigation}`);
        });
        csvRows.push('');
      }

      if (includeConfiguration && scenarioData.configuration) {
        csvRows.push('CONFIGURATION');
        Object.entries(scenarioData.configuration).forEach(([key, value]) => {
          csvRows.push(`${key},${value}`);
        });
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenario-analysis-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || 'Failed to generate CSV file',
        variant: "destructive",
      });
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  const handleExportPDF = async () => {
    if (!scenarioData?.results) {
      toast({
        title: "Nothing to export yet",
        description: "Run the scenario first — once results are calculated you can export CSV or PDF from here.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    setExportFormat('pdf');

    try {
      const results = scenarioData.results as any;
      
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Scenario Analysis Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #1a1a1a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #2c2c2c; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; margin-top: 30px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .metric-label { font-weight: 600; color: #555; }
    .metric-value { color: #1a1a1a; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border: 1px solid #e0e0e0; }
    th { background-color: #f5f5f5; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-high { background-color: #fee2e2; color: #991b1b; }
    .badge-medium { background-color: #fef3c7; color: #92400e; }
    .badge-low { background-color: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <h1>Scenario Analysis Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Type:</strong> ${scenarioData.type.charAt(0).toUpperCase() + scenarioData.type.slice(1)}</p>
`;

      if (includeResults) {
        htmlContent += `
  <h2>Scenario Results</h2>
  <div class="metric">
    <span class="metric-label">Scenario Name:</span>
    <span class="metric-value">${results.scenarioName || 'N/A'}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Confidence:</span>
    <span class="metric-value">${results.confidence || 0}%</span>
  </div>
  <div class="metric">
    <span class="metric-label">New FDR:</span>
    <span class="metric-value">${results.newFDR || 'N/A'}</span>
  </div>
  <div class="metric">
    <span class="metric-label">New Regime:</span>
    <span class="metric-value">${results.newRegime || 'N/A'}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Revenue Impact:</span>
    <span class="metric-value ${results.revenueImpact > 0 ? 'positive' : 'negative'}">
      $${results.revenueImpact?.toLocaleString() || 0} (${results.revenueImpactPercent || 0}%)
    </span>
  </div>
  <div class="metric">
    <span class="metric-label">Cost Impact:</span>
    <span class="metric-value ${results.costImpact < 0 ? 'positive' : 'negative'}">
      $${results.costImpact?.toLocaleString() || 0} (${results.costImpactPercent || 0}%)
    </span>
  </div>
  <div class="metric">
    <span class="metric-label">Margin Impact:</span>
    <span class="metric-value ${results.marginImpact > 0 ? 'positive' : 'negative'}">
      ${results.marginImpact || 0}%
    </span>
  </div>
  <div class="metric">
    <span class="metric-label">Cash Flow Impact:</span>
    <span class="metric-value ${results.cashFlowImpact > 0 ? 'positive' : 'negative'}">
      $${results.cashFlowImpact?.toLocaleString() || 0}
    </span>
  </div>
`;
      }

      if (includeRecommendations && results.recommendations?.length > 0) {
        htmlContent += `
  <h2>Recommendations</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Action</th>
        <th>Priority</th>
        <th>Timeline</th>
      </tr>
    </thead>
    <tbody>
`;
        results.recommendations.forEach((rec: any) => {
          const badgeClass = rec.priority === 'high' ? 'badge-high' : rec.priority === 'medium' ? 'badge-medium' : 'badge-low';
          htmlContent += `
      <tr>
        <td>${rec.category}</td>
        <td>${rec.action}</td>
        <td><span class="badge ${badgeClass}">${rec.priority}</span></td>
        <td>${rec.timeline}</td>
      </tr>
`;
        });
        htmlContent += `
    </tbody>
  </table>
`;
      }

      if (includeRisks && results.risks?.length > 0) {
        htmlContent += `
  <h2>Risk Assessment</h2>
  <table>
    <thead>
      <tr>
        <th>Risk Factor</th>
        <th>Probability</th>
        <th>Impact</th>
        <th>Mitigation</th>
      </tr>
    </thead>
    <tbody>
`;
        results.risks.forEach((risk: any) => {
          htmlContent += `
      <tr>
        <td>${risk.factor}</td>
        <td>${risk.probability}%</td>
        <td>${risk.impact}/10</td>
        <td>${risk.mitigation}</td>
      </tr>
`;
        });
        htmlContent += `
    </tbody>
  </table>
`;
      }

      htmlContent += `
</body>
</html>
`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenario-analysis-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "HTML report has been downloaded (you can print to PDF from your browser)",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || 'Failed to generate PDF file',
        variant: "destructive",
      });
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <FileDown className="h-5 w-5" />
            Export Analysis
          </DialogTitle>
          <DialogDescription>
            Download your scenario analysis results in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Export Options</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="results" 
                  checked={includeResults}
                  onCheckedChange={(checked) => setIncludeResults(!!checked)}
                  data-testid="checkbox-results"
                />
                <Label htmlFor="results" className="font-normal cursor-pointer">
                  Include Scenario Results
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="configuration"
                  checked={includeConfiguration}
                  onCheckedChange={(checked) => setIncludeConfiguration(!!checked)}
                  data-testid="checkbox-configuration"
                />
                <Label htmlFor="configuration" className="font-normal cursor-pointer">
                  Include Configuration Details
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recommendations"
                  checked={includeRecommendations}
                  onCheckedChange={(checked) => setIncludeRecommendations(!!checked)}
                  data-testid="checkbox-recommendations"
                />
                <Label htmlFor="recommendations" className="font-normal cursor-pointer">
                  Include Recommendations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="risks"
                  checked={includeRisks}
                  onCheckedChange={(checked) => setIncludeRisks(!!checked)}
                  data-testid="checkbox-risks"
                />
                <Label htmlFor="risks" className="font-normal cursor-pointer">
                  Include Risk Assessment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                  disabled
                  data-testid="checkbox-charts"
                />
                <Label htmlFor="charts" className="font-normal cursor-pointer text-muted-foreground">
                  Include Charts (PDF only - coming soon)
                </Label>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleExportCSV}
              disabled={exporting}
              data-testid="button-export-csv"
            >
              {exporting && exportFormat === 'csv' ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-8 w-8" />
              )}
              <span className="font-semibold">Export as CSV</span>
              <span className="text-xs text-muted-foreground">Data spreadsheet</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleExportPDF}
              disabled={exporting}
              data-testid="button-export-pdf"
            >
              {exporting && exportFormat === 'pdf' ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <FileText className="h-8 w-8" />
              )}
              <span className="font-semibold">Export as PDF</span>
              <span className="text-xs text-muted-foreground">Formatted report</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
            data-testid="button-close"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
