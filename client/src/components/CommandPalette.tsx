import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Settings,
  Wrench,
  Network,
  Lightbulb,
  Bot,
  Plug,
  BarChart3,
  AlertTriangle,
  Package,
  Users,
  Factory,
  Search,
  Clock,
  ArrowRight,
  FileText,
  Shield,
  Zap,
  ChevronRight,
  Star,
  Hash,
  Box,
  Truck,
  ClipboardList,
  Activity,
  Eye,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  priority?: number;
}

interface RecentItem {
  id: string;
  label: string;
  path: string;
  timestamp: number;
}

// ── Navigation items ───────────────────────────────────────────────────────
const NAV_ITEMS: Omit<SearchResult, "action">[] = [
  { id: "nav-dashboard", label: "Dashboard", description: "Overview & KPIs", category: "Navigation", icon: <LayoutDashboard className="h-4 w-4" />, keywords: ["home", "overview", "kpi", "metrics"], priority: 10 },
  { id: "nav-demand", label: "Demand & Forecasting", description: "Demand planning & accuracy", category: "Navigation", icon: <TrendingUp className="h-4 w-4" />, keywords: ["forecast", "prediction", "planning"], priority: 9 },
  { id: "nav-procurement", label: "Procurement", description: "Purchasing & PO management", category: "Navigation", icon: <ShoppingCart className="h-4 w-4" />, keywords: ["purchase", "buy", "order", "po", "rfq"], priority: 9 },
  { id: "nav-operations", label: "Operations", description: "Machinery, production & workforce", category: "Navigation", icon: <Wrench className="h-4 w-4" />, keywords: ["production", "machinery", "maintenance", "workforce"], priority: 9 },
  { id: "nav-supply-chain", label: "Supply Chain", description: "Inventory & network visibility", category: "Navigation", icon: <Network className="h-4 w-4" />, keywords: ["inventory", "supplier", "logistics", "traceability"], priority: 9 },
  { id: "nav-strategy", label: "Strategy & Insights", description: "Digital twin & scenario planning", category: "Navigation", icon: <Lightbulb className="h-4 w-4" />, keywords: ["digital twin", "scenario", "strategic", "analysis"], priority: 8 },
  { id: "nav-agentic", label: "Agentic AI", description: "AI copilot & recommendations", category: "Navigation", icon: <Bot className="h-4 w-4" />, keywords: ["ai", "copilot", "assistant", "intelligence"], priority: 8 },
  { id: "nav-allocation", label: "Allocation", description: "Resource & inventory allocation", category: "Navigation", icon: <Package className="h-4 w-4" />, keywords: ["allocate", "distribute", "assign"], priority: 7 },
  { id: "nav-event-monitoring", label: "Event Monitoring", description: "Real-time alerts & events", category: "Navigation", icon: <AlertTriangle className="h-4 w-4" />, keywords: ["alert", "event", "monitor", "notification"], priority: 7 },
  { id: "nav-pilot-revenue", label: "Pilot Revenue", description: "Revenue tracking & analytics", category: "Navigation", icon: <BarChart3 className="h-4 w-4" />, keywords: ["revenue", "pilot", "money", "sales"], priority: 7 },
  { id: "nav-commodity", label: "Commodity Forecasts", description: "Price trends & predictions", category: "Navigation", icon: <TrendingUp className="h-4 w-4" />, keywords: ["commodity", "price", "market"], priority: 6 },
  { id: "nav-shop-floor", label: "Shop Floor Mode", description: "Production floor interface", category: "Navigation", icon: <Factory className="h-4 w-4" />, keywords: ["floor", "production", "manufacturing"], priority: 6 },
  { id: "nav-sop", label: "S&OP Workflows", description: "Sales & operations planning", category: "Navigation", icon: <ClipboardList className="h-4 w-4" />, keywords: ["sop", "planning", "sales operations"], priority: 6 },
  { id: "nav-compliance", label: "Compliance", description: "Regulatory & audit management", category: "Navigation", icon: <Shield className="h-4 w-4" />, keywords: ["compliance", "audit", "regulation", "iso"], priority: 6 },
  { id: "nav-integrations", label: "Integrations", description: "Connect external systems", category: "Configuration", icon: <Plug className="h-4 w-4" />, keywords: ["connect", "erp", "api", "integration"], priority: 5 },
  { id: "nav-webhooks", label: "Webhooks", description: "Event-driven integrations", category: "Configuration", icon: <Zap className="h-4 w-4" />, keywords: ["webhook", "event", "trigger"], priority: 5 },
  { id: "nav-api-docs", label: "API Documentation", description: "Developer reference", category: "Configuration", icon: <FileText className="h-4 w-4" />, keywords: ["api", "developer", "docs", "reference"], priority: 5 },
  { id: "nav-settings", label: "Settings", description: "Platform configuration", category: "Configuration", icon: <Settings className="h-4 w-4" />, keywords: ["settings", "config", "preferences"], priority: 5 },
  { id: "nav-billing", label: "Billing", description: "Subscription & payments", category: "Configuration", icon: <BarChart3 className="h-4 w-4" />, keywords: ["billing", "payment", "subscription", "plan"], priority: 5 },
  { id: "nav-notifications", label: "Notification Settings", description: "Alert preferences", category: "Configuration", icon: <AlertTriangle className="h-4 w-4" />, keywords: ["notification", "alert", "email"], priority: 4 },
];

