import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Virtuoso } from "react-virtuoso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText, Search, Filter, Clock, User, ArrowRight,
  Plus, Pencil, Trash2, LogIn, LogOut, Download, Upload,
  ChevronLeft, ChevronRight, Eye, Activity, Shield,
  BarChart3, AlertTriangle,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

const ACTION_ICONS: Record<string, any> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  export: Download,
  import: Upload,
  view: Eye,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  delete: "bg-red-500/10 text-red-600 border-red-500/20",
  login: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  logout: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  export: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  import: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
};

function DiffView({ changes }: { changes: any }) {
  if (!changes || typeof changes !== "object") return null;

  // Handle before/after format
  if (changes.before && changes.after) {
    const allKeys = new Set([...Object.keys(changes.before || {}), ...Object.keys(changes.after || {})]);
    const changedKeys = [...allKeys].filter(
      (k) => JSON.stringify(changes.before?.[k]) !== JSON.stringify(changes.after?.[k]),
    );

    if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground">No visible changes</p>;

    return (
      <div className="space-y-1">
        {changedKeys.map((key) => (
          <div key={key} className="flex items-start gap-2 text-xs font-mono">
            <span className="text-muted-foreground min-w-[120px] truncate">{key}:</span>
            <div className="flex items-center gap-2">
              <span className="bg-red-500/10 text-bad px-1.5 py-0.5 rounded line-through">
                {formatValue(changes.before?.[key])}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                {formatValue(changes.after?.[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle flat object format
  const entries = Object.entries(changes).filter(([k]) => !["rule", "trigger"].includes(k));
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 text-xs font-mono">
          <span className="text-muted-foreground min-w-[120px] truncate">{key}:</span>
          <span className="text-foreground">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 80);
  return String(val).slice(0, 80);
}

function AuditLogRow({ log, onClick }: { log: AuditLog; onClick: () => void }) {
  const ActionIcon = ACTION_ICONS[log.action] || Activity;
  const actionColor = ACTION_COLORS[log.action] || "bg-gray-500/10 text-gray-600 border-gray-500/20";

  return (
    <div
      className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border"
      onClick={onClick}
    >
      <div className={`p-1.5 rounded-md border ${actionColor}`}>
        <ActionIcon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium capitalize">{log.action}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {log.entityType}
          </Badge>
          {log.entityId && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
              {log.entityId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(log.timestamp).toLocaleString()}
          </span>
          {log.userId && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.userId.slice(0, 8)}...
            </span>
          )}
          {log.ipAddress && (
            <span>{log.ipAddress}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
    </div>
  );
}

export default function AuditTrail() {
  const [page, setPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 50;

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    if (entityTypeFilter !== "all") params.set("entityType", entityTypeFilter);
    if (actionFilter !== "all") params.set("action", actionFilter);
    return params.toString();
  }, [page, entityTypeFilter, actionFilter]);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: [`/api/audit-trail?${queryParams}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: summary } = useQuery<{ entityTypes: any[]; actions: any[] }>({
    queryKey: ["/api/audit-trail/summary"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const entityTypes = (summary?.entityTypes || []).sort((a: any, b: any) => b.count - a.count);
  const actionTypes = (summary?.actions || []).sort((a: any, b: any) => b.count - a.count);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete record of every change — who, when, what changed
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {total.toLocaleString()} records
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Plus className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {actionTypes.find((a: any) => a.action === "create")?.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">Creates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Pencil className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {actionTypes.find((a: any) => a.action === "update")?.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">Updates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <BarChart3 className="h-5 w-5 text-signal" />
            </div>
            <div>
              <p className="text-2xl font-bold">{entityTypes.length}</p>
              <p className="text-xs text-muted-foreground">Entity Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypes.map((et: any) => (
                  <SelectItem key={et.entityType} value={et.entityType}>
                    {et.entityType} ({et.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((at: any) => (
                  <SelectItem key={at.action} value={at.action}>
                    {at.action} ({at.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(entityTypeFilter !== "all" || actionFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEntityTypeFilter("all"); setActionFilter("all"); setPage(0); }}
                className="text-xs"
              >
                Clear filters
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit log list */}
      <Card>
        <CardContent className="p-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No audit records found</p>
              <p className="text-xs mt-1">Audit records are created automatically as changes are made.</p>
            </div>
          ) : (
            // Virtualized list — only visible rows are mounted. Scales to
            // 100k+ audit records without freezing the UI. Fixed height of
            // 640px keeps the audit card visually stable while paging.
            <div style={{ height: 640 }} data-testid="audit-virtuoso">
              <Virtuoso
                data={logs}
                computeItemKey={(_, log) => log.id}
                itemContent={(_, log) => (
                  <div className="border-b border-border/50">
                    <AuditLogRow log={log} onClick={() => setSelectedLog(log)} />
                  </div>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Audit Record Detail
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Action</span>
                  <p className="font-medium capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Entity Type</span>
                  <p className="font-medium">{selectedLog.entityType}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Entity ID</span>
                  <p className="font-mono text-xs">{selectedLog.entityId || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Timestamp</span>
                  <p className="text-xs">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">User ID</span>
                  <p className="font-mono text-xs">{selectedLog.userId || "System"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">IP Address</span>
                  <p className="font-mono text-xs">{selectedLog.ipAddress || "—"}</p>
                </div>
              </div>

              {selectedLog.changes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Changes (Diff View)
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3 border">
                      <DiffView changes={selectedLog.changes} />
                    </div>
                  </div>
                </>
              )}

              {selectedLog.userAgent && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">User Agent</span>
                    <p className="text-xs font-mono break-all mt-1">{selectedLog.userAgent}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
