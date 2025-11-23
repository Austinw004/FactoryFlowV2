import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Trash2, Eye, Play, Bookmark, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedScenario, ScenarioBookmark } from "@shared/schema";

interface ScenarioLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadTemplate?: (template: SavedScenario) => void;
  onViewBookmark?: (bookmark: ScenarioBookmark) => void;
  onCompareBookmarks?: (bookmarks: ScenarioBookmark[]) => void;
}

export function ScenarioLibrary({ 
  open, 
  onOpenChange, 
  onLoadTemplate,
  onViewBookmark,
  onCompareBookmarks 
}: ScenarioLibraryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);

  const { data: templates, isLoading: templatesLoading } = useQuery<SavedScenario[]>({
    queryKey: ['/api/saved-scenarios', { isTemplate: 1 }],
    enabled: open,
  });

  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<ScenarioBookmark[]>({
    queryKey: ['/api/scenario-bookmarks'],
    enabled: open,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/saved-scenarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-scenarios'] });
      toast({
        title: "Template Deleted",
        description: "Scenario template has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/scenario-bookmarks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scenario-bookmarks'] });
      setSelectedBookmarks(prev => prev.filter(id => id !== deleteBookmarkMutation.variables));
      toast({
        title: "Bookmark Deleted",
        description: "Scenario bookmark has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = templates?.filter(t => 
    searchQuery === '' || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const filteredBookmarks = bookmarks?.filter(b => 
    searchQuery === '' || 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleToggleBookmarkSelection = (id: string) => {
    setSelectedBookmarks(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const handleCompareSelected = () => {
    if (selectedBookmarks.length < 2) {
      toast({
        title: "Selection Required",
        description: "Please select at least 2 bookmarks to compare",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedBookmarks.length > 3) {
      toast({
        title: "Too Many Selected",
        description: "Please select at most 3 bookmarks to compare",
        variant: "destructive",
      });
      return;
    }

    const selectedBookmarkData = bookmarks?.filter(b => selectedBookmarks.includes(b.id)) || [];
    onCompareBookmarks?.(selectedBookmarkData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]" data-testid="dialog-scenario-library">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Scenario Library</DialogTitle>
          <DialogDescription>
            Browse your saved templates and bookmarked scenario results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" data-testid="tab-templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates ({filteredTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="bookmarks" data-testid="tab-bookmarks">
                <Bookmark className="h-4 w-4 mr-2" />
                Bookmarks ({filteredBookmarks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-3 max-h-[450px] overflow-y-auto">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-templates">
                  <p>No templates found</p>
                  <p className="text-sm mt-1">Save a scenario as a template to reuse configurations</p>
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <Card key={template.id} data-testid={`card-template-${template.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base" data-testid={`text-template-name-${template.id}`}>
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="outline" data-testid={`badge-type-${template.id}`}>
                          {template.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {template.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onLoadTemplate?.(template);
                            onOpenChange(false);
                          }}
                          data-testid={`button-load-${template.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          disabled={deleteTemplateMutation.isPending}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="space-y-3">
              {selectedBookmarks.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm" data-testid="text-selected-count">
                    {selectedBookmarks.length} bookmark{selectedBookmarks.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBookmarks([])}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCompareSelected}
                      disabled={selectedBookmarks.length < 2 || selectedBookmarks.length > 3}
                      data-testid="button-compare-selected"
                    >
                      Compare ({selectedBookmarks.length})
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {bookmarksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredBookmarks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-bookmarks">
                    <p>No bookmarks found</p>
                    <p className="text-sm mt-1">Run a scenario and bookmark the results for later comparison</p>
                  </div>
                ) : (
                  filteredBookmarks.map(bookmark => (
                    <Card 
                      key={bookmark.id} 
                      className={selectedBookmarks.includes(bookmark.id) ? 'border-primary' : ''}
                      data-testid={`card-bookmark-${bookmark.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedBookmarks.includes(bookmark.id)}
                            onChange={() => handleToggleBookmarkSelection(bookmark.id)}
                            className="mt-1"
                            data-testid={`checkbox-bookmark-${bookmark.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base" data-testid={`text-bookmark-name-${bookmark.id}`}>
                              {bookmark.name}
                            </CardTitle>
                            {bookmark.notes && (
                              <CardDescription className="mt-1">
                                {bookmark.notes}
                              </CardDescription>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {bookmark.fdrAtTime && (
                                <span data-testid={`text-fdr-${bookmark.id}`}>
                                  FDR: {bookmark.fdrAtTime.toFixed(2)}
                                </span>
                              )}
                              {bookmark.regimeAtTime && (
                                <span data-testid={`text-regime-${bookmark.id}`}>
                                  Regime: {bookmark.regimeAtTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onViewBookmark?.(bookmark);
                            onOpenChange(false);
                          }}
                          data-testid={`button-view-${bookmark.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBookmarkMutation.mutate(bookmark.id)}
                          disabled={deleteBookmarkMutation.isPending}
                          data-testid={`button-delete-${bookmark.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
