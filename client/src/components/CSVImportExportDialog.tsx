import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Loader2,
  ArrowRight,
  Table,
  UploadCloud,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

type ImportEntity = "skus" | "materials" | "suppliers";

interface ImportResult {
  entity: ImportEntity;
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

interface CSVImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVImportExportDialog({ open, onOpenChange }: CSVImportExportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  
  const [selectedEntity, setSelectedEntity] = useState<ImportEntity>("skus");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStep, setImportStep] = useState<"select" | "preview" | "result">("select");
  
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportEntities, setExportEntities] = useState<string[]>(["skus", "materials", "suppliers"]);

  const entityOptions = [
    { value: "skus", label: "SKUs", description: "Product SKUs and catalog items" },
    { value: "materials", label: "Materials", description: "Raw materials and components" },
    { value: "suppliers", label: "Suppliers", description: "Supplier directory" },
  ];

  const exportEntityOptions = [
    { value: "skus", label: "SKUs" },
    { value: "materials", label: "Materials" },
    { value: "suppliers", label: "Suppliers" },
    { value: "allocations", label: "Allocations" },
    { value: "machinery", label: "Machinery" },
  ];

  const downloadTemplateMutation = useMutation({
    mutationFn: async (entity: ImportEntity) => {
      const response = await fetch(`/api/data/import/template/${entity}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Template Downloaded",
        description: "CSV template has been downloaded to your device.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("entity", selectedEntity);
      formData.append("updateExisting", String(updateExisting));
      
      const response = await fetch("/api/data/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }
      
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setImportStep("result");
      
      queryClient.invalidateQueries({ queryKey: ["/api/skus"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"], refetchType: "all" });
      
      if (result.failed === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.successful} ${selectedEntity}.`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${result.successful} of ${result.total} records. ${result.failed} failed.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/data/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          entities: exportEntities,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
      
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `export_${Date.now()}.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Your data has been exported and downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const parseCSVPreview = (content: string): string[][] => {
    const lines = content.split("\n").slice(0, 6);
    return lines.map(line => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file. Excel files (.xlsx, .xls) are not yet supported.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const preview = parseCSVPreview(content);
      setPreviewData(preview);
      setImportStep("preview");
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setImportStep("select");
  };

  const toggleExportEntity = (entity: string) => {
    setExportEntities(prev => 
      prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  const getExpectedColumns = (entity: ImportEntity): string[] => {
    switch (entity) {
      case "skus":
        return ["code", "name", "priority"];
      case "materials":
        return ["name", "category", "unit", "currentPrice", "quantityAvailable", "reorderPoint", "leadTimeDays"];
      case "suppliers":
        return ["name", "contactEmail", "contactPhone", "location", "reliabilityScore", "leadTimeDays"];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV Import & Export
          </DialogTitle>
          <DialogDescription>
            Import data from spreadsheets or export your data for backup and analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "import" | "export")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2" data-testid="tab-import">
              <Upload className="w-4 h-4" />
              Import Data
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2" data-testid="tab-export">
              <Download className="w-4 h-4" />
              Export Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6 mt-6">
            {importStep === "select" && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Select Data Type</Label>
                    <p className="text-xs text-muted-foreground mb-2">Choose what type of data you're importing</p>
                    <div className="grid grid-cols-3 gap-3">
                      {entityOptions.map((option) => (
                        <Card
                          key={option.value}
                          className={`cursor-pointer transition-colors ${
                            selectedEntity === option.value
                              ? "border-primary bg-primary/5"
                              : "hover-elevate"
                          }`}
                          onClick={() => setSelectedEntity(option.value as ImportEntity)}
                          data-testid={`card-entity-${option.value}`}
                        >
                          <CardContent className="p-4 text-center">
                            <p className="font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Download Template</p>
                          <p className="text-xs text-muted-foreground">Get a pre-formatted CSV template with example data</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplateMutation.mutate(selectedEntity)}
                          disabled={downloadTemplateMutation.isPending}
                          data-testid="button-download-template"
                        >
                          {downloadTemplateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download {selectedEntity.charAt(0).toUpperCase() + selectedEntity.slice(1)} Template
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    data-testid="dropzone-upload"
                  >
                    <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium mb-1">Drag and drop your file here</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-file"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" asChild>
                        <span className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />
                          Select File
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-4">
                      Supported format: CSV (.csv)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="update-existing"
                      checked={updateExisting}
                      onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                      data-testid="checkbox-update-existing"
                    />
                    <Label htmlFor="update-existing" className="text-sm">
                      Update existing records if duplicates are found
                    </Label>
                  </div>
                </div>
              </>
            )}

            {importStep === "preview" && previewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-good" />
                    <div>
                      <p className="font-medium">{selectedFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {previewData.length > 1 ? `${previewData.length - 1} data rows found` : "No data rows found"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetImport}>
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      Data Preview
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {previewData[0]?.map((header, idx) => (
                              <th key={idx} className="text-left p-2 font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(1, 5).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b last:border-0">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="p-2 text-muted-foreground">
                                  {cell || <span className="text-muted-foreground/50">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Showing first {Math.min(4, previewData.length - 1)} of {previewData.length - 1} rows
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-signal mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Column Mapping</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Make sure your columns match the expected format
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {getExpectedColumns(selectedEntity).map((col) => (
                            <Badge key={col} variant="outline" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={resetImport}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending}
                    data-testid="button-start-import"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Import Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {importStep === "result" && importResult && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResult.failed === 0 ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                  <div className="flex items-center gap-3 mb-4">
                    {importResult.failed === 0 ? (
                      <CheckCircle className="w-8 h-8 text-good" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-signal" />
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        {importResult.failed === 0 ? "Import Successful!" : "Import Completed with Issues"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {importResult.successful} of {importResult.total} records imported successfully
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{importResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total Records</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-500">{importResult.successful}</p>
                        <p className="text-xs text-muted-foreground">Successful</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-500">{importResult.failed}</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Card className="border-red-500/30">
                    <CardContent className="p-4">
                      <p className="font-medium text-sm mb-3 flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        Error Details
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((error, idx) => (
                          <div key={idx} className="text-sm p-2 bg-muted rounded">
                            <span className="font-medium">Row {error.row}:</span>{" "}
                            <span className="text-muted-foreground">{error.error}</span>
                          </div>
                        ))}
                        {importResult.errors.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            And {importResult.errors.length - 10} more errors...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <Button onClick={resetImport} data-testid="button-import-another">
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Export Format</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose the file format for your export</p>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`cursor-pointer transition-colors ${
                      exportFormat === "csv" ? "border-primary bg-primary/5" : "hover-elevate"
                    }`}
                    onClick={() => setExportFormat("csv")}
                    data-testid="card-format-csv"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-good" />
                      <div>
                        <p className="font-medium">CSV</p>
                        <p className="text-xs text-muted-foreground">Open in Excel, Google Sheets</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-colors ${
                      exportFormat === "json" ? "border-primary bg-primary/5" : "hover-elevate"
                    }`}
                    onClick={() => setExportFormat("json")}
                    data-testid="card-format-json"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="font-medium">JSON</p>
                        <p className="text-xs text-muted-foreground">For developers & APIs</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Select Data to Export</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose which data sets to include in the export</p>
                <div className="grid grid-cols-2 gap-2">
                  {exportEntityOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`export-${option.value}`}
                        checked={exportEntities.includes(option.value)}
                        onCheckedChange={() => toggleExportEntity(option.value)}
                        data-testid={`checkbox-export-${option.value}`}
                      />
                      <Label htmlFor={`export-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm">
                    <span className="font-medium">Export includes:</span> Company metadata, selected data types, and all associated records. Data is exported in a format that can be re-imported later.
                  </p>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending || exportEntities.length === 0}
                data-testid="button-export"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {exportEntities.length} Data Set{exportEntities.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