const NAV_PATHS: Record<string, string> = {
  "nav-dashboard": "/dashboard",
  "nav-demand": "/demand",
  "nav-procurement": "/procurement",
  "nav-operations": "/operations",
  "nav-supply-chain": "/supply-chain",
  "nav-strategy": "/strategy",
  "nav-agentic": "/agentic-ai",
  "nav-allocation": "/allocation",
  "nav-event-monitoring": "/event-monitoring",
  "nav-pilot-revenue": "/pilot-revenue",
  "nav-commodity": "/commodity-forecasts",
  "nav-shop-floor": "/shop-floor",
  "nav-sop": "/sop-workflows",
  "nav-compliance": "/compliance",
  "nav-integrations": "/integrations",
  "nav-webhooks": "/webhook-integrations",
  "nav-api-docs": "/api-docs",
  "nav-settings": "/configuration",
  "nav-billing": "/billing",
  "nav-notifications": "/notification-settings",
};

// ── Recent items storage ───────────────────────────────────────────────────
const RECENT_KEY = "prescient_cmd_recent";
const MAX_RECENT = 8;

function getRecentItems(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentItem(item: RecentItem) {
  const items = getRecentItems().filter((i) => i.id !== item.id);
  items.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

// ── Fuzzy match scoring ────────────────────────────────────────────────────
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;

  // Character-by-character fuzzy
  let qi = 0;
  let score = 0;
  let consecutive = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10 + consecutive * 5;
      consecutive++;
      qi++;
    } else {
      consecutive = 0;
    }
  }

  return qi === q.length ? score : 0;
}

