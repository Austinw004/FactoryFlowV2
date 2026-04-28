// Loading state primitives — replace plain `<div>Loading...</div>` text
// with proper skeleton placeholders that communicate "data is on the
// way" instead of "the page is broken." Two flavors cover the most
// common shapes:
//
//   <LoadingBlock rows={3} />   — generic skeleton stack inside a card
//                                 or content area. Use when the shape
//                                 underneath is a list of things or
//                                 free-form copy.
//
//   <LoadingTableRow colSpan={N} />
//                               — a single TableRow rendered with a
//                                 pulsing dot + message, sized to span
//                                 the table's column count. Drop into
//                                 <TableBody> when the loaded data is
//                                 a table.
//
// Both are intentionally subtle — palette-aligned (signal accent for
// the pulse, muted foreground for text) and non-blinking. The previous
// "Loading..." text-only approach made the app feel like it was stuck;
// the skeleton flavor reads as "actively fetching."

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface LoadingBlockProps {
  rows?: number;
  className?: string;
  testId?: string;
}

export function LoadingBlock({ rows = 3, className, testId }: LoadingBlockProps) {
  return (
    <div
      className={`space-y-3 py-4 ${className ?? ""}`.trim()}
      data-testid={testId ?? "loading-block"}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

interface LoadingTableRowProps {
  colSpan: number;
  message?: string;
  testId?: string;
}

export function LoadingTableRow({
  colSpan,
  message = "Loading…",
  testId,
}: LoadingTableRowProps) {
  return (
    <TableRow data-testid={testId ?? "loading-table-row"}>
      <TableCell colSpan={colSpan} className="py-12">
        <div
          className="flex items-center justify-center gap-3 text-muted-foreground"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-signal animate-pulse" />
          <span className="text-sm">{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Cards-with-loading-text pattern — drop in place of "<Card><CardContent
// className='p-6'>Loading thing...</CardContent></Card>". Renders a card
// with three skeleton bars instead.
import { Card, CardContent } from "@/components/ui/card";

interface LoadingCardProps {
  rows?: number;
  testId?: string;
}

export function LoadingCard({ rows = 3, testId }: LoadingCardProps) {
  return (
    <Card data-testid={testId ?? "loading-card"} aria-busy="true" aria-live="polite">
      <CardContent className="p-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
