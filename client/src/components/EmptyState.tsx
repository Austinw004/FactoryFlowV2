import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import emptyStateImage from "@assets/generated_images/Empty_state_workflow_illustration_6c62356c.png";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  showImage?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  showImage = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-state">
      {showImage && (
        <div className="mb-6 w-48 h-48 relative">
          <img 
            src={emptyStateImage} 
            alt="Empty state" 
            className="w-full h-full object-contain opacity-60"
          />
        </div>
      )}
      {Icon && !showImage && (
        <div className="mb-4 p-4 rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} data-testid="button-empty-action">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
