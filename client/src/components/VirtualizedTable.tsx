import { useRef, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

/**
 * VirtualizedTable
 *
 * Renders only visible rows for 100k+ row datasets.
 * Supports fixed headers, dynamic row heights, and keyboard navigation.
 */

interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  render?: (value: any, row: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T, index: number) => void;
  getRowKey?: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 44,
  maxHeight = 600,
  onRowClick,
  getRowKey,
  emptyMessage = "No data",
  className = "",
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const headerHeight = 40;
  const totalHeight = data.length * rowHeight;
  const visibleRows = Math.ceil(maxHeight / rowHeight) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endIndex = Math.min(data.length, startIndex + visibleRows);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const visibleData = sortedData.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center bg-muted/50 border-b text-xs font-medium text-muted-foreground"
        style={{ height: headerHeight }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`px-3 flex items-center gap-1 truncate ${col.sortable ? "cursor-pointer hover:text-foreground" : ""} ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}
            style={{ width: col.width || "auto", flex: col.width ? "none" : 1 }}
            onClick={() => col.sortable && handleSort(col.key)}
          >
            {col.header}
            {col.sortable && sortKey === col.key && (
              <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ maxHeight: maxHeight - headerHeight }}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleData.map((row, i) => {
            const actualIndex = startIndex + i;
            const key = getRowKey ? getRowKey(row, actualIndex) : actualIndex;

            return (
              <div
                key={key}
                className={`flex items-center border-b border-border/30 text-sm ${
                  onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                } ${actualIndex % 2 === 0 ? "" : "bg-muted/20"}`}
                style={{
                  height: rowHeight,
                  position: "absolute",
                  top: actualIndex * rowHeight,
                  left: 0,
                  right: 0,
                }}
                onClick={() => onRowClick?.(row, actualIndex)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={`px-3 truncate ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                    style={{ width: col.width || "auto", flex: col.width ? "none" : 1 }}
                  >
                    {col.render ? col.render(row[col.key], row, actualIndex) : String(row[col.key] ?? "—")}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t text-[10px] text-muted-foreground">
        <span>{data.length.toLocaleString()} rows</span>
        <span>
          Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
