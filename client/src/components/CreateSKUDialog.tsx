import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, CheckCircle2, Package, Layers, Target, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Material } from "@shared/schema";

interface BOMItem {
  materialId: string;
  materialName: string;
  quantityPerUnit: number;
}

interface CreateSKUDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSKUDialog({ open, onOpenChange }: CreateSKUDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  // Step 1: Basic Info
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("1.0");
  
  // Step 2: BOM
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  
  // Step 3: Demand (optional)
  const [targetUnits, setTargetUnits] = useState("");
  
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
    enabled: open && step === 2,
  });
  
  const createSKUMutation = useMutation({
    mutationFn: async () => {
      // Create SKU
      const skuData = {
        code,
        name,
        priority: parseFloat(priority) || 1.0,
      };
      
      const skuResponse = await apiRequest('POST', '/api/skus', skuData);
      const sku = await skuResponse.json();
      
      // Create BOM items
      if (bomItems.length > 0) {
        await Promise.all(
          bomItems.map(item =>
            apiRequest('POST', '/api/boms', {
              skuId: sku.id,
              materialId: item.materialId,
              quantityPerUnit: item.quantityPerUnit,
            })
          )
        );
      }
      
      // Create demand history if provided
      if (targetUnits && parseFloat(targetUnits) > 0) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await apiRequest('POST', '/api/demand', {
          skuId: sku.id,
          period,
          units: parseFloat(targetUnits),
        });
      }
      
      return sku;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/skus'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      toast({
        title: "Success",
        description: "SKU created successfully",
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
    setStep(1);
    setCode("");
    setName("");
    setPriority("1.0");
    setBomItems([]);
    setSelectedMaterialId("");
    setQuantity("");
    setTargetUnits("");
    onOpenChange(false);
  };
  
  const handleAddBOMItem = () => {
    if (!selectedMaterialId || !quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select a material and enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;
    
    setBomItems([...bomItems, {
      materialId: selectedMaterialId,
      materialName: material.name,
      quantityPerUnit: parseFloat(quantity),
    }]);
    setSelectedMaterialId("");
    setQuantity("");
  };
  
  const handleRemoveBOMItem = (materialId: string) => {
    setBomItems(bomItems.filter(item => item.materialId !== materialId));
  };
  
  const canProceedStep1 = code.trim() && name.trim() && parseFloat(priority) > 0;
  const canSubmit = canProceedStep1;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-sku">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New SKU
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? "Basic Information" : step === 2 ? "Bill of Materials" : "Production Targets"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Indicator */}
        <div className="flex gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
              data-testid={`progress-step-${s}`}
            />
          ))}
        </div>
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sku-code">SKU Code *</Label>
              <Input
                id="sku-code"
                placeholder="e.g., WIDGET-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="input-sku-code"
              />
              <p className="text-xs text-muted-foreground">Unique identifier for this product</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku-name">Product Name *</Label>
              <Input
                id="sku-name"
                placeholder="e.g., Premium Widget A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-sku-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku-priority">Priority Score *</Label>
              <Input
                id="sku-priority"
                type="number"
                step="0.1"
                min="0"
                placeholder="1.0"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="input-sku-priority"
              />
              <p className="text-xs text-muted-foreground">
                Higher priority SKUs get preferential material allocation (default: 1.0)
              </p>
            </div>
          </div>
        )}
        
        {/* Step 2: BOM */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Bill of Materials (BOM)
                </CardTitle>
                <CardDescription>
                  Define which materials are needed to produce this SKU
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No materials available. Create materials first to define a BOM.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="material-select">Material</Label>
                        <select
                          id="material-select"
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={selectedMaterialId}
                          onChange={(e) => setSelectedMaterialId(e.target.value)}
                          data-testid="select-material"
                        >
                          <option value="">Select material...</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="quantity-per-unit">Qty/Unit</Label>
                        <div className="flex gap-1">
                          <Input
                            id="quantity-per-unit"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1.0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            data-testid="input-quantity-per-unit"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="default"
                            onClick={handleAddBOMItem}
                            data-testid="button-add-bom-item"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {bomItems.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Materials ({bomItems.length})</Label>
                        <ScrollArea className="h-40 rounded-md border p-2">
                          {bomItems.map((item) => (
                            <div
                              key={item.materialId}
                              className="flex items-center justify-between p-2 hover-elevate rounded-md mb-1"
                              data-testid={`bom-item-${item.materialId}`}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.materialName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Quantity: {item.quantityPerUnit} per unit
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveBOMItem(item.materialId)}
                                data-testid={`button-remove-bom-${item.materialId}`}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            
            <p className="text-xs text-muted-foreground">
              You can skip this step and add materials later
            </p>
          </div>
        )}
        
        {/* Step 3: Targets */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Production Targets (Optional)
                </CardTitle>
                <CardDescription>
                  Set initial demand forecast for this SKU
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-units">Target Units (This Month)</Label>
                  <Input
                    id="target-units"
                    type="number"
                    min="0"
                    placeholder="e.g., 1000"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(e.target.value)}
                    data-testid="input-target-units"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps the allocation engine prioritize materials
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Ready to Create
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU Code:</span>
                  <span className="font-mono font-medium">{code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Name:</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant="secondary">{priority}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BOM Items:</span>
                  <Badge>{bomItems.length} materials</Badge>
                </div>
                {targetUnits && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-mono">{targetUnits} units/month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        <DialogFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                data-testid="button-prev-step"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !canProceedStep1}
                data-testid="button-next-step"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => createSKUMutation.mutate()}
                disabled={!canSubmit || createSKUMutation.isPending}
                data-testid="button-submit"
              >
                {createSKUMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create SKU
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
