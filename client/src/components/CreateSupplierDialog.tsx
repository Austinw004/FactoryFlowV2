import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Building2, Link as LinkIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Material } from "@shared/schema";

interface MaterialPricing {
  materialId: string;
  materialName: string;
  unitCost: number;
  leadTimeDays: number;
}

interface CreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSupplierDialog({ open, onOpenChange }: CreateSupplierDialogProps) {
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [linkMaterials, setLinkMaterials] = useState(false);
  const [materialPricings, setMaterialPricings] = useState<MaterialPricing[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
    enabled: open && linkMaterials,
  });
  
  const createSupplierMutation = useMutation({
    mutationFn: async () => {
      // Create supplier
      const supplierData = {
        name: name.trim(),
        contactEmail: contactEmail.trim() || undefined,
      };
      
      const supplierResponse = await apiRequest('POST', '/api/suppliers', supplierData);
      const supplier = await supplierResponse.json();
      
      // Create material pricing links
      if (linkMaterials && materialPricings.length > 0) {
        await Promise.all(
          materialPricings.map(pricing =>
            apiRequest('POST', '/api/supplier-materials', {
              supplierId: supplier.id,
              materialId: pricing.materialId,
              unitCost: pricing.unitCost,
              leadTimeDays: pricing.leadTimeDays,
            })
          )
        );
      }
      
      return supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      toast({
        title: "Success",
        description: "Supplier created successfully",
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
    setName("");
    setContactEmail("");
    setLinkMaterials(false);
    setMaterialPricings([]);
    setSelectedMaterialId("");
    setUnitCost("");
    setLeadTimeDays("14");
    onOpenChange(false);
  };
  
  const handleAddMaterialPricing = () => {
    if (!selectedMaterialId || !unitCost || parseFloat(unitCost) <= 0 || parseInt(leadTimeDays) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please fill in all material pricing fields correctly",
        variant: "destructive",
      });
      return;
    }
    
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;
    
    // Check if already added
    if (materialPricings.some(p => p.materialId === selectedMaterialId)) {
      toast({
        title: "Already added",
        description: "This material is already in the list",
        variant: "destructive",
      });
      return;
    }
    
    setMaterialPricings([...materialPricings, {
      materialId: selectedMaterialId,
      materialName: material.name,
      unitCost: parseFloat(unitCost),
      leadTimeDays: parseInt(leadTimeDays),
    }]);
    setSelectedMaterialId("");
    setUnitCost("");
    setLeadTimeDays("14");
  };
  
  const handleRemoveMaterialPricing = (materialId: string) => {
    setMaterialPricings(materialPricings.filter(p => p.materialId !== materialId));
  };
  
  const canSubmit = name.trim();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-supplier">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Supplier
          </DialogTitle>
          <DialogDescription>
            Add a supplier and optionally link their material pricing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Supplier Name *</Label>
              <Input
                id="supplier-name"
                placeholder="e.g., ABC Manufacturing Co."
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-supplier-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="e.g., contact@supplier.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                data-testid="input-contact-email"
              />
              <p className="text-xs text-muted-foreground">Optional - for procurement communications</p>
            </div>
          </div>
          
          {/* Link Materials */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="link-materials"
                checked={linkMaterials}
                onCheckedChange={(checked) => setLinkMaterials(checked as boolean)}
                data-testid="checkbox-link-materials"
              />
              <Label htmlFor="link-materials" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Link materials and pricing
              </Label>
            </div>
            
            {linkMaterials && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Material Pricing
                  </CardTitle>
                  <CardDescription>
                    Define which materials this supplier provides and their pricing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {materials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No materials available. Create materials first to link pricing.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2">
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
                          <Label htmlFor="unit-cost">Unit Cost ($)</Label>
                          <Input
                            id="unit-cost"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="10.50"
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                            data-testid="input-unit-cost"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lead-time">Lead (days)</Label>
                          <div className="flex gap-1">
                            <Input
                              id="lead-time"
                              type="number"
                              min="1"
                              placeholder="14"
                              value={leadTimeDays}
                              onChange={(e) => setLeadTimeDays(e.target.value)}
                              data-testid="input-lead-time"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="default"
                              onClick={handleAddMaterialPricing}
                              data-testid="button-add-pricing"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {materialPricings.length > 0 && (
                        <div className="space-y-2">
                          <Label>Linked Materials ({materialPricings.length})</Label>
                          <ScrollArea className="h-40 rounded-md border p-2">
                            {materialPricings.map((pricing) => (
                              <div
                                key={pricing.materialId}
                                className="flex items-center justify-between p-2 hover-elevate rounded-md mb-1"
                                data-testid={`pricing-${pricing.materialId}`}
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{pricing.materialName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ${pricing.unitCost.toFixed(2)}/unit · {pricing.leadTimeDays} days lead time
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMaterialPricing(pricing.materialId)}
                                  data-testid={`button-remove-pricing-${pricing.materialId}`}
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
            )}
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
            onClick={() => createSupplierMutation.mutate()}
            disabled={!canSubmit || createSupplierMutation.isPending}
            data-testid="button-submit"
          >
            {createSupplierMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
