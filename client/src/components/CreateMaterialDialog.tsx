import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package2, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommodityPrice {
  code: string;
  name: string;
  price: number;
  unit: string;
  change24h?: number;
}

interface CreateMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMaterialDialog({ open, onOpenChange }: CreateMaterialDialogProps) {
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [onHand, setOnHand] = useState("");
  const [inbound, setInbound] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityPrice | null>(null);
  
  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery<CommodityPrice[]>({
    queryKey: ['/api/commodities/prices'],
    enabled: open,
  });
  
  const filteredCommodities = commodities.filter(c =>
    (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );
  
  const createMaterialMutation = useMutation({
    mutationFn: async () => {
      const materialData = {
        code: code.trim(),
        name: name.trim(),
        unit: unit.trim(),
        onHand: parseFloat(onHand) || 0,
        inbound: parseFloat(inbound) || 0,
      };
      
      return await apiRequest('POST', '/api/materials', materialData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      toast({
        title: "Success",
        description: "Material created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleClose = () => {
    setCode("");
    setName("");
    setUnit("");
    setOnHand("");
    setInbound("");
    setSearchQuery("");
    setSelectedCommodity(null);
    onOpenChange(false);
  };
  
  const handleSelectCommodity = (commodity: CommodityPrice) => {
    setSelectedCommodity(commodity);
    setCode(commodity.code);
    setName(commodity.name);
    setUnit(commodity.unit);
  };
  
  const canSubmit = code.trim() && name.trim() && unit.trim();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-material">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Create New Material
          </DialogTitle>
          <DialogDescription>
            Browse our commodity catalog or create a custom material
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Commodity Catalog */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commodity-search">Browse Commodities ({commodities.length}+ available)</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="commodity-search"
                      placeholder="Search copper, steel, aluminum..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-commodity-search"
                    />
                  </div>
                </div>
                
                <ScrollArea className="h-80 pr-4">
                  {commoditiesLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCommodities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? "No commodities found" : "No commodities available"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredCommodities.slice(0, 50).map((commodity) => (
                        <button
                          key={commodity.code}
                          type="button"
                          onClick={() => handleSelectCommodity(commodity)}
                          className={`w-full text-left p-3 rounded-md border hover-elevate transition-colors ${
                            selectedCommodity?.code === commodity.code
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                          data-testid={`commodity-${commodity.code}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{commodity.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{commodity.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono">${commodity.price.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">/{commodity.unit}</p>
                              {commodity.change24h !== undefined && (
                                <div className={`flex items-center gap-1 text-xs ${
                                  commodity.change24h > 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {commodity.change24h > 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {Math.abs(commodity.change24h).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Right: Material Details Form */}
          <div className="space-y-4">
            {selectedCommodity && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Selected</Badge>
                    <span className="text-sm font-medium">{selectedCommodity.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current market price: ${selectedCommodity.price.toFixed(2)}/{selectedCommodity.unit}
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material-code">Material Code *</Label>
                <Input
                  id="material-code"
                  placeholder="e.g., ALU-6061"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  data-testid="input-material-code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="material-name">Material Name *</Label>
                <Input
                  id="material-name"
                  placeholder="e.g., Aluminum Alloy 6061"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-material-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="material-unit">Unit of Measure *</Label>
                <select
                  id="material-unit"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  data-testid="select-material-unit"
                >
                  <option value="">Select unit...</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="mt">Metric Tons (mt)</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="g">Grams (g)</option>
                  <option value="l">Liters (l)</option>
                  <option value="gal">Gallons (gal)</option>
                  <option value="m">Meters (m)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="pcs">Pieces (pcs)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="on-hand">On Hand Quantity</Label>
                  <Input
                    id="on-hand"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={onHand}
                    onChange={(e) => setOnHand(e.target.value)}
                    data-testid="input-on-hand"
                  />
                  <p className="text-xs text-muted-foreground">Current inventory</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inbound">Inbound Quantity</Label>
                  <Input
                    id="inbound"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={inbound}
                    onChange={(e) => setInbound(e.target.value)}
                    data-testid="input-inbound"
                  />
                  <p className="text-xs text-muted-foreground">Expected arrivals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => createMaterialMutation.mutate()}
            disabled={!canSubmit || createMaterialMutation.isPending}
            data-testid="button-submit"
          >
            {createMaterialMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
