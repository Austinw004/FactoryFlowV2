import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SaveScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioData?: {
    type: 'economic' | 'geopolitical' | 'combined';
    configuration: any;
    results?: any;
    currentFDR?: number;
    currentRegime?: string;
  };
}

export function SaveScenarioDialog({ open, onOpenChange, scenarioData }: SaveScenarioDialogProps) {
  const { toast } = useToast();
  const [saveType, setSaveType] = useState<'template' | 'bookmark'>('bookmark');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/saved-scenarios', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-scenarios'] });
      toast({
        title: "Template Saved",
        description: "Your scenario template has been saved successfully",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveBookmarkMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/scenario-bookmarks', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scenario-bookmarks'] });
      toast({
        title: "Bookmark Saved",
        description: "Your scenario results have been bookmarked successfully",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setNotes('');
    setTags([]);
    setTagInput('');
    setSaveType('bookmark');
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    if (!scenarioData) {
      toast({
        title: "Nothing to save yet",
        description: "Configure a scenario first — once you've set assumptions you can save it as a template or snapshot.",
        variant: "destructive",
      });
      return;
    }

    if (saveType === 'template') {
      saveTemplateMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        type: scenarioData.type,
        configuration: scenarioData.configuration,
        tags,
        isTemplate: 1,
      });
    } else {
      if (!scenarioData.results) {
        toast({
          title: "No Results",
          description: "Cannot bookmark without analysis results. Please run the scenario first.",
          variant: "destructive",
        });
        return;
      }
      
      saveBookmarkMutation.mutate({
        name: name.trim(),
        notes: notes.trim() || undefined,
        results: scenarioData.results,
        fdrAtTime: scenarioData.currentFDR,
        regimeAtTime: scenarioData.currentRegime,
      });
    }
  };

  const isPending = saveTemplateMutation.isPending || saveBookmarkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-save-scenario">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Save Scenario</DialogTitle>
          <DialogDescription>
            Save your scenario as a reusable template or bookmark the results for later comparison
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Save As</Label>
            <RadioGroup 
              value={saveType} 
              onValueChange={(value: 'template' | 'bookmark') => setSaveType(value)}
              data-testid="radio-save-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="template" id="template" data-testid="radio-template" />
                <Label htmlFor="template" className="font-normal cursor-pointer">
                  Template (reusable configuration)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bookmark" id="bookmark" data-testid="radio-bookmark" />
                <Label htmlFor="bookmark" className="font-normal cursor-pointer">
                  Bookmark (save results with notes)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Steel Price Surge 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-name"
            />
          </div>

          {saveType === 'template' ? (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this template does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                data-testid="textarea-description"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this scenario's results..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          )}

          {saveType === 'template' && (
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  data-testid="input-tags"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddTag}
                  data-testid="button-add-tag"
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="gap-1"
                      data-testid={`badge-tag-${tag}`}
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:opacity-70" 
                        onClick={() => handleRemoveTag(tag)}
                        data-testid={`button-remove-tag-${tag}`}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            data-testid="button-save"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save {saveType === 'template' ? 'Template' : 'Bookmark'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