// ── Component ──────────────────────────────────────────────────────────────
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch entity data for search
  interface SearchEntity { id: string; name?: string; [key: string]: unknown; }
  const { data: materials } = useQuery<SearchEntity[]>({
    queryKey: ["/api/materials"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: suppliers } = useQuery<SearchEntity[]>({
    queryKey: ["/api/suppliers"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: skus } = useQuery<SearchEntity[]>({
    queryKey: ["/api/skus"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: machinery } = useQuery<SearchEntity[]>({
    queryKey: ["/api/machinery"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: employees } = useQuery<SearchEntity[]>({
    queryKey: ["/api/employees"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: purchaseOrders } = useQuery<SearchEntity[]>({
    queryKey: ["/api/purchase-orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  const { data: smartAlerts } = useQuery<SearchEntity[]>({
    queryKey: ["/api/smart-insights/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open,
  });

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const navigate = useCallback(
    (path: string, label: string, id: string) => {
      addRecentItem({ id, label, path, timestamp: Date.now() });
      setLocation(path);
      setOpen(false);
    },
    [setLocation],
  );

  // Build search results
  const buildResults = useCallback((): SearchResult[] => {
    const results: SearchResult[] = [];

    // Navigation items
    NAV_ITEMS.forEach((item) => {
      results.push({
        ...item,
        action: () => navigate(NAV_PATHS[item.id] || "/dashboard", item.label, item.id),
      });
    });

    // Entity results
    if (materials && Array.isArray(materials)) {
      materials.slice(0, 50).forEach((m: any) => {
        results.push({
          id: `mat-${m.id}`,
          label: m.name || m.materialName || `Material ${m.id}`,
          description: m.category || m.type || "Material",
          category: "Materials",
          icon: <Box className="h-4 w-4" />,
          keywords: [m.name, m.category, m.sku, "material", "inventory"].filter(Boolean),
          action: () => navigate("/supply-chain", m.name || "Material", `mat-${m.id}`),
          priority: 3,
        });
      });
    }

    if (suppliers && Array.isArray(suppliers)) {
      suppliers.slice(0, 50).forEach((s: any) => {
        results.push({
          id: `sup-${s.id}`,
          label: s.name || s.supplierName || `Supplier ${s.id}`,
          description: s.location || s.category || "Supplier",
          category: "Suppliers",
          icon: <Truck className="h-4 w-4" />,
          keywords: [s.name, s.location, s.category, "supplier", "vendor"].filter(Boolean),
          action: () => navigate("/supply-chain", s.name || "Supplier", `sup-${s.id}`),
          priority: 3,
        });
      });
    }

    if (skus && Array.isArray(skus)) {
      skus.slice(0, 50).forEach((s: any) => {
        results.push({
          id: `sku-${s.id}`,
          label: s.name || s.skuCode || `SKU ${s.id}`,
          description: s.category || "Product SKU",
          category: "Products",
          icon: <Hash className="h-4 w-4" />,
          keywords: [s.name, s.skuCode, s.category, "product", "sku"].filter(Boolean),
          action: () => navigate("/demand", s.name || "SKU", `sku-${s.id}`),
          priority: 3,
        });
      });
    }

    if (machinery && Array.isArray(machinery)) {
      machinery.slice(0, 50).forEach((m: any) => {
        results.push({
          id: `mach-${m.id}`,
          label: m.name || m.machineName || `Equipment ${m.id}`,
          description: m.type || m.status || "Equipment",
          category: "Equipment",
          icon: <Factory className="h-4 w-4" />,
          keywords: [m.name, m.type, m.status, "machine", "equipment"].filter(Boolean),
          action: () => navigate("/operations", m.name || "Equipment", `mach-${m.id}`),
          priority: 3,
        });
      });
    }

    if (employees && Array.isArray(employees)) {
      employees.slice(0, 50).forEach((e: any) => {
        results.push({
          id: `emp-${e.id}`,
          label: `${e.firstName || ""} ${e.lastName || ""}`.trim() || `Employee ${e.id}`,
          description: e.role || e.department || "Employee",
          category: "People",
          icon: <Users className="h-4 w-4" />,
          keywords: [e.firstName, e.lastName, e.role, e.department, "employee", "staff"].filter(Boolean),
          action: () => navigate("/operations", `${e.firstName} ${e.lastName}`, `emp-${e.id}`),
          priority: 3,
        });
      });
    }

    if (purchaseOrders && Array.isArray(purchaseOrders)) {
      purchaseOrders.slice(0, 50).forEach((po: any) => {
        const id = po.id ?? po.poNumber ?? "";
        const label = po.poNumber || po.orderNumber || `PO ${id}`;
        results.push({
          id: `po-${id}`,
          label,
          description: [po.status, po.supplierName, po.totalAmount && `$${po.totalAmount}`].filter(Boolean).join(" • ") || "Purchase order",
          category: "Purchase Orders",
          icon: <FileText className="h-4 w-4" />,
          keywords: [po.poNumber, po.orderNumber, po.supplierName, po.status, "po", "purchase", "order", "work order"].filter(Boolean),
          action: () => navigate("/automated-po", label, `po-${id}`),
          priority: 4,
        });
      });
    }

    if (smartAlerts && Array.isArray(smartAlerts)) {
      smartAlerts.slice(0, 30).forEach((a: any) => {
        const id = a.id ?? a.alertId ?? "";
        const label = a.title || a.message || `Alert ${id}`;
        results.push({
          id: `alert-${id}`,
          label,
          description: [a.severity, a.entityType, a.category].filter(Boolean).join(" • ") || "Smart insight alert",
          category: "Alerts",
          icon: <AlertTriangle className="h-4 w-4" />,
          keywords: [a.title, a.message, a.severity, a.category, a.entityType, "alert", "warning", "incident", "quality", "issue"].filter(Boolean),
          action: () => navigate("/event-monitoring", label, `alert-${id}`),
          priority: 5,
        });
      });
    }

    return results;
  }, [materials, suppliers, skus, machinery, employees, purchaseOrders, smartAlerts, navigate]);

  const allResults = buildResults();

  // Filter and rank
  const filtered = search.trim()
    ? allResults
        .map((r) => {
          const labelScore = fuzzyScore(search, r.label);
          const descScore = r.description ? fuzzyScore(search, r.description) * 0.5 : 0;
          const kwScore = (r.keywords || []).reduce((max, kw) => Math.max(max, fuzzyScore(search, kw) * 0.6), 0);
          const total = Math.max(labelScore, descScore, kwScore) + (r.priority || 0);
          return { ...r, score: total };
        })
        .filter((r) => r.score > 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
    : [];

  const recentItems = getRecentItems();
  const showRecent = !search.trim() && recentItems.length > 0;
  const showQuickNav = !search.trim();

  // Group filtered results by category
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => setOpen(false)}
      />

      {/* Command dialog */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
        <Command
          className="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search everything... pages, materials, suppliers, equipment, people"
              className="flex h-12 w-full bg-transparent py-3 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {search.trim() ? "No results found." : "Start typing to search..."}
            </Command.Empty>

            {/* Recent items */}
            {showRecent && (
              <Command.Group heading={
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1.5">
                  <Clock className="h-3 w-3" />
                  Recent
                </span>
              }>
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => navigate(item.path, item.label, item.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-aria-selected:opacity-100" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick navigation when no search */}
            {showQuickNav && (
              <Command.Group heading={
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1.5">
                  <Star className="h-3 w-3" />
                  Quick Navigation
                </span>
              }>
                {NAV_ITEMS.filter((i) => (i.priority || 0) >= 7).map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => navigate(NAV_PATHS[item.id] || "/dashboard", item.label, item.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Filtered results grouped by category */}
            {Object.entries(grouped).map(([category, items]) => (
              <Command.Group
                key={category}
                heading={
                  <span className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                    {category}
                  </span>
                }
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => item.action()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{item.category}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">esc</kbd>
                Close
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {allResults.length} items indexed
            </span>
          </div>
        </Command>
      </div>
    </>
  );
}

// ── Hook for opening the palette externally ────────────────────────────────
export function useCommandPalette() {
  const trigger = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }, []);

  return { trigger };
}
