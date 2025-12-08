import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIndustryPersonalization } from "@/hooks/useIndustryPersonalization";
import { Factory, Star, TrendingUp, Plus, Loader2 } from "lucide-react";

interface IndustryCommoditySuggestionsProps {
  onAddToWatchlist?: (commodity: string) => void;
  showHeader?: boolean;
  compact?: boolean;
}

export function IndustryCommoditySuggestions({ 
  onAddToWatchlist,
  showHeader = true,
  compact = false 
}: IndustryCommoditySuggestionsProps) {
  const { 
    industry, 
    suggestedCommodities, 
    isLoading,
    config
  } = useIndustryPersonalization();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  const highRelevance = suggestedCommodities.filter(c => c.relevance === "high");
  const mediumRelevance = suggestedCommodities.filter(c => c.relevance === "medium");
  
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Factory className="h-4 w-4" />
          <span>Suggested for {industry}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {highRelevance.map((commodity, idx) => (
            <Badge 
              key={idx}
              variant="default"
              className="gap-1 cursor-pointer hover-elevate"
              onClick={() => onAddToWatchlist?.(commodity.name)}
              data-testid={`badge-commodity-${idx}`}
            >
              <Star className="h-3 w-3" />
              {commodity.name}
            </Badge>
          ))}
          {mediumRelevance.slice(0, 4).map((commodity, idx) => (
            <Badge 
              key={`med-${idx}`}
              variant="secondary"
              className="cursor-pointer hover-elevate"
              onClick={() => onAddToWatchlist?.(commodity.name)}
              data-testid={`badge-commodity-medium-${idx}`}
            >
              {commodity.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="h-5 w-5 text-primary" />
              Commodities for {industry}
            </CardTitle>
            <Badge variant="outline" data-testid="badge-suggestion-count">
              {suggestedCommodities.length} suggested
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {highRelevance.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-yellow-500" />
              High Relevance
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {highRelevance.map((commodity, idx) => (
                <CommodityCard 
                  key={idx}
                  name={commodity.name}
                  reason={commodity.reason}
                  relevance="high"
                  onAdd={() => onAddToWatchlist?.(commodity.name)}
                  testId={`card-commodity-high-${idx}`}
                />
              ))}
            </div>
          </div>
        )}
        
        {mediumRelevance.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Also Relevant
            </div>
            <div className="flex flex-wrap gap-2">
              {mediumRelevance.map((commodity, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover-elevate py-1.5 px-3"
                  onClick={() => onAddToWatchlist?.(commodity.name)}
                  data-testid={`badge-commodity-med-${idx}`}
                >
                  {commodity.name}
                  <Plus className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {config?.procurementFocus && config.procurementFocus.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-sm font-medium mb-2">Procurement Focus Areas</div>
            <div className="flex flex-wrap gap-2">
              {config.procurementFocus.slice(0, 4).map((focus, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs"
                  data-testid={`badge-focus-${idx}`}
                >
                  {focus}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommodityCard({ 
  name, 
  reason, 
  relevance, 
  onAdd,
  testId 
}: { 
  name: string; 
  reason: string; 
  relevance: string;
  onAdd?: () => void;
  testId?: string;
}) {
  return (
    <div 
      className="p-3 rounded-lg border bg-card hover-elevate cursor-pointer group"
      onClick={onAdd}
      data-testid={testId}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{name}</div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {reason}
          </p>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
