import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Pencil, Trash2, Building2, Factory, Briefcase, Loader2 } from "lucide-react";
import type { CompanyLocation } from "@shared/schema";

export function LocationsManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    locationType: "warehouse" as "warehouse" | "factory" | "office" | "other",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    isPrimary: 0,
  });

  const { data: locations = [], isLoading } = useQuery<CompanyLocation[]>({
    queryKey: ['/api/company/locations'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/company/locations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/locations'] });
      toast({ title: "Success", description: "Location created successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest('PATCH', `/api/company/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/locations'] });
      toast({ title: "Success", description: "Location updated successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/company/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/locations'] });
      toast({ title: "Success", description: "Location deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      locationType: "warehouse",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      isPrimary: 0,
    });
    setEditingLocation(null);
    setDialogOpen(false);
  };

  const handleEdit = (location: CompanyLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      locationType: location.locationType as "warehouse" | "factory" | "office" | "other",
      addressLine1: location.addressLine1 || "",
      addressLine2: location.addressLine2 || "",
      city: location.city || "",
      state: location.state || "",
      postalCode: location.postalCode || "",
      country: location.country || "",
      contactName: location.contactName || "",
      contactEmail: location.contactEmail || "",
      contactPhone: location.contactPhone || "",
      isPrimary: location.isPrimary || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case "factory": return <Factory className="h-4 w-4" />;
      case "office": return <Briefcase className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Company Locations
            </CardTitle>
            <CardDescription>Manage warehouses, factories, and office locations</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-location">
            <Plus className="h-4 w-4 mr-1" />
            Add Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No locations added yet</p>
            <p className="text-sm">Add your first warehouse, factory, or office location</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id} data-testid={`location-row-${location.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getLocationIcon(location.locationType)}
                      {location.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{location.locationType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {location.city && location.state 
                      ? `${location.city}, ${location.state}` 
                      : location.city || location.state || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {location.contactName || "—"}
                  </TableCell>
                  <TableCell>
                    {location.isPrimary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(location)}
                        data-testid={`button-edit-${location.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this location?')) {
                            deleteMutation.mutate(location.id);
                          }
                        }}
                        data-testid={`button-delete-${location.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-location-form">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
              <DialogDescription>
                {editingLocation ? "Update location details" : "Add a new warehouse, factory, or office location"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Warehouse"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-location-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationType">Type *</Label>
                  <select
                    id="locationType"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
                    data-testid="select-location-type"
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="factory">Factory</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input
                  id="address1"
                  placeholder="Street address"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  data-testid="input-address1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  placeholder="Suite, unit, building, floor, etc."
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  data-testid="input-address2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    data-testid="input-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal Code</Label>
                  <Input
                    id="postal"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    data-testid="input-postal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  data-testid="input-country"
                />
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Contact Information</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      placeholder="Site manager name"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="manager@company.com"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        data-testid="input-contact-phone"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary === 1}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-input"
                  data-testid="checkbox-primary"
                />
                <Label htmlFor="isPrimary" className="cursor-pointer">
                  Set as primary location
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={resetForm} data-testid="button-cancel-location">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.locationType || createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-location"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                )}
                {editingLocation ? "Update Location" : "Create Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
