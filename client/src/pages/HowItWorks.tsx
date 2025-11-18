import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Zap, Target, Lightbulb, CheckCircle2, Factory, DollarSign, Package, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HowItWorks() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-how-it-works">
          How It Works
        </h1>
        <p className="text-muted-foreground mt-1">
          Simple guide to understanding your manufacturing intelligence platform
        </p>
      </div>

      {/* OVERVIEW SECTION - New top section explaining the big picture */}
      <Card className="border-primary/20 bg-primary/5" data-testid="card-platform-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            What This Platform Does
          </CardTitle>
          <CardDescription>
            The simple explanation: We help you buy materials at the right time and plan production smarter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-base">
              <strong className="text-foreground">Here's the core idea:</strong> Most manufacturers buy materials when everyone else is buying (prices are high) and cut back when everyone else cuts back (missing opportunities). This platform helps you do the opposite.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>What You Get</span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Buy materials when prices are low (not when everyone else is buying)</li>
                  <li>• Plan production based on real market conditions (not just guesses)</li>
                  <li>• Automatically calculate which products to make with available materials</li>
                  <li>• Track your equipment, inventory, and workforce in one place</li>
                  <li>• Get alerts about market conditions before your competitors notice</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Target className="h-5 w-5" />
                  <span>The Result</span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong className="text-foreground">Lower material costs</strong> - You buy when others are scared</li>
                  <li>• <strong className="text-foreground">Better cash flow</strong> - You hold less inventory during slow times</li>
                  <li>• <strong className="text-foreground">Fewer stockouts</strong> - Smart planning means you have what you need</li>
                  <li>• <strong className="text-foreground">Higher margins</strong> - Lower costs + better timing = more profit</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HOW THE PROGRAM FUNCTIONS */}
      <Card data-testid="card-how-it-functions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6" />
            How the Program Functions
          </CardTitle>
          <CardDescription>
            Understanding the system that powers smarter manufacturing decisions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              The Market Conditions System
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                The platform watches what's happening in the economy and tells you whether it's a good time to buy, hold, or be cautious. Think of it like a traffic light for purchasing decisions.
              </p>
              <p>
                We track something called the <strong className="text-foreground">"Market Conditions Score"</strong> (technical folks call it FDR). This number tells you if the market is:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Overheated:</strong> Stock prices are way up, but actual business activity hasn't caught up → Time to be careful</li>
                <li><strong className="text-foreground">Recovering:</strong> Business activity is picking up faster than prices → Time to buy aggressively</li>
                <li><strong className="text-foreground">Normal:</strong> Everything is balanced → Business as usual</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">Four Business Climates (Simple Version)</h3>
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
                  Market getting excited, prices starting to rise.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Speed up purchasing before prices surge - stock up now.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h4 className="font-semibold text-destructive">Bubble Territory</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Prices are way too high, correction likely coming.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Slow down - reduce inventory, preserve cash, wait for prices to drop.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-600">Opportunity Zone</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Business recovering, prices still low - best buying opportunity.
                  <strong className="text-foreground block mt-1">Your strategy:</strong> Buy aggressively while competitors are scared - lock in low prices.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Why This Gives You an Advantage
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Most manufacturers are reactive - they respond to what already happened. <strong className="text-foreground">This platform helps you be proactive</strong> - you act before market conditions fully shift.
              </p>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Real Example:</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong className="text-foreground">Competitor approach:</strong> Waits until demand surges → Prices are already high → Pays premium for materials → Lower margins
                  </p>
                  <p>
                    <strong className="text-primary">Your approach:</strong> Platform signals "Opportunity Zone" → You buy materials at low prices → Demand surges → You're already stocked → Higher margins
                  </p>
                </div>
              </div>

              <p>
                <strong className="text-foreground">The bottom line:</strong> You consistently buy materials 15-30% cheaper than competitors by acting at the right time. Over a year, this can mean hundreds of thousands in savings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAILED FEATURE EXPLANATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            What Each Feature Does
          </CardTitle>
          <CardDescription>
            Click each section to learn more about the platform tools
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
                  <li><strong>Market Conditions:</strong> Simple indicator showing if it's a good time to buy, hold, or be cautious</li>
                  <li><strong>Active Products:</strong> How many different products you're making</li>
                  <li><strong>Order Fulfillment:</strong> Percentage of orders you can complete with current materials (100% = perfect, 70% = running low)</li>
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
                <p><strong className="text-foreground">How it works:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Looks at your past sales patterns</li>
                  <li>Uses proven forecasting methods (exponential smoothing, moving averages)</li>
                  <li>Adjusts predictions up or down based on current business climate</li>
                  <li>Shows you expected demand for next week/month/quarter</li>
                </ul>
                <p><strong className="text-foreground">Simple example:</strong> Product A normally sells 1,000 units/month. Platform detects "Bubble Territory" (slowdown coming), so it shows 800 units instead - warning you to reduce production before demand drops.</p>
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
                  <li><strong>Recipes (Bill of Materials):</strong> Materials needed for each product (e.g., Widget A needs 2kg steel + 0.5kg plastic)</li>
                  <li><strong>What You Have:</strong> Current inventory plus incoming shipments</li>
                  <li><strong>Product Priority:</strong> Which products are most important (high margin, key customers, etc.)</li>
                  <li><strong>Your Budget:</strong> Total spending limit</li>
                </ul>
                <p><strong className="text-foreground">What you get:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>How many of each product you can make</li>
                  <li>Fill rate percentage (e.g., planned 100 units, can make 85 = 85% fill rate)</li>
                  <li>Which materials will be fully used vs. leftovers</li>
                </ul>
                <p><strong className="text-foreground">Simple example:</strong> You have 1,000kg steel. Widget A (high priority) needs 2kg, Widget B (low priority) needs 3kg. System allocates more to Widget A first to maximize value.</p>
                <p><strong className="text-foreground">When to use it:</strong> Before each production run to optimize material usage.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="procurement">
              <AccordionTrigger>
                <span className="font-semibold">Purchasing - When to Buy Materials</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tells you when to buy aggressively (low prices) vs. when to hold back (high prices).</p>
                <p><strong className="text-foreground">Buying signals by market condition:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Opportunity Zone:</strong> 🟢 BUY - Prices are low, competitors scared, best time to stock up</li>
                  <li><strong>Normal Growth:</strong> ⚪ NORMAL - Steady purchasing, business as usual</li>
                  <li><strong>Early Warning:</strong> 🟡 ACCELERATE - Prices rising, buy before they peak</li>
                  <li><strong>Bubble Territory:</strong> 🔴 HOLD - Market overheated, preserve cash, wait for prices to drop</li>
                </ul>
                <p><strong className="text-foreground">Also shows:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Supplier delivery times</li>
                  <li>Current inventory levels</li>
                  <li>Material codes for ordering</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Monthly, or whenever market conditions change significantly.</p>
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
                  <li><strong>Depreciation Tracking:</strong> Calculates current equipment value (using industry-standard methods)</li>
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
                  <li><strong>Downtime Tracking:</strong> Why and when production stopped (breakdowns, changeovers, material shortages)</li>
                  <li><strong>Bottleneck Detection:</strong> Automatically finds which machine or process slows everything down</li>
                  <li><strong>Quality Rates:</strong> Percentage of good units vs. defects</li>
                </ul>
                <p><strong className="text-foreground">Simple example:</strong> Production line shows 68% efficiency. System identifies 45% of downtime from changeovers. Platform recommends faster changeover equipment during "Opportunity Zone" (when investments make sense).</p>
                <p><strong className="text-foreground">When to use it:</strong> Daily for operations, weekly to identify improvement opportunities.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="maintenance">
              <AccordionTrigger>
                <span className="font-semibold">Equipment Maintenance - Prevent Breakdowns</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Predicts when equipment might fail so you can fix it before it breaks down during production.</p>
                <p><strong className="text-foreground">How it works:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Monitors equipment sensors (temperature, vibration, pressure, etc.)</li>
                  <li>Detects unusual patterns that signal upcoming problems</li>
                  <li>Alerts you before failure occurs</li>
                  <li>Recommends maintenance timing based on actual condition (not just calendar)</li>
                </ul>
                <p><strong className="text-foreground">Benefits:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Schedule maintenance during planned downtime (not emergency shutdowns)</li>
                  <li>Reduce unexpected breakdowns by 40-60%</li>
                  <li>Extend equipment life by catching problems early</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Check alerts daily, review trends weekly.</p>
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
                  <li><strong>ABC Analysis:</strong> Identifies which materials need most attention (A = critical, C = low priority)</li>
                  <li><strong>Slow-Mover Detection:</strong> Flags materials sitting too long (could be cash freed up)</li>
                </ul>
                <p><strong className="text-foreground">Market-aware recommendations:</strong> During "Opportunity Zone," suggests higher safety stock. During "Bubble Territory," recommends reducing inventory to preserve cash.</p>
                <p><strong className="text-foreground">When to use it:</strong> Weekly to review recommendations, daily to check alerts.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="supply-chain">
              <AccordionTrigger>
                <span className="font-semibold">Supply Chain Tracking - Follow Materials from Source to Product</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Tracks every batch of materials through your facility - where it came from, where it went, what happened to it.</p>
                <p><strong className="text-foreground">Why it matters:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Quality Issues:</strong> If a defect is found, quickly trace which batches are affected</li>
                  <li><strong>Recalls:</strong> Identify exactly which finished products contain problematic materials</li>
                  <li><strong>Compliance:</strong> Prove material origin and handling for audits</li>
                  <li><strong>Supplier Performance:</strong> Track which suppliers consistently deliver good quality</li>
                </ul>
                <p><strong className="text-foreground">What it tracks:</strong> Receipt, inspection, storage location, production use, shipment - full chain of custody.</p>
                <p><strong className="text-foreground">When to use it:</strong> Continuous tracking, review during quality issues or audits.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="workforce">
              <AccordionTrigger>
                <span className="font-semibold">Workforce Scheduling - Optimize Labor</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Manages shift schedules, tracks employee skills, and ensures you have the right people at the right time.</p>
                <p><strong className="text-foreground">Key features:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Shift Planning:</strong> Create schedules that match production needs</li>
                  <li><strong>Skills Matching:</strong> Assign workers to jobs they're qualified for</li>
                  <li><strong>Overtime Tracking:</strong> Monitor labor costs and compliance</li>
                  <li><strong>Attendance Management:</strong> Track absences and plan coverage</li>
                </ul>
                <p><strong className="text-foreground">Market-aware staffing:</strong> During "Normal Growth" or "Opportunity Zone," recommends adequate staffing for growth. During "Bubble Territory," flags overtime reduction opportunities.</p>
                <p><strong className="text-foreground">When to use it:</strong> Weekly for schedule planning, daily for attendance tracking.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="compliance">
              <AccordionTrigger>
                <span className="font-semibold">Compliance - Manage Regulations & Audits</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Keeps track of permits, certificates, audits, and regulatory requirements - ensures you stay compliant.</p>
                <p><strong className="text-foreground">Key features:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Document Management:</strong> Store and track all compliance documents with version history</li>
                  <li><strong>Audit Scheduling:</strong> Track internal and external audits, manage findings</li>
                  <li><strong>Renewal Alerts:</strong> Notifications before permits or certificates expire</li>
                  <li><strong>Approval Workflows:</strong> Multi-level sign-off for critical documents</li>
                </ul>
                <p><strong className="text-foreground">Market context:</strong> System notes market conditions during audits - helps you understand how enforcement patterns shift with economic cycles.</p>
                <p><strong className="text-foreground">When to use it:</strong> Update documents as needed, review audit schedules quarterly.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports">
              <AccordionTrigger>
                <span className="font-semibold">Reports - Analyze Performance Over Time</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Shows trends and patterns so you can learn what works and what doesn't.</p>
                <p><strong className="text-foreground">Key reports:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Material Cost Trends:</strong> Are you paying more or less over time?</li>
                  <li><strong>Fill Rate History:</strong> Getting better or worse at meeting demand?</li>
                  <li><strong>Product Performance:</strong> Which products consistently perform well vs. struggle?</li>
                  <li><strong>Market Timing Analysis:</strong> Did you buy at the right time? Review past decisions.</li>
                </ul>
                <p><strong className="text-foreground">Use cases:</strong> Compare performance across different market conditions, identify materials to stockpile during good opportunities, justify decisions to leadership.</p>
                <p><strong className="text-foreground">When to use it:</strong> Monthly for performance reviews, quarterly for strategic planning.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings">
              <AccordionTrigger>
                <span className="font-semibold">Settings - Configure Your System</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">What it does:</strong> Central place to manage your products, materials, suppliers, and system preferences.</p>
                <p><strong className="text-foreground">What you configure:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Product Priorities:</strong> Which products matter most (1-10 scale, higher = more important)</li>
                  <li><strong>Material Inventory:</strong> Current quantities, codes, units, locations</li>
                  <li><strong>Recipes (BOMs):</strong> Material requirements for each product</li>
                  <li><strong>Supplier Info:</strong> Delivery times, contact details, pricing (if connected)</li>
                </ul>
                <p><strong className="text-foreground">When to use it:</strong> Update inventory weekly, adjust priorities when strategy changes, review supplier info monthly.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* FINAL SUMMARY */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">The Bottom Line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">This platform doesn't require you to become a financial expert.</strong> It watches the markets for you and translates complex economic signals into simple recommendations: "Buy now," "Hold back," "Business as usual."
          </p>
          <p>
            The system combines market intelligence with your production data to help you make better decisions than competitors who only look at their own operations.
          </p>
          <p className="text-foreground font-semibold">
            Result: Lower costs, better margins, more predictable operations - without needing an economics degree.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
