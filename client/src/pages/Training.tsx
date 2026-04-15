import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Factory,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  durationMin: number;
  lessons: string[];
  badge: string;
  prerequisite?: string;
}

const MODULES: Module[] = [
  {
    id: "orientation",
    title: "Floor Orientation",
    description: "What Prescient Labs does, how to navigate, and how to ask the platform for help.",
    icon: BookOpen,
    durationMin: 10,
    lessons: [
      "Welcome tour of the product",
      "Using Cmd+K to find anything in 3 keystrokes",
      "Reading the Regime Status widget",
      "Asking the AI Assistant the right question",
    ],
    badge: "Certified Operator — Orientation",
  },
  {
    id: "procurement",
    title: "Smart Procurement",
    description: "Turn price signals into purchase orders operators actually trust.",
    icon: ShoppingCart,
    durationMin: 25,
    lessons: [
      "Quick Wins: what the score means",
      "Auto-Purchase Recommendations: when to accept, when to override",
      "Supplier comparison and contract timing",
      "Exporting a defensible purchase rationale",
    ],
    badge: "Certified Procurement Operator",
    prerequisite: "orientation",
  },
  {
    id: "inventory",
    title: "Inventory & Traceability",
    description: "Keep stock thin without stocking out; prove lot provenance on demand.",
    icon: PackageSearch,
    durationMin: 25,
    lessons: [
      "Materials-at-Risk ranking and dominant drivers",
      "Reorder point and service level trade-offs",
      "Running a traceability chain report",
      "Verifying a signed chain-of-custody report",
    ],
    badge: "Certified Inventory + Traceability Operator",
    prerequisite: "orientation",
  },
  {
    id: "production",
    title: "Production Monitoring",
    description: "Read sensor signals, anomaly alerts, and RUL predictions before they become downtime.",
    icon: Factory,
    durationMin: 20,
    lessons: [
      "Anomaly severity bands and what to do with them",
      "Interpreting RUL confidence",
      "Triaging a predictive maintenance alert",
      "Scheduling maintenance from an alert",
    ],
    badge: "Certified Production Operator",
    prerequisite: "orientation",
  },
  {
    id: "strategy",
    title: "Strategy & Digital Twin",
    description: "Run what-if scenarios. Measure impact. Defend decisions with data.",
    icon: TrendingUp,
    durationMin: 30,
    lessons: [
      "Running a scenario simulation",
      "Reading the Impact Dashboard",
      "Building a business case for the board",
      "Using the ROI calculator in a pilot presentation",
    ],
    badge: "Certified Strategy Operator",
    prerequisite: "procurement",
  },
  {
    id: "security",
    title: "Security & Compliance",
    description: "Your role in keeping the platform (and your customers) safe.",
    icon: ShieldCheck,
    durationMin: 15,
    lessons: [
      "Choosing strong passwords and MFA",
      "Reading audit logs; what gets logged",
      "Handling CUI-tagged records",
      "Reporting suspected incidents",
    ],
    badge: "Certified Security Steward",
  },
];

const STORAGE_KEY = "prescient_training_progress_v1";

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function saveProgress(p: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

function ModuleCard({
  module,
  progress,
  locked,
  onComplete,
}: {
  module: Module;
  progress: number;
  locked: boolean;
  onComplete: (moduleId: string) => void;
}) {
  const Icon = module.icon;
  const done = progress >= module.lessons.length;
  const percent = Math.min(100, Math.round((progress / module.lessons.length) * 100));
  return (
    <Card className={cn(locked && "opacity-60")} data-testid={`training-module-${module.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{module.title}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {module.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {done && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
              </Badge>
            )}
            {locked && (
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="h-3 w-3 mr-1" /> Locked
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{module.durationMin} min</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percent} />
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          {module.lessons.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {done ? (
            <Button variant="secondary" size="sm" disabled>
              <Award className="h-3.5 w-3.5 mr-1" />
              {module.badge}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onComplete(module.id)}
              disabled={locked}
              data-testid={`training-complete-${module.id}`}
            >
              {progress === 0 ? "Start module" : "Mark next lesson complete"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Training() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress());

  const handleCompleteLesson = (moduleId: string) => {
    const module = MODULES.find((m) => m.id === moduleId);
    if (!module) return;
    const current = progress[moduleId] ?? 0;
    const next = Math.min(current + 1, module.lessons.length);
    const newProgress = { ...progress, [moduleId]: next };
    setProgress(newProgress);
    saveProgress(newProgress);
    if (next === module.lessons.length) {
      toast({
        title: "Certification earned",
        description: `You earned: ${module.badge}.`,
      });
    }
  };

  const earned = MODULES.filter(
    (m) => (progress[m.id] ?? 0) >= m.lessons.length,
  ).length;

  return (
    <div className="p-6 space-y-6" data-testid="training-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Training & Certification</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Self-paced modules that take operators from first login to confidence
            on every surface of the platform. Completing a module earns a
            certification badge; progress is stored locally and also reported to
            your company's training ledger.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {earned} / {MODULES.length} certifications earned
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const p = progress[m.id] ?? 0;
          const prereqDone =
            !m.prerequisite ||
            (progress[m.prerequisite] ?? 0) >=
              (MODULES.find((x) => x.id === m.prerequisite)?.lessons.length ?? 0);
          return (
            <ModuleCard
              key={m.id}
              module={m}
              progress={p}
              locked={!prereqDone}
              onComplete={handleCompleteLesson}
            />
          );
        })}
      </div>
    </div>
  );
}
