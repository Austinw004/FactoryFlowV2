import { Children, isValidElement, ReactElement, ReactNode, useMemo } from "react";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWidgetUsage } from "@/hooks/useWidgetUsage";
import { Button } from "@/components/ui/button";

interface AdaptiveWidgetGridProps {
  /** Current user role — drives default ordering before usage data builds up. */
  role?: string;
  /** Grid column class, defaults to responsive 1/2/3 grid. */
  className?: string;
  /** Show a small pin toggle in the top-right of each widget. */
  showPinControls?: boolean;
  /** Children — each must declare a `data-widget-id` prop for tracking + ordering. */
  children: ReactNode;
}

/**
 * AdaptiveWidgetGrid — renders its children in a grid, ordered by the per-user
 * usage model in `useWidgetUsage`. Children must declare a `data-widget-id`
 * prop so the grid can identify and reorder them.
 *
 * Example:
 *   <AdaptiveWidgetGrid role={user.role}>
 *     <RegimeStatus data-widget-id="regime" />
 *     <MaterialsAtRiskWidget data-widget-id="materials-at-risk" />
 *     <QuickWinsWidget data-widget-id="quick-wins" />
 *   </AdaptiveWidgetGrid>
 */
export function AdaptiveWidgetGrid({
  role,
  className,
  showPinControls = true,
  children,
}: AdaptiveWidgetGridProps) {
  const { orderWidgets, isPinned, togglePin } = useWidgetUsage(role);

  const ordered = useMemo(() => {
    const entries: { id: string; node: ReactElement }[] = [];
    Children.forEach(children, (child, index) => {
      if (!isValidElement(child)) return;
      const id =
        (child.props as Record<string, unknown>)["data-widget-id"] as string | undefined;
      if (!id) {
        // Unidentified widgets still render but get a synthetic id so order is stable.
        entries.push({ id: `__unknown_${index}`, node: child });
        return;
      }
      entries.push({ id, node: child });
    });

    const sorted = orderWidgets(entries.map((e) => e.id));
    const byId = new Map(entries.map((e) => [e.id, e.node]));
    return sorted.map((id) => ({ id, node: byId.get(id)! })).filter((e) => !!e.node);
  }, [children, orderWidgets]);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",
        className,
      )}
      data-testid="adaptive-widget-grid"
    >
      {ordered.map(({ id, node }) => (
        <div key={id} className="relative group" data-widget-slot={id}>
          {showPinControls && !id.startsWith("__unknown_") && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => togglePin(id)}
              className={cn(
                "absolute right-2 top-2 z-10 h-7 w-7 opacity-0 transition-opacity",
                "group-hover:opacity-100 focus-visible:opacity-100",
                isPinned(id) && "opacity-100",
              )}
              aria-label={isPinned(id) ? `Unpin ${id}` : `Pin ${id}`}
              data-testid={`widget-pin-${id}`}
            >
              {isPinned(id) ? (
                <Pin className="h-3.5 w-3.5 fill-current" />
              ) : (
                <PinOff className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {node}
        </div>
      ))}
    </div>
  );
}
