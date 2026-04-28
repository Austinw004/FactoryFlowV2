import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  User as UserIcon,
  Lock,
  Bell,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  Database,
} from "lucide-react";
import NotificationSettings from "@/pages/NotificationSettings";
import { Switch } from "@/components/ui/switch";

type TabKey = "profile" | "security" | "notifications" | "data" | "billing";
const TAB_KEYS: TabKey[] = ["profile", "security", "notifications", "data", "billing"];

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  jobTitle: string | null;
  department: string | null;
  phone: string | null;
  role: string | null;
  companyId: string | null;
}

export default function SettingsPage() {
  const [location, setLocation] = useLocation();
  const [matched, params] = useRoute<{ tab?: string }>("/settings/:tab");
  const initialTab = useMemo<TabKey>(() => {
    const raw = matched ? params?.tab : location === "/profile" ? "profile" : location.split("/")[2];
    return (TAB_KEYS as string[]).includes(raw ?? "") ? (raw as TabKey) : "profile";
  }, [matched, params, location]);

  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);

  function onTabChange(next: string) {
    setTab(next as TabKey);
    if (next === "profile") setLocation("/settings");
    else setLocation(`/settings/${next}`);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl" data-testid="settings-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, security, notifications, and billing.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        {/* min-h on TabsList so the row never collapses, and on each
            TabsContent so swapping tabs of different lengths doesn't
            jolt the page height (paired with html { scrollbar-gutter:
            stable } in index.css). */}
        <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <UserIcon className="h-4 w-4 mr-2 hidden sm:inline" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="h-4 w-4 mr-2 hidden sm:inline" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2 hidden sm:inline" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Database className="h-4 w-4 mr-2 hidden sm:inline" /> Data
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="h-4 w-4 mr-2 hidden sm:inline" /> Billing
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[640px]">
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="-mx-4 -my-6">
              <NotificationSettings />
            </div>
          </TabsContent>

          <TabsContent value="data">
            <DataTab />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ user: UserProfile }>({
    queryKey: ["/api/user/profile"],
  });

  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setForm({
        name: data.user.name ?? "",
        firstName: data.user.firstName ?? "",
        lastName: data.user.lastName ?? "",
        jobTitle: data.user.jobTitle ?? "",
        department: data.user.department ?? "",
        phone: data.user.phone ?? "",
      });
    }
  }, [data?.user]);

  const save = useMutation({
    mutationFn: async (payload: Partial<UserProfile>) => {
      const res = await apiRequest("PUT", "/api/user/profile", payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save profile.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setDirty(false);
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err.message || "Unable to save profile.",
        variant: "destructive",
      });
    },
  });

  function set<K extends keyof UserProfile>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your name, contact details, and role inside your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={(form.firstName as string) ?? ""}
              onChange={(e) => set("firstName", e.target.value)}
              className="mt-1.5"
              data-testid="input-first-name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={(form.lastName as string) ?? ""}
              onChange={(e) => set("lastName", e.target.value)}
              className="mt-1.5"
              data-testid="input-last-name"
            />
          </div>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={(form.name as string) ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className="mt-1.5"
              data-testid="input-display-name"
            />
          </div>
          <div>
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              value={(form.nickname as string) ?? ""}
              onChange={(e) => set("nickname", e.target.value)}
              placeholder="e.g. Mike"
              className="mt-1.5"
              data-testid="input-nickname"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              What the AI Advisor and other in-product greetings call you. Leave blank to use your first name.
            </p>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={(form.phone as string) ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              className="mt-1.5"
              data-testid="input-phone"
            />
          </div>
          <div>
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              value={(form.jobTitle as string) ?? ""}
              onChange={(e) => set("jobTitle", e.target.value)}
              className="mt-1.5"
              data-testid="input-job-title"
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={(form.department as string) ?? ""}
              onChange={(e) => set("department", e.target.value)}
              className="mt-1.5"
              data-testid="input-department"
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm mt-1">{data?.user.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact support to change your email.
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Username</Label>
            <p className="text-sm mt-1">{data?.user.username ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Role</Label>
            <div className="mt-1">
              <Badge variant="secondary" className="capitalize">
                {data?.user.role ?? "viewer"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => save.mutate(form)}
            disabled={!dirty || save.isPending}
            data-testid="button-save-profile"
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.currentPassword) errs.currentPassword = "Current password is required";
    if (!form.newPassword) {
      errs.newPassword = "New password is required";
    } else if (form.newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.newPassword)) {
      errs.newPassword = "Must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(form.newPassword)) {
      errs.newPassword = "Must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(form.newPassword)) {
      errs.newPassword = "Must contain at least one special character";
    }
    if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  }

  const change = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update password.");
      }
      return res.json();
    },
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});
      toast({
        title: "Password updated",
        description: "Your password has been changed. Other devices have been signed out.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err.message || "Unable to update password.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    change.mutate();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Choose a strong password with at least 8 characters, one uppercase letter, a number, and a special character.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-xs text-destructive mt-1">{errors.currentPassword}</p>}
            </div>

            <div>
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  autoComplete="new-password"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type={showNew ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="mt-1.5"
                autoComplete="new-password"
                data-testid="input-confirm-password"
              />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" disabled={change.isPending} data-testid="button-change-password">
              {change.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Active sessions
          </CardTitle>
          <CardDescription>
            Changing your password automatically signs out all other devices. For additional session management, contact your administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────

function BillingTab() {
  const [, setLocation] = useLocation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>
          Manage your subscription, payment methods, and invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setLocation("/billing")} data-testid="button-open-billing">
          Open billing dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Data & Personalization Tab ──────────────────────────────────────────────

/**
 * The canonical list of data-preference keys. Adding a new key requires:
 *   1. Add it here with a default of false (consent must be explicit).
 *   2. Add the toggle row in the JSX below.
 *   3. Wire any consumer to read user.dataPreferences[key] ?? false — never
 *      assume consent.
 *   4. If legally relevant (PII, marketing, AI training), the server stamps
 *      a `<key>At` timestamp the moment it flips on, for audit / GDPR proof.
 *
 * Storage: users.dataPreferences (jsonb) in shared/schema.ts.
 * Endpoints: GET / PATCH /api/user/data-preferences in server/routes.ts.
 */
type DataPrefsState = {
  // ── Intelligence tier ──────────────────────────────────────────────────
  aiTraining: boolean;          // anonymized usage → improve forecasting models
  peerBenchmarking: boolean;    // share aggregated metrics with industry peer pool
  enrichedForecasts: boolean;   // pull macro + commodity context into forecasts
  // ── Communication tier ────────────────────────────────────────────────
  weeklyDigest: boolean;        // Monday morning operations brief by email
  productUpdates: boolean;      // marketing — feature launches, case studies
  // ── Telemetry tier ────────────────────────────────────────────────────
  productAnalytics: boolean;    // anonymous click telemetry → improve UX
  errorReporting: boolean;      // crash reports + stack traces (default ON in onboarding)
  // ── Connections tier (drives integration self-serve elsewhere) ────────
  connectAccounting: boolean;   // pull invoice / vendor data for ROI tracking
  connectCalendar: boolean;     // sync ops events → Google Calendar / Outlook
  connectCommodityFeeds: boolean; // hourly LME / CME / spot prices
  // ── Privacy tier ──────────────────────────────────────────────────────
  shareWithSalesEngineer: boolean; // let our SE open your account during support
};

const DEFAULT_PREFS: DataPrefsState = {
  aiTraining: false,
  peerBenchmarking: false,
  enrichedForecasts: true,    // safe default: uses public data, no customer PII
  weeklyDigest: true,         // safe default: customer signed up to get value
  productUpdates: false,      // explicit opt-in for marketing
  productAnalytics: true,     // anonymous, no PII
  errorReporting: true,       // anonymous, helps reliability
  connectAccounting: false,
  connectCalendar: false,
  connectCommodityFeeds: false,
  shareWithSalesEngineer: false,
};

interface PrefRow {
  key: keyof DataPrefsState;
  label: string;
  description: string;
  value: string;
  legalRelevant?: boolean;
}

const PREF_GROUPS: { title: string; subtitle: string; items: PrefRow[] }[] = [
  {
    title: "Intelligence",
    subtitle: "Let Prescient learn from more of your data — sharper forecasts, better recommendations.",
    items: [
      {
        key: "aiTraining",
        label: "Improve AI with my anonymized usage",
        description: "Aggregated, de-identified patterns help the forecasting models learn faster. We never train on raw PII or supplier names.",
        value: "More accurate forecasts within ~30 days.",
        legalRelevant: true,
      },
      {
        key: "peerBenchmarking",
        label: "Join the peer benchmarking pool",
        description: "Share inventory turns, MAPE, and OTD with anonymized industry peers. You see how you stack up; they see the same about themselves.",
        value: "See how your numbers compare to peers in your industry vertical.",
        legalRelevant: true,
      },
      {
        key: "enrichedForecasts",
        label: "Use macro context for forecasts",
        description: "Pull commodity prices, FX rates, weather, and economic indicators from public feeds into your forecast inputs.",
        value: "Forecasts that account for the world outside your four walls.",
      },
    ],
  },
  {
    title: "Communications",
    subtitle: "What lands in your inbox.",
    items: [
      {
        key: "weeklyDigest",
        label: "Monday morning brief",
        description: "One short email every Monday — what changed in your operation last week, what to watch this week.",
        value: "Five-minute read · skim or click through.",
      },
      {
        key: "productUpdates",
        label: "Product news + case studies",
        description: "Feature launches, customer wins, industry research from our team. Sent ~monthly.",
        value: "Optional marketing email.",
        legalRelevant: true,
      },
    ],
  },
  {
    title: "Telemetry",
    subtitle: "Help us make the product better. Both anonymous — never tied to your name or company.",
    items: [
      {
        key: "productAnalytics",
        label: "Anonymous usage analytics",
        description: "Which pages are visited, which buttons are clicked, how long flows take. No content, no PII.",
        value: "Lets us see where customers get stuck.",
      },
      {
        key: "errorReporting",
        label: "Send crash reports automatically",
        description: "Stack traces and browser metadata when something throws. We never see your data, just the error.",
        value: "Lets us fix bugs before you have to report them.",
      },
    ],
  },
  {
    title: "Connections",
    subtitle: "Authorize Prescient to pull richer signals from systems you already use. Each connection is reversible from the Integrations page.",
    items: [
      {
        key: "connectAccounting",
        label: "Connect accounting (QuickBooks / NetSuite / Xero)",
        description: "Pull invoice and vendor history to compute real ROI and surface payable / receivable risk.",
        value: "Verified savings dashboard becomes accurate from day one.",
      },
      {
        key: "connectCalendar",
        label: "Sync operations to my calendar",
        description: "Push S&OP meetings, RFQ deadlines, and supplier reviews to Google Calendar or Outlook.",
        value: "Never miss a planning ceremony again.",
      },
      {
        key: "connectCommodityFeeds",
        label: "Live commodity price feeds",
        description: "Hourly pulls from LME, CME, and public spot markets for the materials you actually buy.",
        value: "Forward-buy alerts the moment a window opens.",
      },
    ],
  },
  {
    title: "Privacy",
    subtitle: "Control who can see your data and when.",
    items: [
      {
        key: "shareWithSalesEngineer",
        label: "Allow Prescient support to view my account",
        description: "When this is on, our solutions team can briefly view your dashboard while helping you with a support ticket. Default: OFF — they can never see your data unless you flip this.",
        value: "Faster support resolution when you ask for help.",
        legalRelevant: true,
      },
    ],
  },
];

function DataTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ preferences: Partial<DataPrefsState> }>({
    queryKey: ["/api/user/data-preferences"],
  });

  const [prefs, setPrefs] = useState<DataPrefsState>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.preferences) {
      setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      setDirty(false);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", "/api/user/data-preferences", { preferences: prefs }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/data-preferences"] });
      toast({ description: "Preferences saved." });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Couldn't save",
        description: err?.message ?? "Try again in a minute.",
      });
    },
  });

  function toggle(key: keyof DataPrefsState) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setDirty(true);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-signal" />
            Data &amp; Personalization
          </CardTitle>
          <CardDescription>
            Choose what data Prescient can use to make your account smarter. Every option is off by default — your data only goes where you say it can. Changes take effect immediately and you can flip any of these back at any time.
          </CardDescription>
        </CardHeader>
      </Card>

      {PREF_GROUPS.map((group) => (
        <Card key={group.title} data-testid={`data-group-${group.title.toLowerCase()}`}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            <CardDescription>{group.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.items.map((row, idx) => (
              <div
                key={row.key}
                className={`flex items-start justify-between gap-4 py-4 ${idx > 0 ? "border-t" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium cursor-pointer">
                    {row.label}
                    {row.legalRelevant && (
                      <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wider">
                        consent
                      </Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {row.description}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-text-info, #CC785C)" }}>
                    → {row.value}
                  </p>
                </div>
                <Switch
                  id={`pref-${row.key}`}
                  checked={prefs[row.key]}
                  onCheckedChange={() => toggle(row.key)}
                  data-testid={`switch-${row.key}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex justify-end gap-2 bg-background/80 backdrop-blur p-3 rounded-md border shadow-sm">
        <Button
          variant="outline"
          onClick={() => {
            if (data?.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
            setDirty(false);
          }}
          disabled={!dirty || save.isPending}
        >
          Discard
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          data-testid="button-save-data-prefs"
        >
          {save.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save changes</>
          )}
        </Button>
      </div>
    </div>
  );
}
