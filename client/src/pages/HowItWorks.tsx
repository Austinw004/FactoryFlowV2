import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Target, Lightbulb, CheckCircle2, Factory, DollarSign, Package, BarChart3, Truck, Settings, AlertTriangle, ShieldCheck, Zap, Clock, Calendar, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useOnboardingSteps } from "@/hooks/useOnboardingSteps";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  const { steps, isFullyCompleted, isLoading: onboardingLoading } = useOnboardingSteps();

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-how-it-works">
          How It Works
        </h1>
        <p className="text-muted-foreground mt-1">
          Your complete guide to getting value from Prescient Labs
        </p>
      </div>

      {!onboardingLoading && !isFullyCompleted && (
        <OnboardingChecklist 
          steps={steps}
          showDismissButton={false}
          compact={true}
        />
      )}

      {/* QUICK START */}
      <Card className="border-primary/20 bg-primary/5" data-testid="card-quick-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lightbulb className="h-5 w-5 text-primary" />
            The Big Picture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">
            Prescient Labs helps you <strong className="text-foreground">buy materials at better times</strong> and <strong className="text-foreground">plan production smarter</strong> by analyzing market conditions and your operational data together.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Market Intelligence</p>
                <p className="text-xs text-muted-foreground">Know when conditions favor buying vs. waiting</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Demand Forecasting</p>
                <p className="text-xs text-muted-foreground">Predict what you'll need before you need it</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Smart Optimization</p>
                <p className="text-xs text-muted-foreground">Allocate materials to maximize results</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GETTING STARTED */}
      <Card data-testid="card-getting-started">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ArrowRight className="h-5 w-5" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Three steps to start getting value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">1</div>
              <div>
                <p className="font-medium">Add Your Data</p>
                <p className="text-sm text-muted-foreground">Upload your products, materials, and suppliers. The more data you add, the better your recommendations become.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">2</div>
              <div>
                <p className="font-medium">Review Your Dashboard</p>
                <p className="text-sm text-muted-foreground">Check the current market conditions and see initial recommendations based on your data.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">3</div>
              <div>
                <p className="font-medium">Act on Recommendations</p>
                <p className="text-sm text-muted-foreground">Use procurement signals and allocation suggestions to make better-timed decisions.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UNDERSTANDING MARKET CONDITIONS */}
      <Card data-testid="card-market-conditions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" />
            Understanding Market Conditions
          </CardTitle>
          <CardDescription>
            The platform identifies current business conditions and adjusts all recommendations accordingly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Think of market conditions like a weather forecast for business. We analyze economic indicators to tell you whether it's a good time to buy materials, hold steady, or be cautious.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">Favorable</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Good time to buy. Prices are competitive, and conditions support building inventory.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">Stable</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Normal operations. Maintain regular purchasing patterns and production schedules.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">Transitioning</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Conditions are shifting. Pay attention to signals and be ready to adjust strategy.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Cautious</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Consider slowing purchases. Preserve cash and wait for better conditions.
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Every feature in the platform uses this context. Forecasts, procurement signals, inventory recommendations, and supplier evaluations all adjust based on current conditions.
          </p>
        </CardContent>
      </Card>

      {/* DAILY & WEEKLY ROUTINES */}
      <Card data-testid="card-routines">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5" />
            Recommended Routines
          </CardTitle>
          <CardDescription>
            How to get ongoing value from the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Daily</Badge>
                <span className="text-sm text-muted-foreground">5 minutes</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Check the <strong>Dashboard</strong> for alerts and current conditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Review any <strong>AI Assistant</strong> recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Note any <strong>inventory alerts</strong> for low stock</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Weekly</Badge>
                <span className="text-sm text-muted-foreground">30 minutes</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Review <strong>demand forecasts</strong> for upcoming needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Run <strong>allocation optimizer</strong> before production</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Check <strong>supplier scores</strong> for any changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Review <strong>production metrics</strong> for bottlenecks</span>
                </li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Monthly</Badge>
              <span className="text-sm text-muted-foreground">1 hour</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm">Savings Review</p>
                <p className="text-xs text-muted-foreground">Track procurement savings from better timing decisions.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm">Forecast Accuracy</p>
                <p className="text-xs text-muted-foreground">Compare predictions to actual demand and note improvements.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm">Supplier Health</p>
                <p className="text-xs text-muted-foreground">Review supplier performance trends and risk levels.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PLATFORM FEATURES */}
      <Card data-testid="card-features">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Factory className="h-5 w-5" />
            Platform Features
          </CardTitle>
          <CardDescription>
            Click each section to learn more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="dashboard">
              <AccordionTrigger>
                <span className="font-medium">Dashboard</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Your central hub showing current market conditions, key metrics, and alerts requiring attention.</p>
                <p><strong className="text-foreground">Best for:</strong> Quick daily health checks and spotting issues early.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="forecasting">
              <AccordionTrigger>
                <span className="font-medium">Demand Forecasting</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Predicts future demand for each product using your historical data and current market context. Forecasts automatically adjust when conditions change.</p>
                <p><strong className="text-foreground">Best for:</strong> Planning production runs and anticipating material needs.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="allocation">
              <AccordionTrigger>
                <span className="font-medium">Material Allocation</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>When you can't make everything, this tool determines the optimal mix of products based on available materials, product priorities, and constraints.</p>
                <p><strong className="text-foreground">Best for:</strong> Maximizing output value from limited materials or budget.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="procurement">
              <AccordionTrigger>
                <span className="font-medium">Procurement Signals</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Clear guidance on whether to buy now, wait, or accelerate purchasing based on current market conditions and your inventory levels.</p>
                <p><strong className="text-foreground">Best for:</strong> Timing material purchases to get better prices.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="suppliers">
              <AccordionTrigger>
                <span className="font-medium">Supplier Management</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Track supplier performance, assess risk levels, and get alerts when supplier reliability changes. Includes automated RFQ generation when inventory is low.</p>
                <p><strong className="text-foreground">Best for:</strong> Maintaining supply chain health and catching problems early.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inventory">
              <AccordionTrigger>
                <span className="font-medium">Inventory Optimization</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Recommends optimal stock levels that balance holding costs against stockout risk, adjusted for current market conditions.</p>
                <p><strong className="text-foreground">Best for:</strong> Right-sizing inventory and avoiding both overstocking and stockouts.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="production">
              <AccordionTrigger>
                <span className="font-medium">Production Tracking</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Monitors production efficiency, tracks downtime, and identifies bottlenecks slowing your operations.</p>
                <p><strong className="text-foreground">Best for:</strong> Continuous improvement and identifying where to focus optimization efforts.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="machinery">
              <AccordionTrigger>
                <span className="font-medium">Equipment Management</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Tracks equipment information, maintenance schedules, depreciation, and replacement planning.</p>
                <p><strong className="text-foreground">Best for:</strong> Preventing unexpected equipment failures and capital planning.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger>
                <span className="font-medium">AI Assistant</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Ask questions in plain language and get answers using your data. The assistant understands your inventory, suppliers, forecasts, and market conditions.</p>
                <p><strong className="text-foreground">Best for:</strong> Quick answers without navigating through multiple screens.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports">
              <AccordionTrigger>
                <span className="font-medium">Reports & Analytics</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Track savings, forecast accuracy, and operational improvements over time. Includes peer benchmarking to compare against industry averages.</p>
                <p><strong className="text-foreground">Best for:</strong> Measuring ROI and identifying long-term trends.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* KEY CONCEPTS */}
      <Card data-testid="card-key-concepts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Key Concepts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-medium text-sm">Cross-Module Intelligence</p>
              <p className="text-xs text-muted-foreground">All features share data. Supplier issues affect procurement signals. Market conditions adjust forecasts. Everything works together.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Proactive Alerts</p>
              <p className="text-xs text-muted-foreground">The system watches for issues and opportunities, alerting you before problems become urgent.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Context-Aware Recommendations</p>
              <p className="text-xs text-muted-foreground">Suggestions change based on current conditions. What's right today may not be right tomorrow.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Continuous Learning</p>
              <p className="text-xs text-muted-foreground">Forecasts improve automatically as more data comes in. The longer you use it, the better it gets.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUPPORT */}
      <Card data-testid="card-support">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            Getting Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">AI Assistant</p>
              <p className="text-xs">Ask questions directly in the platform for instant answers.</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">Email Support</p>
              <p className="text-xs">support@prescientlabs.ai for detailed questions.</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">Account Manager</p>
              <p className="text-xs">Enterprise customers have dedicated support.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
