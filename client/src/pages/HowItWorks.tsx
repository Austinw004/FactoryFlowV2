import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Target, Lightbulb, CheckCircle2, Factory, DollarSign, Package, BarChart3, Truck, Settings, AlertTriangle, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useOnboardingSteps } from "@/hooks/useOnboardingSteps";

export default function HowItWorks() {
  const { steps, isFullyCompleted, isLoading: onboardingLoading } = useOnboardingSteps();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-how-it-works">
          How It Works
        </h1>
        <p className="text-muted-foreground mt-1">
          Your guide to getting the most out of Prescient Labs
        </p>
      </div>

      {!onboardingLoading && isFullyCompleted && (
        <OnboardingChecklist 
          steps={steps}
          showDismissButton={false}
          compact={true}
        />
      )}

      {/* OVERVIEW SECTION */}
      <Card className="border-primary/20 bg-primary/5" data-testid="card-platform-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            What Prescient Labs Does for You
          </CardTitle>
          <CardDescription>
            We help you buy materials at the right time and plan production smarter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-base">
              <strong className="text-foreground">The core problem we solve:</strong> Most manufacturers buy materials when everyone else is buying (prices are high) and cut back when everyone else cuts back (missing opportunities). Prescient Labs helps you do the opposite - and profit from it.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>What You Get</span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Buy materials when market conditions favor lower prices</li>
                  <li>Plan production based on real market intelligence</li>
                  <li>Automatically optimize which products to make with available materials</li>
                  <li>Track your equipment, inventory, and workforce in one place</li>
                  <li>Get alerts about market shifts before your competitors notice</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Target className="h-5 w-5" />
                  <span>The Results</span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Lower material costs</strong> - Strategic timing beats panic buying</li>
                  <li><strong className="text-foreground">Better cash flow</strong> - Optimize inventory levels for conditions</li>
                  <li><strong className="text-foreground">Fewer stockouts</strong> - Proactive planning keeps you stocked</li>
                  <li><strong className="text-foreground">Higher margins</strong> - Lower costs + better timing = more profit</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAILY WORKFLOW SECTION */}
      <Card data-testid="card-daily-workflow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6" />
            Recommended Daily & Weekly Routines
          </CardTitle>
          <CardDescription>
            How to get the most value from the platform on an ongoing basis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Daily Check (5 minutes)
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  <span>Check the <strong className="text-foreground">Dashboard</strong> for current market conditions and any alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  <span>Review the <strong className="text-foreground">AI Assistant</strong> for any proactive recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  <span>Check <strong className="text-foreground">Inventory Alerts</strong> for any materials running low</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Weekly Review (30 minutes)
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  <span>Review <strong className="text-foreground">Demand Forecasts</strong> and compare to actual sales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  <span>Run <strong className="text-foreground">Allocation Optimizer</strong> for next production cycle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  <span>Check <strong className="text-foreground">Supplier Risk Scores</strong> for any changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">4.</span>
                  <span>Review <strong className="text-foreground">Production Metrics</strong> (OEE, bottlenecks)</span>
                </li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Monthly Strategic Review (1 hour)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm mb-1">Procurement Analysis</p>
                <p className="text-xs text-muted-foreground">Review savings achieved through better timing. Track materials purchased during favorable vs. unfavorable conditions.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm mb-1">Forecast Accuracy</p>
                <p className="text-xs text-muted-foreground">Compare predictions to actuals. Note which products forecast well and which need adjustment.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="font-medium text-sm mb-1">Supply Chain Health</p>
                <p className="text-xs text-muted-foreground">Review supplier performance trends. Identify any suppliers needing diversification or replacement.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MARKET INTELLIGENCE SECTION */}
      <Card data-testid="card-market-intelligence">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6" />
            Market Intelligence System
          </CardTitle>
          <CardDescription>
            How we help you time your decisions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Smart Timing Signals
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Our platform continuously monitors economic conditions and tells you whether it's a good time to buy, hold, or be cautious. Think of it like a traffic light for purchasing decisions.
              </p>
              <p>
                We analyze multiple market indicators to identify the current business climate. This intelligence feeds into all our recommendations - from procurement timing to inventory levels to capital planning.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">Market Conditions We Identify</h3>
            <p className="text-sm text-muted-foreground mb-4">The system automatically identifies which climate we're in and adjusts recommendations accordingly:</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Normal Growth</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Economy is healthy and balanced.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Standard operations - maintain steady purchasing and production.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-600">Early Warning</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Market heating up, prices starting to rise.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Speed up purchasing before prices surge - stock up now.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h4 className="font-semibold text-destructive">Caution Zone</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Prices elevated, correction possible.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Slow down - reduce inventory, preserve cash, wait for better prices.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-600">Opportunity Zone</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Business recovering, prices still favorable.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Buy aggressively while competitors are hesitant - lock in good prices.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Your Competitive Advantage
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Most manufacturers are reactive - they respond to what already happened. <strong className="text-foreground">Prescient Labs helps you be proactive</strong> - you act before market conditions fully shift.
              </p>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Real Example:</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong className="text-foreground">Competitor approach:</strong> Waits until demand surges, prices already high, pays premium for materials, lower margins
                  </p>
                  <p>
                    <strong className="text-primary">Your approach:</strong> Platform signals "Opportunity Zone", you buy materials at favorable prices, demand surges, you're already stocked, higher margins
                  </p>
                </div>
              </div>

              <p>
                <strong className="text-foreground">The bottom line:</strong> Customers consistently buy materials at better prices than competitors by acting at the right time. This translates to meaningful savings every year.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FEATURE EXPLANATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Platform Features
          </CardTitle>
          <CardDescription>
            Click each section to learn more about the tools available to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="dashboard">
              <AccordionTrigger>
                <span className="font-semibold">Dashboard - Your Control Center</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What you see:</strong> Real-time snapshot of your manufacturing operation and current market conditions.</p>
                <p><strong className="text-foreground">Key information displayed:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Market Conditions:</strong> Clear indicator showing if it's a good time to buy, hold, or be cautious</li>
                  <li><strong>Active Products:</strong> How many different products you're making</li>
                  <li><strong>Order Fulfillment:</strong> Percentage of orders you can complete with current materials</li>
                  <li><strong>Recent Activity:</strong> Latest production runs and material allocations</li>
                </ul>
                <p><strong className="text-foreground">When to check it:</strong> Daily for a quick health check of your operation.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="forecasting">
              <AccordionTrigger>
                <span className="font-semibold">Demand Planning - Predict What You'll Need</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Predicts future demand for each product, automatically adjusted based on current market conditions.</p>
                <p><strong className="text-foreground">How it helps:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Analyzes your historical sales patterns</li>
                  <li>Uses industry-proven forecasting methods</li>
                  <li>Adjusts predictions based on current business climate</li>
                  <li>Shows expected demand for next week/month/quarter</li>
                </ul>
                <p><strong className="text-foreground">Example:</strong> Product A normally sells 1,000 units/month. System detects market slowdown signals, so it shows 800 units instead - warning you to reduce production before demand drops.</p>
                <p><strong className="text-foreground">When to use it:</strong> Weekly for production planning, monthly for inventory decisions.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="allocation">
              <AccordionTrigger>
                <span className="font-semibold">Material Planning - Optimize What Gets Made</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Figures out which products to make when you can't make everything at once (limited materials or budget).</p>
                <p><strong className="text-foreground">What it considers:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Recipes (Bill of Materials):</strong> Materials needed for each product</li>
                  <li><strong>What You Have:</strong> Current inventory plus incoming shipments</li>
                  <li><strong>Product Priority:</strong> Which products are most important (high margin, key customers, etc.)</li>
                  <li><strong>Your Budget:</strong> Total spending limit</li>
                </ul>
                <p><strong className="text-foreground">What you get:</strong> Clear recommendations on how many of each product to make to maximize your results.</p>
                <p><strong className="text-foreground">When to use it:</strong> Before each production run to optimize material usage.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="procurement">
              <AccordionTrigger>
                <span className="font-semibold">Purchasing - When to Buy Materials</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tells you when to buy aggressively (favorable conditions) vs. when to hold back (unfavorable conditions).</p>
                <p><strong className="text-foreground">Buying signals by market condition:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Opportunity Zone:</strong> BUY - Conditions favorable, good time to stock up</li>
                  <li><strong>Normal Growth:</strong> NORMAL - Steady purchasing, business as usual</li>
                  <li><strong>Early Warning:</strong> ACCELERATE - Conditions changing, buy before prices rise</li>
                  <li><strong>Caution Zone:</strong> HOLD - Elevated prices, preserve cash, wait for better conditions</li>
                </ul>
                <p><strong className="text-foreground">Also shows:</strong> Supplier delivery times, current inventory levels, material codes for ordering</p>
                <p><strong className="text-foreground">When to use it:</strong> Monthly, or whenever market conditions change significantly.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="suppliers">
              <AccordionTrigger>
                <span className="font-semibold">Supplier Intelligence - Know Your Partners</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tracks and scores your suppliers to help you make better sourcing decisions.</p>
                <p><strong className="text-foreground">Key features:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Risk Scoring:</strong> Identifies which suppliers may have reliability concerns</li>
                  <li><strong>Performance Tracking:</strong> On-time delivery, quality rates, pricing history</li>
                  <li><strong>Geographic Risk:</strong> Regional factors that might affect supply</li>
                  <li><strong>Automated RFQs:</strong> System can generate quote requests when inventory is low</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Monthly for supplier reviews, as-needed for sourcing decisions.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="machinery">
              <AccordionTrigger>
                <span className="font-semibold">Machinery - Track Your Equipment</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Manages all your equipment information, maintenance schedules, and tracks equipment value over time.</p>
                <p><strong className="text-foreground">Key features:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Equipment Registry:</strong> Complete list of machines with purchase dates, values, specifications</li>
                  <li><strong>Depreciation Tracking:</strong> Calculates current equipment value</li>
                  <li><strong>Maintenance Schedules:</strong> When each machine needs service</li>
                  <li><strong>Replacement Planning:</strong> Alerts when equipment is approaching end of useful life</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Monthly to track maintenance, annually for capital planning.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="production">
              <AccordionTrigger>
                <span className="font-semibold">Production Tracking - Monitor Performance</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tracks how efficiently your production runs, identifies problems, and shows where to improve.</p>
                <p><strong className="text-foreground">Key metrics:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Efficiency Score (OEE):</strong> Overall productivity percentage - 85%+ is world-class, below 60% needs attention</li>
                  <li><strong>Downtime Tracking:</strong> Why and when production stopped</li>
                  <li><strong>Bottleneck Detection:</strong> Finds which process is slowing everything down</li>
                  <li><strong>Quality Rates:</strong> Percentage of good units vs. defects</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Daily for operations, weekly to identify improvement opportunities.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inventory">
              <AccordionTrigger>
                <span className="font-semibold">Inventory Management - Optimize Stock Levels</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tells you when to reorder materials, how much to keep on hand, and identifies slow-moving inventory.</p>
                <p><strong className="text-foreground">Key features:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Reorder Alerts:</strong> Automatic notification when stock drops below safe levels</li>
                  <li><strong>Optimal Stock Levels:</strong> Balances holding costs vs. stockout risk</li>
                  <li><strong>ABC Analysis:</strong> Identifies which materials need most attention</li>
                  <li><strong>Slow-Mover Detection:</strong> Flags materials sitting too long</li>
                </ul>
                <p><strong className="text-foreground">Market-aware recommendations:</strong> During "Opportunity Zone," suggests building safety stock. During "Caution Zone," recommends reducing inventory to preserve cash.</p>
                <p><strong className="text-foreground">When to use it:</strong> Weekly to review recommendations, daily to check alerts.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="erp">
              <AccordionTrigger>
                <span className="font-semibold">ERP Integration - Connect Your Systems</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Connects Prescient Labs with your existing business systems for seamless data flow.</p>
                <p><strong className="text-foreground">Supported integrations:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>SAP S/4HANA</li>
                  <li>Oracle NetSuite</li>
                  <li>Microsoft Dynamics 365</li>
                  <li>Sage X3</li>
                  <li>Infor CloudSuite</li>
                  <li>Custom API connections</li>
                </ul>
                <p><strong className="text-foreground">Benefits:</strong> Automatic data sync means no manual data entry, real-time visibility, and consistent information across systems.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports">
              <AccordionTrigger>
                <span className="font-semibold">Reports & Analytics - Track Your Progress</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Generates insights and tracks the value you're getting from the platform.</p>
                <p><strong className="text-foreground">Key reports:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>ROI Dashboard:</strong> Tracks procurement savings and forecast accuracy improvements</li>
                  <li><strong>Peer Benchmarking:</strong> Compare your performance to industry averages</li>
                  <li><strong>Trend Analysis:</strong> Spot patterns in your operations over time</li>
                  <li><strong>Custom Reports:</strong> Build reports for your specific needs</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Monthly for business reviews, quarterly for strategic planning.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* GETTING HELP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Getting Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Need help?</strong> Our support team is here for you:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>In-app chat:</strong> Click the support icon in the bottom right corner</li>
            <li><strong>Email:</strong> support@prescientlabs.ai</li>
            <li><strong>Enterprise customers:</strong> Your dedicated account manager is available for personalized assistance</li>
          </ul>
          <p className="pt-2">
            <strong className="text-foreground">Response times:</strong> Starter plans receive email support within 24 hours. Professional plans get priority support within 4 hours. Enterprise plans have dedicated support with 1-hour response times.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
