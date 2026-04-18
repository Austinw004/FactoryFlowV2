import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Target, Lightbulb, CheckCircle2, Factory, Package, BarChart3, Truck, ShieldCheck, Zap, Clock, Layers, Brain, LineChart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-how-it-works">
          How It Works
        </h1>
        <p className="text-muted-foreground mt-1">
          Understand what Prescient Labs does for your manufacturing operation
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5" data-testid="card-big-picture">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lightbulb className="h-5 w-5 text-primary" />
            The Big Picture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">
            Prescient Labs continuously monitors economic conditions, your inventory, supplier health, and demand patterns to tell you <strong className="text-foreground">when to buy</strong>, <strong className="text-foreground">what to prioritize</strong>, and <strong className="text-foreground">where risks are forming</strong> &mdash; before they become problems.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Market-Aware Timing</p>
                <p className="text-xs text-muted-foreground">Procurement signals adjust to real economic conditions so you buy at better prices</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Demand Forecasting</p>
                <p className="text-xs text-muted-foreground">Predict what you will need across every SKU and plan production ahead of time</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Smart Allocation</p>
                <p className="text-xs text-muted-foreground">When materials are limited, optimize which products to prioritize for maximum value</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-how-platform-works">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-5 w-5" />
            What the Platform Does
          </CardTitle>
          <CardDescription>
            A unified system that connects your procurement, production, and supply chain data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Reads the Economic Environment</p>
                <p className="text-sm text-muted-foreground">The platform continuously ingests data from public economic sources and commodity markets to determine whether current conditions favor aggressive purchasing, steady operations, or cautious cash preservation. This assessment updates automatically and flows into every recommendation you see.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <LineChart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Forecasts Demand for Your Products</p>
                <p className="text-sm text-muted-foreground">Using your historical sales and production data, the system builds forecasts for each product you make. These forecasts are not static &mdash; they re-calibrate as new data arrives and as market conditions shift, so projections stay relevant.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Monitors Your Supply Chain</p>
                <p className="text-sm text-muted-foreground">Supplier reliability, lead times, inventory levels, and commodity price movements are tracked in one place. When something changes &mdash; a supplier slips, a material price spikes, or stock runs low &mdash; the platform surfaces it before it disrupts your operation.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Generates Actionable Signals</p>
                <p className="text-sm text-muted-foreground">Rather than showing raw data, the platform converts everything into clear recommendations: buy now or wait, which products to prioritize, which suppliers need attention, and where potential risks are compounding. You make the final call &mdash; the system gives you the information to make it confidently.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Learns and Improves Over Time</p>
                <p className="text-sm text-muted-foreground">Forecasts and recommendations improve as more of your operational data flows through the system. The platform tracks its own accuracy and adjusts, so the value it delivers compounds the longer you use it.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-market-conditions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" />
            Understanding Market Conditions
          </CardTitle>
          <CardDescription>
            Every recommendation in the platform adjusts based on current conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Think of it like a weather forecast for your business. The platform reads economic signals and tells you what kind of environment you are operating in right now, so you can act accordingly.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">Favorable</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Good time to buy. Conditions support building inventory and locking in competitive prices.
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
                Conditions are shifting. Pay closer attention to signals and be ready to adjust strategy.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Cautious</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Consider slowing purchases. Preserve cash and wait for better conditions before committing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p>When you cannot make everything, this tool determines the optimal mix of products based on available materials, product priorities, and constraints.</p>
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
                <p>Ask questions in plain language and get answers drawn from your data. The assistant understands your inventory, suppliers, forecasts, and market conditions.</p>
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
              <p className="text-xs text-muted-foreground">All features share data. Supplier issues affect procurement signals. Market conditions adjust forecasts. Everything works together as one system.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Proactive Alerts</p>
              <p className="text-xs text-muted-foreground">The platform watches for issues and opportunities, alerting you before problems become urgent.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Context-Aware Recommendations</p>
              <p className="text-xs text-muted-foreground">Suggestions change based on current conditions. What is right today may not be right tomorrow.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Performance-Based Pricing</p>
              <p className="text-xs text-muted-foreground">We earn a percentage of verified savings. If we do not save you money, you do not pay beyond your base subscription.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-support">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            Getting Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">AI Assistant</p>
              <p className="text-xs">Ask questions directly in the platform for instant answers.</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">Email Support</p>
              <p className="text-xs">
                <a href="mailto:support@prescient-labs.com" className="underline hover:text-foreground">
                  support@prescient-labs.com
                </a>{" "}
                for detailed questions.
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="font-medium text-foreground text-sm mb-1">General Inquiries</p>
              <p className="text-xs">
                <a href="mailto:info@prescient-labs.com" className="underline hover:text-foreground">
                  info@prescient-labs.com
                </a>{" "}
                for anything else.
              </p>
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
