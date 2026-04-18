/**
 * /internal/leads — Inbound sales-leads inbox.
 *
 * Owner-only view of contact_inquiries rows. Browses, filters, and updates
 * the lead pipeline (status, notes, assignedTo) without anyone needing to
 * SSH into the host or grep JSONL fallback files.
 *
 * Auth: gated server-side by isAuthenticated + requirePlatformAdmin. The
 * client also checks /api/platform/check-access to render an Access Denied
 * card (instead of empty error toasts) when a non-owner navigates here.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Inbox, Mail, RefreshCw, Search, Shield } from "lucide-react";

type LeadStatus =
  | "new"
  | "triaged"
  | "replied"
  | "qualified"
  | "won"
  | "lost"
  | "spam";

const STATUSES: LeadStatus[] = [
  "new",
  "triaged",
  "replied",
  "qualified",
  "won",
  "lost",
  "spam",
];

interface ContactInquiry {
  id: string;
  receivedAt: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  topic: string;
  message: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  status: LeadStatus;
  notes: string | null;
  assignedTo: string | null;
  emailedAt: string | null;
  submissionCount: number;
  updatedAt: string;
}

interface LeadsListResponse {
  leads: ContactInquiry[];
  total: number;
  limit: number;
  offset: number;
}

interface LeadsStatsResponse {
  byStatus: Record<string, number>;
  last7Days: number;
  last30Days: number;
  total: number;
}

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-blue-600",
  triaged: "bg-indigo-600",
  replied: "bg-purple-600",
  qualified: "bg-emerald-600",
  won: "bg-green-700",
  lost: "bg-zinc-500",
  spam: "bg-red-600",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LeadsAdmin() {
  const { toast } = useToast();

  // --- Auth gate (mirrors PlatformOwnerAnalytics) ---------------------------
  const { data: accessCheck, isLoading: checkingAccess } = useQuery<{
    isPlatformAdmin: boolean;
  }>({
    queryKey: ["/api/platform/check-access"],
  });

  // --- Filters --------------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(0);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (appliedSearch) params.set("q", appliedSearch);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    return `/api/internal/leads?${params.toString()}`;
  }, [statusFilter, appliedSearch, page]);

  const {
    data: listData,
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery<LeadsListResponse>({
    queryKey: [queryUrl],
    enabled: accessCheck?.isPlatformAdmin === true,
  });

  const { data: stats, refetch: refetchStats } = useQuery<LeadsStatsResponse>({
    queryKey: ["/api/internal/leads/stats"],
    enabled: accessCheck?.isPlatformAdmin === true,
  });

  // --- Detail / edit drawer -------------------------------------------------
  const [openLead, setOpenLead] = useState<ContactInquiry | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadStatus>("new");
  const [draftNotes, setDraftNotes] = useState("");

  const openDetail = (lead: ContactInquiry) => {
    setOpenLead(lead);
    setDraftStatus(lead.status);
    setDraftNotes(lead.notes || "");
  };

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      status?: LeadStatus;
      notes?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/internal/leads/${vars.id}`, {
        status: vars.status,
        notes: vars.notes,
      });
      return res.json() as Promise<{ lead: ContactInquiry }>;
    },
    onSuccess: () => {
      toast({ title: "Lead updated" });
      queryClient.invalidateQueries({ queryKey: [queryUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/internal/leads/stats"] });
      setOpenLead(null);
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setAppliedSearch(searchInput.trim());
  };

  const handleRefresh = () => {
    refetchLeads();
    refetchStats();
    toast({ title: "Refreshing leads…" });
  };

  // --- Render ---------------------------------------------------------------
  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!accessCheck?.isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-6 w-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Leads inbox is restricted to Prescient Labs platform owners.
              These rows contain prospect PII and are not available to customer
              accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leads = listData?.leads || [];
  const total = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            Sales leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Inbound contact-form submissions. Update status as you work the
            pipeline. Rows are retained for audit — mark as "spam" instead of
            deleting.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total leads</CardDescription>
            <CardTitle className="text-2xl">{stats?.total ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Last 7 days</CardDescription>
            <CardTitle className="text-2xl">{stats?.last7Days ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Last 30 days</CardDescription>
            <CardTitle className="text-2xl">{stats?.last30Days ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>New (unworked)</CardDescription>
            <CardTitle className="text-2xl">
              {stats?.byStatus?.new ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-3 items-stretch md:items-end"
          >
            <div className="flex-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, company, message…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as LeadStatus | "all");
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} {stats?.byStatus?.[s] ? `(${stats.byStatus[s]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Apply</Button>
            {(appliedSearch || statusFilter !== "all") && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchInput("");
                  setAppliedSearch("");
                  setStatusFilter("all");
                  setPage(0);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {leadsLoading
              ? "Loading…"
              : `${total} lead${total === 1 ? "" : "s"}`}
            {appliedSearch && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                matching "{appliedSearch}"
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Received</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[110px]">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading leads…
                  </TableCell>
                </TableRow>
              )}
              {!leadsLoading && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No leads match these filters.
                  </TableCell>
                </TableRow>
              )}
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openDetail(lead)}
                >
                  <TableCell className="text-sm tabular-nums">
                    {formatDate(lead.receivedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.company || <span className="text-muted-foreground">—</span>}
                    {lead.role && (
                      <div className="text-xs text-muted-foreground">{lead.role}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{lead.topic}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[lead.status] || ""}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {lead.submissionCount > 1 ? `× ${lead.submissionCount}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <DialogContent className="max-w-2xl">
          {openLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{openLead.name}</span>
                  <Badge className={STATUS_BADGE[openLead.status]}>
                    {openLead.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {openLead.email}
                  {openLead.company ? ` · ${openLead.company}` : ""}
                  {openLead.role ? ` · ${openLead.role}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Received
                    </div>
                    <div>{formatDate(openLead.receivedAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Topic
                    </div>
                    <div className="capitalize">{openLead.topic}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Submissions
                    </div>
                    <div>{openLead.submissionCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Sales notified
                    </div>
                    <div>
                      {openLead.emailedAt ? formatDate(openLead.emailedAt) : "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Message
                  </div>
                  <div className="rounded border bg-muted/30 p-3 whitespace-pre-wrap text-sm">
                    {openLead.message}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>IP: {openLead.ip || "—"}</div>
                  <div>Referer: {openLead.referer || "—"}</div>
                  <div className="col-span-2 truncate" title={openLead.userAgent || ""}>
                    UA: {openLead.userAgent || "—"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                      Status
                    </label>
                    <Select
                      value={draftStatus}
                      onValueChange={(v) => setDraftStatus(v as LeadStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <a
                      href={`mailto:${openLead.email}?subject=${encodeURIComponent(
                        "Re: Prescient Labs inquiry",
                      )}`}
                      className="inline-flex items-center text-sm underline text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-4 w-4 mr-1" /> Reply by email
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                    Internal notes
                  </label>
                  <Textarea
                    rows={4}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Disposition, next step, ICP fit, etc."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenLead(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: openLead.id,
                      status: draftStatus,
                      notes: draftNotes,
                    })
                  }
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
