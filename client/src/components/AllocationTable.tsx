import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AllocationRow {
  sku: string;
  plannedUnits: number;
  allocatedUnits: number;
  fillRate: number;
  priority: number;
}

interface AllocationTableProps {
  allocations: AllocationRow[];
}

export function AllocationTable({ allocations }: AllocationTableProps) {
  return (
    <div className="rounded-md border" data-testid="table-allocation">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Planned</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead>Fill Rate</TableHead>
            <TableHead className="text-right">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map((row) => (
            <TableRow key={row.sku} data-testid={`row-allocation-${row.sku}`}>
              <TableCell className="font-medium">{row.sku}</TableCell>
              <TableCell className="text-right font-mono">
                {row.plannedUnits.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.allocatedUnits.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={row.fillRate} className="h-2 flex-1" />
                  <span className="text-sm font-mono w-12 text-right">
                    {row.fillRate.toFixed(0)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{row.priority.toFixed(1)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
