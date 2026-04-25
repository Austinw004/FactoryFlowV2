import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2, Users, Rocket, Check, X, Loader2, Mail, UserPlus,
  MapPin, User, CreditCard, Crown, Zap, BarChart3, Shield,
  Phone, Briefcase, ChevronRight, ArrowLeft, TrendingUp,
  Factory, Package, DollarSign, Wrench, Globe, AlertTriangle,
  Settings, Truck, Target, Brain, Gauge,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Aerospace & Defense",
  "Automotive",
  "Chemicals",
  "Consumer Goods",
  "Electronics",
  "Food & Beverage",
  "Industrial Equipment",
  "Medical Devices",
  "Metals & Mining",
  "Pharmaceuticals",
  "Plastics & Rubber",
  "Semiconductors",
  "Textiles",
  "Other Manufacturing",
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-1000", label: "201–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5001+", label: "5,000+ employees" },
];

const ANNUAL_REVENUE = [
  { value: "pre-revenue", label: "Pre-revenue" },
  { value: "under-1m", label: "Under $1M" },
  { value: "1m-10m", label: "$1M – $10M" },
  { value: "10m-50m", label: "$10M – $50M" },
  { value: "50m-250m", label: "$50M – $250M" },
  { value: "250m-1b", label: "$250M – $1B" },
  { value: "over-1b", label: "Over $1B" },
];

const ANNUAL_PROCUREMENT_SPEND = [
  { value: "under-500k", label: "Under $500K" },
  { value: "500k-2m", label: "$500K – $2M" },
  { value: "2m-10m", label: "$2M – $10M" },
  { value: "10m-50m", label: "$10M – $50M" },
  { value: "50m-250m", label: "$50M – $250M" },
  { value: "over-250m", label: "Over $250M" },
];

const JOB_TITLES = [
  "CEO / President",
  "COO / VP Operations",
  "CFO / VP Finance",
  "CTO / VP Engineering",
  "VP Supply Chain",
  "Director of Procurement",
  "Director of Manufacturing",
  "Plant Manager",
  "Operations Manager",
  "Supply Chain Manager",
  "Procurement Manager",
  "Production Manager",
  "Quality Manager",
  "IT Director / CIO",
  "Data / Analytics Lead",
  "Other",
];

const KEY_MATERIALS = [
  "Steel & Metals",
  "Aluminum",
  "Copper & Wiring",
  "Plastics & Polymers",
  "Rubber & Elastomers",
  "Chemicals & Solvents",
  "Electronics & Semiconductors",
  "Glass & Ceramics",
  "Wood & Paper",
  "Textiles & Fabrics",
  "Food Ingredients",
  "Pharmaceutical APIs",
  "Packaging Materials",
  "Fasteners & Hardware",
  "Lubricants & Fluids",
  "Rare Earth Minerals",
];

const ERP_SYSTEMS = [
  "SAP (S/4HANA, ECC)",
  "Oracle (NetSuite, Cloud ERP)",
  "Microsoft Dynamics 365",
  "Epicor",
  "Infor",
  "Sage",
  "SYSPRO",
  "Plex (Rockwell)",
  "QAD",
  "Fishbowl",
  "DELMIAworks (IQMS)",
  "MIE Trak Pro",
  "Global Shop Solutions",
  "Spreadsheets / Manual",
  "Custom / In-House",
  "None / Looking for first ERP",
];

const PAIN_POINTS = [
  { id: "demand_volatility", label: "Demand volatility & forecasting accuracy", icon: TrendingUp },
  { id: "supply_disruptions", label: "Supply chain disruptions & lead times", icon: Truck },
  { id: "procurement_costs", label: "Rising procurement costs & material prices", icon: DollarSign },
  { id: "inventory_mgmt", label: "Inventory management (overstocking / stockouts)", icon: Package },
  { id: "supplier_risk", label: "Supplier risk visibility & diversification", icon: AlertTriangle },
  { id: "manual_processes", label: "Manual / spreadsheet-based processes", icon: Settings },
  { id: "production_planning", label: "Production scheduling & capacity planning", icon: Factory },
  { id: "data_silos", label: "Data silos across departments", icon: Globe },
  { id: "compliance", label: "Compliance & regulatory reporting", icon: Shield },
  { id: "real_time_visibility", label: "Lack of real-time operational visibility", icon: Gauge },
];

