import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Enterprise loading states
 * Smooth skeletons that match actual content layout
 */

export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-3 bg-muted/50 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${100 / columns}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-border/30">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${100 / columns}%`, opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CardSkeleton lines={5} />
        </div>
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}

export function InlineLoading({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  return <Loader2 className={`${sizes[size]} animate-spin text-primary`} />;
}
