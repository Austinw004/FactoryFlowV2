import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, FileSpreadsheet, Upload, ArrowRight, CheckCircle } from "lucide-react";
import { SiGooglesheets } from "react-icons/si";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GoogleSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const exportOptions = [
  {
    id: "forecasts",
    name: "Demand Forecasts",
    description: "Export SKU demand forecasts with confidence intervals",
    endpoint: "/api/export/forecasts",
    columns: ["SKU ID", "SKU Name", "Date", "Forecast", "Lower Bound", "Upper Bound", "MAPE"],
  },
  {
    id: "inventory",
    name: "Inventory Status",
    description: "Current inventory levels with reorder points",
    endpoint: "/api/export/inventory",
    columns: ["SKU ID", "Name", "Current Stock", "Safety Stock", "Reorder Point", "Days of Supply"],
  },
  {
    id: "suppliers",
    name: "Supplier Directory",
    description: "Complete supplier list with risk scores",
    endpoint: "/api/export/suppliers",
    columns: ["Supplier ID", "Name", "Category", "Risk Score", "Lead Time", "On-Time Delivery %"],
  },
  {
    id: "commodities",
    name: "Commodity Prices",
    description: "Current commodity prices with historical trends",
    endpoint: "/api/export/commodities",
    columns: ["Commodity", "Price", "Unit", "24h Change", "7d Change", "Trend"],
  },
  {
    id: "materials",
    name: "Materials Catalog",
    description: "Master materials list with specifications",
    endpoint: "/api/export/materials",
    columns: ["Material ID", "Name", "Category", "Unit", "Cost", "Lead Time"],
  },
];

const importTemplates = [
  {
    id: "historical-demand",
    name: "Historical Demand Data",
    description: "Upload past sales/demand data for forecast training",
    columns: ["Date", "SKU ID", "Quantity", "Revenue (optional)"],
    sampleUrl: "/api/templates/historical-demand.csv",
  },
  {
    id: "sku-catalog",
    name: "SKU Catalog",
    description: "Import your complete product catalog",
    columns: ["SKU ID", "Name", "Category", "Unit Cost", "Safety Stock"],
    sampleUrl: "/api/templates/sku-catalog.csv",
  },
  {
    id: "supplier-list",
    name: "Supplier List",
    description: "Bulk import supplier information",
    columns: ["Supplier Name", "Category", "Lead Time", "Email", "Phone"],
    sampleUrl: "/api/templates/suppliers.csv",
  },
];

export function GoogleSheetsDialog({ open, onOpenChange }: GoogleSheetsDialogProps) {
  const { toast } = useToast();
  const [selectedExport, setSelectedExport] = useState(exportOptions[0]);
  const [exportFormat, setExportFormat] = useState("csv");

  const handleExport = async (option: typeof exportOptions[0]) => {
    try {
      const response = await fetch(`${option.endpoint}?format=${exportFormat}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescient-${option.id}-${new Date().toISOString().split("T")[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: `${option.name} exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = (template: typeof importTemplates[0]) => {
    toast({
      title: "Template Download",
      description: `Downloading ${template.name} template...`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGooglesheets className="w-5 h-5 text-[#0F9D58]" />
            Google Sheets Integration
          </DialogTitle>
          <DialogDescription>
            Export data to CSV for Google Sheets or import data from spreadsheets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Export Data</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-24" data-testid="select-export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              {exportOptions.map((option) => (
                <Card
                  key={option.id}
                  className="cursor-pointer hover-elevate"
                  data-testid={`card-export-${option.id}`}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-sm">{option.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {option.description}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport(option)}
                        data-testid={`button-export-${option.id}`}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {option.columns.slice(0, 4).map((col) => (
                        <Badge key={col} variant="outline" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                      {option.columns.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{option.columns.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-base font-medium block mb-3">Import Templates</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Download CSV templates, fill them with your data, then use the CSV Import tool to upload.
            </p>

            <div className="grid gap-2">
              {importTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover-elevate"
                  data-testid={`card-template-${template.id}`}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadTemplate(template)}
                        data-testid={`button-template-${template.id}`}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        Template
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.columns.map((col) => (
                        <Badge key={col} variant="secondary" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-green-500/10 p-4 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  How to use with Google Sheets
                </p>
                <ol className="text-muted-foreground mt-2 space-y-1 text-xs list-decimal list-inside">
                  <li>Export data as CSV using the buttons above</li>
                  <li>Open Google Sheets and create a new spreadsheet</li>
                  <li>Go to File &rarr; Import &rarr; Upload</li>
                  <li>Select your exported CSV file</li>
                  <li>Choose "Replace spreadsheet" or "Insert new sheet"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