const PRODUCTION_VOLUME = [
  { value: "prototype", label: "Prototype / R&D" },
  { value: "low", label: "Low volume (custom/job shop)" },
  { value: "medium", label: "Medium volume (batch)" },
  { value: "high", label: "High volume (mass production)" },
  { value: "continuous", label: "Continuous process" },
  { value: "mixed", label: "Mixed / multiple lines" },
];

const PLANS = [
  {
    id: "monthly_starter",
    name: "Starter",
    price: "$299",
    interval: "/month",
    annualId: "annual_starter",
    annualPrice: "$249",
    annualSavings: "Save $600/year",
    description: "Full platform access for growing manufacturers",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    features: [
      "All platform modules included",
      "Up to 10 team members",
      "Standard support (24h response)",
      "Monthly billing, cancel anytime",
    ],
  },
  {
    id: "monthly_growth",
    name: "Growth",
    price: "$799",
    interval: "/month",
    annualId: "annual_growth",
    annualPrice: "$666",
    annualSavings: "Save $1,596/year",
    description: "Scaling operations with dedicated support",
    icon: TrendingUp,
    popular: true,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    features: [
      "All platform modules included",
      "Unlimited team members",
      "Priority support (4h response)",
      "Dedicated account manager",
    ],
  },
  {
    id: "usage_based",
    name: "Usage-Based",
    price: "$199",
    interval: "/month + usage",
    description: "Pay for what you use — ideal for variable workloads",
    icon: BarChart3,
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    borderColor: "border-violet-200 dark:border-violet-800",
    features: [
      "All platform modules included",
      "$0.02 per unit processed",
      "0.25% of managed procurement spend",
      "Usage dashboard & alerts",
    ],
  },
  {
    id: "performance",
    name: "Performance",
    price: "$100",
    interval: "/month + savings share",
    description: "Only pay more when we deliver measurable savings",
    icon: Shield,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    features: [
      "All platform modules included",
      "10–20% of verified, realized savings",
      "Full evidence chain & audit trail",
      "Risk-free — pay only for results",
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  email: string;
  role: string;
}

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company", icon: Building2 },
  { label: "Profile", icon: User },
  { label: "Operations", icon: Factory },
  { label: "Team", icon: Users },
  { label: "Plan", icon: Crown },
  { label: "Payment", icon: CreditCard },
  { label: "Launch", icon: Rocket },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Company
  const companyNameRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");

  // Step 2: User Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");

  // Pre-fill profile fields from the authenticated user record. The First/Last
  // Name inputs previously showed "Austin"/"Wendler" only as placeholder text
  // while the bound state was empty string — clicking Continue silently failed
  // validation because !firstName.trim() / !lastName.trim() were true. Pulling
  // the real values from /api/auth/user (populated by the OAuth provider, or
  // by the user's previous onboarding attempt) makes the validation pass and
  // also lets returning customers re-enter onboarding without re-typing.
  const { data: authUser } = useQuery<{
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    phone?: string | null;
  }>({
    queryKey: ["/api/auth/user"],
  });
  useEffect(() => {
    if (!authUser) return;
    // Fall back to splitting display-name when first/last aren't separately set
    // (some Google profiles return only `name`).
    const split = (authUser.name ?? "").trim().split(/\s+/);
    const first = authUser.firstName ?? split[0] ?? "";
    const last  = authUser.lastName  ?? split.slice(1).join(" ") ?? "";
    setFirstName((curr) => curr || first);
    setLastName((curr) => curr || last);
    setJobTitle((curr) => curr || authUser.jobTitle || "");
    setDepartment((curr) => curr || authUser.department || "");
    setPhone((curr) => curr || authUser.phone || "");
  }, [authUser]);

  // Step 3: Operations Intelligence
  const [productionVolume, setProductionVolume] = useState("");
  const [annualProcurementSpend, setAnnualProcurementSpend] = useState("");
  const [keyMaterials, setKeyMaterials] = useState<string[]>([]);
  const [erpSystem, setErpSystem] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [numberOfSuppliers, setNumberOfSuppliers] = useState("");
  const [numberOfFacilities, setNumberOfFacilities] = useState("");
  const [topProducts, setTopProducts] = useState("");

  // Step 4: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("viewer");

  // Step 5: Plan
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  // Step 6: Payment
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // ─── Mutations ────────────────────────────────────────────────────────────

  const setupCompanyMutation = useMutation({
    mutationFn: async (data: {
      name: string; industry: string; companySize: string;
      location: string; website: string; annualRevenue: string;
    }) => {
      return apiRequest("POST", "/api/onboarding/company", data);
    },
    onSuccess: () => setStep(2),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to set up company", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      firstName: string; lastName: string; jobTitle: string;
      phone: string; department: string;
    }) => {
      return apiRequest("POST", "/api/onboarding/profile", data);
    },
    onSuccess: () => setStep(3),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const saveOperationsMutation = useMutation({
    mutationFn: async (data: {
      productionVolume: string; annualProcurementSpend: string;
      keyMaterials: string[]; erpSystem: string; painPoints: string[];
      numberOfSuppliers: string; numberOfFacilities: string; topProducts: string;
    }) => {
      return apiRequest("POST", "/api/onboarding/operations", data);
    },
    onSuccess: () => setStep(4),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save operations data", variant: "destructive" });
    },
  });

  const inviteTeamMutation = useMutation({
    mutationFn: async (members: TeamMember[]) => {
      return apiRequest("POST", "/api/onboarding/invite-team", { members });
    },
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (data: { planId: string; billingInterval: string }) => {
      return apiRequest("POST", "/api/onboarding/select-plan", data);
    },
    onSuccess: () => setStep(6),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to select plan", variant: "destructive" });
    },
  });

  const savePaymentMethodMutation = useMutation({
    mutationFn: async (data: { cardLast4: string; cardBrand: string; saveForLater: boolean }) => {
      return apiRequest("POST", "/api/onboarding/payment-method", data);
    },
    onSuccess: () => setStep(7),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save payment details", variant: "destructive" });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome to Prescient Labs!", description: "Your account is ready. Let's get started!" });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to complete onboarding", variant: "destructive" });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCompanySubmit = useCallback(() => {
    const nameValue = companyName.trim() || companyNameRef.current?.value?.trim() || "";
    if (!nameValue) {
      toast({ title: "Company name required", description: "Please enter your company name", variant: "destructive" });
      return;
    }
    if (!companyName.trim() && nameValue) setCompanyName(nameValue);
    setupCompanyMutation.mutate({ name: nameValue, industry, companySize, location, website, annualRevenue });
  }, [companyName, industry, companySize, location, website, annualRevenue, toast, setupCompanyMutation]);

  const handleProfileSubmit = () => {
    if (!firstName.trim()) {
      toast({ title: "First name required", description: "Please enter your first name", variant: "destructive" });
      return;
    }
    if (!lastName.trim()) {
      toast({ title: "Last name required", description: "Please enter your last name", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim(), jobTitle, phone, department });
  };

  const handleOperationsSubmit = () => {
    saveOperationsMutation.mutate({
      productionVolume, annualProcurementSpend, keyMaterials,
      erpSystem, painPoints, numberOfSuppliers, numberOfFacilities, topProducts,
    });
  };

  const handleAddTeamMember = () => {
    if (!newMemberEmail || !newMemberEmail.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (teamMembers.some((m) => m.email === newMemberEmail)) {
      toast({ title: "Duplicate email", description: "This email has already been added", variant: "destructive" });
      return;
    }
    setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }]);
    setNewMemberEmail("");
    setNewMemberRole("viewer");
  };

  const handleRemoveTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter((m) => m.email !== email));
  };

  const handleTeamSubmit = async () => {
    if (teamMembers.length > 0) {
      await inviteTeamMutation.mutateAsync(teamMembers);
    }
    setStep(5);
  };

  const handlePlanSubmit = () => {
    if (!selectedPlan) {
      toast({ title: "Select a plan", description: "Please choose a plan to continue", variant: "destructive" });
      return;
    }
    const plan = PLANS.find((p) => p.id === selectedPlan);
    const actualPlanId = billingInterval === "annual" && plan?.annualId ? plan.annualId : selectedPlan;
    selectPlanMutation.mutate({ planId: actualPlanId, billingInterval });
  };

  const handlePaymentSubmit = () => {
    if (!cardNumber && !cardExpiry && !cardCvc && !cardName) {
      setStep(7);
      return;
    }
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      toast({ title: "Invalid card number", description: "Please enter a valid card number", variant: "destructive" });
      return;
    }
    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      toast({ title: "Invalid expiry", description: "Please enter expiry as MM/YY", variant: "destructive" });
      return;
    }
    if (cardCvc.length < 3 || cardCvc.length > 4) {
      toast({ title: "Invalid CVC", description: "Please enter a valid CVC code", variant: "destructive" });
      return;
    }
    const brand = cleanCard.startsWith("4") ? "visa" : cleanCard.startsWith("5") ? "mastercard" : cleanCard.startsWith("3") ? "amex" : "card";
    savePaymentMethodMutation.mutate({ cardLast4: cleanCard.slice(-4), cardBrand: brand, saveForLater: true });
  };

  const handleComplete = () => completeOnboardingMutation.mutate();

  const toggleMaterial = (material: string) => {
    setKeyMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    );
  };

  const togglePainPoint = (id: string) => {
    setPainPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ─── Formatting helpers ──────────────────────────────────────────────────

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  // ─── Progress bar ────────────────────────────────────────────────────────
  const progressPercent = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">Prescient Labs</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
            <span>Step {step} of {STEPS.length}</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step Indicators - compact */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-8 overflow-x-auto px-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <StepIndicator step={i + 1} currentStep={step} label={s.label} icon={<s.icon className="w-3.5 h-3.5" />} />
              {i < STEPS.length - 1 && (
                <div className={`w-3 sm:w-6 h-0.5 mx-0.5 transition-colors ${step > i + 1 ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Company ──────────────────────────────────────────── */}
        {step === 1 && (
          <Card data-testid="card-onboarding-company" className="border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Set up your organization
              </CardTitle>
              <CardDescription>We use this to configure forecasts and insights for your operation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  ref={companyNameRef}
                  id="companyName"
                  data-testid="input-company-name"
                  placeholder="Acme Manufacturing Co."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger id="industry" data-testid="select-industry" className="h-11">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger id="companySize" data-testid="select-company-size" className="h-11">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Headquarters</span>
                  </Label>
                  <Input id="location" data-testid="input-location" placeholder="Detroit, MI, USA" value={location} onChange={(e) => setLocation(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">
                    <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Annual Revenue</span>
                  </Label>
                  <Select value={annualRevenue} onValueChange={setAnnualRevenue}>
                    <SelectTrigger id="annualRevenue" className="h-11">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNUAL_REVENUE.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</span>
                </Label>
                <Input id="website" placeholder="https://acme-mfg.com" value={website} onChange={(e) => setWebsite(e.target.value)} className="h-11" />
              </div>

              <Separator />

              <Button onClick={handleCompanySubmit} className="w-full h-11" data-testid="button-continue-to-profile" disabled={setupCompanyMutation.isPending}>
                {setupCompanyMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up...</>
                ) : (
                  <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: User Profile ────────────────────────────────────── */}
        {step === 2 && (
          <Card data-testid="card-onboarding-profile" className="border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Your profile
              </CardTitle>
              <CardDescription>We'll use this to personalize dashboards, alerts, and reports for your role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" data-testid="input-first-name" placeholder="Austin" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" data-testid="input-last-name" placeholder="Wendler" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">
                  <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Job Title *</span>
                </Label>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger id="jobTitle" data-testid="select-job-title" className="h-11">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map((title) => (
                      <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger id="department" className="h-11">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Executive / C-Suite", "Operations", "Procurement / Supply Chain", "Manufacturing / Production", "Finance / Accounting", "Engineering", "IT / Technology", "Quality / Compliance", "Sales", "Other"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</span>
                </Label>
                <Input id="phone" data-testid="input-phone" type="tel" placeholder="+1 (555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                <p className="text-xs text-muted-foreground">For urgent supply chain alerts and account recovery</p>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="h-11"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleProfileSubmit} className="flex-1 h-11" data-testid="button-continue-to-ops" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 3: Operations Intelligence ─────────────────────────── */}
        {step === 3 && (
          <Card data-testid="card-onboarding-operations" className="border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Operations intelligence
              </CardTitle>
              <CardDescription>
                Detailed operations data improves forecast accuracy and procurement recommendations from day one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Production & Scale */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-muted-foreground" /> Production & Scale
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Production Volume</Label>
                    <Select value={productionVolume} onValueChange={setProductionVolume}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_VOLUME.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Procurement Spend</Label>
                    <Select value={annualProcurementSpend} onValueChange={setAnnualProcurementSpend}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {ANNUAL_PROCUREMENT_SPEND.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Number of Facilities</Label>
                    <Input type="number" placeholder="e.g., 3" value={numberOfFacilities} onChange={(e) => setNumberOfFacilities(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Active Suppliers</Label>
                    <Input type="number" placeholder="e.g., 120" value={numberOfSuppliers} onChange={(e) => setNumberOfSuppliers(e.target.value)} className="h-11" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Key Materials */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" /> Key Materials & Commodities
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Select all that apply — this drives commodity price tracking and risk monitoring</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {KEY_MATERIALS.map((mat) => (
                    <button
                      key={mat}
                      onClick={() => toggleMaterial(mat)}
                      className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                        keyMaterials.includes(mat)
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {keyMaterials.includes(mat) && <Check className="w-3 h-3 inline mr-1.5 text-primary" />}
                      {mat}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Top Products */}
              <div className="space-y-2">
                <Label htmlFor="topProducts">
                  <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Key Products or Product Lines</span>
                </Label>
                <Textarea
                  id="topProducts"
                  placeholder="e.g., CNC machined aircraft brackets, hydraulic valve assemblies, custom injection-molded housings..."
                  value={topProducts}
                  onChange={(e) => setTopProducts(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Helps calibrate demand forecasting models for your specific products</p>
              </div>

              <Separator />

              {/* Current ERP */}
              <div className="space-y-2">
                <Label>
                  <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Current ERP / MRP System</span>
                </Label>
                <Select value={erpSystem} onValueChange={setErpSystem}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select your system" /></SelectTrigger>
                  <SelectContent>
                    {ERP_SYSTEMS.map((erp) => (
                      <SelectItem key={erp} value={erp}>{erp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Pain Points */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Biggest Operational Challenges
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Select your top priorities — we'll configure your dashboard and alerts accordingly</p>
                <div className="space-y-2">
                  {PAIN_POINTS.map(({ id, label, icon: PainIcon }) => (
                    <button
                      key={id}
                      onClick={() => togglePainPoint(id)}
                      className={`w-full flex items-center gap-3 text-left text-sm px-4 py-3 rounded-lg border transition-all ${
                        painPoints.includes(id)
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${painPoints.includes(id) ? "bg-primary/10" : "bg-muted"}`}>
                        <PainIcon className={`w-4 h-4 ${painPoints.includes(id) ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className="flex-1">{label}</span>
                      {painPoints.includes(id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="h-11"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleOperationsSubmit} className="flex-1 h-11" data-testid="button-continue-to-team" disabled={saveOperationsMutation.isPending}>
                  {saveOperationsMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Configuring platform...</>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 4: Team Invitations ────────────────────────────────── */}
        {step === 4 && (
          <Card data-testid="card-onboarding-team" className="border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Invite your team
              </CardTitle>
              <CardDescription>
                Collaboration drives impact. Add key stakeholders from procurement, operations, and finance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="colleague@company.com"
                    type="email"
                    data-testid="input-team-email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTeamMember()}
                    className="h-11"
                  />
                </div>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-[140px] h-11" data-testid="select-team-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleAddTeamMember} className="h-11 w-11" data-testid="button-add-team-member">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggested roles */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recommended roles to invite:</p>
                <div className="flex flex-wrap gap-2">
                  {["Head of Procurement", "Plant Manager", "VP Operations", "Finance Lead", "IT / Systems Admin"].map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                  ))}
                </div>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Pending Invitations ({teamMembers.length})</Label>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`team-member-${member.email}`}
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{member.email}</span>
                          <Badge variant="secondary">{member.role}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTeamMember(member.email)} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamMembers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No team members added yet</p>
                  <p className="text-xs">You can always invite team members later from Settings</p>
                </div>
              )}

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="h-11"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleTeamSubmit} className="flex-1 h-11" data-testid="button-continue-to-plan" disabled={inviteTeamMutation.isPending}>
                  {inviteTeamMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending invites...</>
                  ) : teamMembers.length > 0 ? (
                    <>Send Invites & Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Skip & Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 5: Plan Selection ──────────────────────────────────── */}
        {step === 5 && (
          <Card data-testid="card-onboarding-plan" className="border-0 shadow-xl shadow-black/5 max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Choose your plan
              </CardTitle>
              <CardDescription>
                All plans include every module and feature. Your 90-day free trial starts today.
              </CardDescription>

              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant={billingInterval === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingInterval("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingInterval === "annual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingInterval("annual")}
                >
                  Annual
                  <Badge variant="secondary" className="ml-2 text-xs">Save ~17%</Badge>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const showAnnualPrice = billingInterval === "annual" && plan.annualPrice;
                  const displayPrice = showAnnualPrice ? plan.annualPrice : plan.price;
                  const displayInterval = showAnnualPrice ? "/mo (billed annually)" : plan.interval;
                  const Icon = plan.icon;

                  return (
                    <button
                      key={plan.id}
                      data-testid={`plan-${plan.id}`}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left rounded-xl border-2 p-5 transition-all hover:shadow-md ${
                        isSelected
                          ? `${plan.borderColor} ring-2 ring-primary/20 shadow-md`
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm">Most Popular</Badge>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                          <Icon className={`w-5 h-5 ${plan.color}`} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold">{displayPrice}</span>
                        <span className="text-xs text-muted-foreground">{displayInterval}</span>
                      </div>
                      {showAnnualPrice && plan.annualSavings && (
                        <Badge variant="outline" className="mb-2 text-xs text-emerald-600 border-emerald-300">{plan.annualSavings}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>

                      <ul className="space-y-1.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs">
                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="h-11"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handlePlanSubmit} className="flex-1 h-11" data-testid="button-continue-to-payment" disabled={!selectedPlan || selectPlanMutation.isPending}>
                  {selectPlanMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 6: Payment Method ──────────────────────────────────── */}
        {step === 6 && (
          <Card data-testid="card-onboarding-payment" className="border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment method
              </CardTitle>
              <CardDescription>
                Add a card now or skip — you won't be charged until your 14-day free trial ends.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">14-day free trial — no charge today</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Cancel anytime before your trial ends and you won't be billed.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input id="cardName" data-testid="input-card-name" placeholder="Austin Wendler" value={cardName} onChange={(e) => setCardName(e.target.value)} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input id="cardNumber" data-testid="input-card-number" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} maxLength={19} className="h-11" />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardExpiry">Expiry</Label>
                    <Input id="cardExpiry" data-testid="input-card-expiry" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} maxLength={5} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardCvc">CVC</Label>
                    <Input id="cardCvc" data-testid="input-card-cvc" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span>Encrypted and secure. We never store raw card data — powered by Stripe.</span>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(5)} className="h-11"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handlePaymentSubmit} className="flex-1 h-11" data-testid="button-continue-to-launch" disabled={savePaymentMethodMutation.isPending}>
                  {savePaymentMethodMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : cardNumber ? (
                    <>Save & Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Skip for Now <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 7: Launch ──────────────────────────────────────────── */}
        {step === 7 && (
          <Card data-testid="card-onboarding-launch" className="border-0 shadow-xl shadow-black/5">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/10">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">You're all set!</CardTitle>
              <CardDescription className="text-base mt-1">
                Your platform is configured and ready. Here's what to do next:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <FeatureHighlight
                  icon={<Building2 className="w-5 h-5" />}
                  title="Upload your product catalog"
                  description="Import your SKUs, materials, and suppliers to get accurate demand forecasts"
                />
                <FeatureHighlight
                  icon={<Rocket className="w-5 h-5" />}
                  title="Explore the Digital Twin"
                  description="See real-time economic indicators and how they affect your supply chain"
                />
                <FeatureHighlight
                  icon={<Users className="w-5 h-5" />}
                  title="Set up procurement rules"
                  description="Configure automated RFQ generation and purchase order triggers"
                />
                <FeatureHighlight
                  icon={<Target className="w-5 h-5" />}
                  title="Connect your ERP"
                  description="Sync live production data for real-time analytics and forecasting"
                />
              </div>

              <Separator />

              <Button onClick={handleComplete} className="w-full h-12 text-base" size="lg" data-testid="button-launch-platform" disabled={completeOnboardingMutation.isPending}>
                {completeOnboardingMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Launching...</>
                ) : (
                  <>Launch Prescient Labs <Rocket className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepIndicator({ step, currentStep, label, icon }: { step: number; currentStep: number; label: string; icon: React.ReactNode }) {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs ${
          isComplete
            ? "bg-primary text-primary-foreground"
            : isCurrent
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {isComplete ? <Check className="w-3.5 h-3.5" /> : icon}
      </div>
      <span className={`text-[10px] font-medium leading-none ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function FeatureHighlight({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors">
      <div className="text-primary shrink-0">{icon}</div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
