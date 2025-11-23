import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

export function EditableBudgetGauge() {
  const [isEditing, setIsEditing] = useState(false);
  const [localBudget, setLocalBudget] = useState("");
  const [localSpent, setLocalSpent] = useState("");
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/company/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { annualBudget?: number; currentBudgetSpent?: number }) =>
      apiRequest("PATCH", "/api/company/settings", updates),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setLocalBudget(company?.annualBudget?.toString() || "");
    setLocalSpent(company?.currentBudgetSpent?.toString() || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const budget = parseFloat(localBudget) || 0;
    const spent = parseFloat(localSpent) || 0;
    
    updateMutation.mutate({
      annualBudget: budget,
      currentBudgetSpent: spent,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLocalBudget("");
    setLocalSpent("");
  };

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="card-budget-gauge">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const total = company?.annualBudget || 0;
  const spent = company?.currentBudgetSpent || 0;
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const remaining = total - spent;
  const hasData = total > 0;

  return (
    <Card className="p-6" data-testid="card-budget-gauge">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Budget Overview</h3>
          </div>
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              data-testid="button-edit-budget"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-budget">Total Budget ($)</Label>
              <Input
                id="total-budget"
                type="number"
                value={localBudget}
                onChange={(e) => setLocalBudget(e.target.value)}
                placeholder="Enter total budget"
                data-testid="input-total-budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spent-budget">Current Spent ($)</Label>
              <Input
                id="spent-budget"
                type="number"
                value={localSpent}
                onChange={(e) => setLocalSpent(e.target.value)}
                placeholder="Enter amount spent"
                data-testid="input-spent-budget"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-budget"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                data-testid="button-cancel-budget"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-mono font-semibold" data-testid="text-budget-spent">
                ${spent.toLocaleString()}
              </span>
            </div>
            <Progress value={percentage} className="h-3" data-testid="progress-budget" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-mono font-semibold" data-testid="text-budget-remaining">
                ${remaining.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Budget</span>
                <span className="font-mono font-semibold" data-testid="text-budget-total">
                  ${total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="mb-2">No budget configured</p>
            <p className="text-sm">Click Edit to set your budget</p>
          </div>
        )}
      </div>
    </Card>
  );
}
