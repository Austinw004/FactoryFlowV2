import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Zap, Info, Calculator } from "lucide-react";
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
          Understanding dual-circuit economics and your competitive manufacturing advantage
        </p>
      </div>

      <Card className="border-primary/20" data-testid="card-platform-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6" />
            Platform Overview
          </CardTitle>
          <CardDescription>
            The dual-circuit economic framework that powers manufacturing intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Our Unique Financial Outlook
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Traditional economic analysis treats financial markets and the real economy as a unified system. 
                This is fundamentally wrong. <strong className="text-foreground">Financial markets and the real economy operate as two distinct circuits</strong> that can—and often do—diverge dramatically.
              </p>
              <p>
                The <strong className="text-foreground">Financial-to-Real Divergence (FDR) ratio</strong> measures this disconnect by comparing:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Financial Circuit:</strong> Asset price appreciation (S&P 500, margin debt expansion)</li>
                <li><strong className="text-foreground">Real Circuit:</strong> Manufacturing activity (PMI), core inflation, commercial lending</li>
              </ul>
              <p>
                When FDR rises above 3.0, financial assets are detaching from productive economic reality. 
                When FDR falls below 1.0, the real economy is outpacing speculative financial activity. 
                This creates <strong className="text-foreground">four distinct economic regimes</strong>, each requiring radically different manufacturing strategies.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">The Four Economic Regimes</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-primary mb-2">1. Healthy Expansion (FDR 0.8-1.5)</h4>
                <p className="text-sm text-muted-foreground">
                  The financial and real circuits are aligned, creating normal growth conditions. 
                  <strong className="text-foreground"> Strategy:</strong> Maintain steady capacity expansion with balanced procurement.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-orange-600 mb-2">2. Asset-Led Growth (FDR 1.5-3.0)</h4>
                <p className="text-sm text-muted-foreground">
                  The financial circuit is pulling ahead of the real economy. Credit is flowing, but manufacturing has not yet inflated. 
                  <strong className="text-foreground"> Strategy:</strong> Pursue aggressive material stockpiling before the price surge hits.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-destructive mb-2">3. Imbalanced Excess (FDR &gt; 3.0)</h4>
                <p className="text-sm text-muted-foreground">
                  A dangerous financial bubble has formed, and asset prices are divorced from economic fundamentals. 
                  <strong className="text-foreground"> Strategy:</strong> Adopt a defensive posture by reducing inventory, delaying capital expenditures, and preserving cash.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-green-600 mb-2">4. Real Economy Lead (FDR &lt; 0.8)</h4>
                <p className="text-sm text-muted-foreground">
                  Manufacturing is recovering faster than finance. Demand is returning while assets remain cheap. 
                  <strong className="text-foreground"> Strategy:</strong> Execute counter-cyclical procurement by buying aggressively while competitors hesitate.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Your Competitive Manufacturing Advantage
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Most manufacturing companies react to economic cycles after they have already happened. They buy materials when demand surges (thereby paying peak prices) 
                and slash inventory when demand falls (thereby missing recovery opportunities). <strong className="text-foreground">This platform allows you to act before the cycle turns.</strong>
              </p>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-foreground">Here's How You Win:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span><strong className="text-foreground">Regime-Aware Forecasting:</strong> Demand predictions automatically adjust based on the FDR ratio. During Imbalanced Excess periods, the system reduces forecasts by 15-30% before your competitors observe the demand collapse.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span><strong className="text-foreground">Counter-Cyclical Procurement:</strong> When the FDR signals a Real Economy Lead, procurement alerts inform you exactly when to purchase materials at depressed prices—while your competitors remain paralyzed by fear.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span><strong className="text-foreground">Constraint-Based Allocation:</strong> The allocation engine optimizes material distribution across SKUs by utilizing your bill of materials, product priorities, and real-time inventory data—thereby maximizing fill rates and minimizing waste.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <span><strong className="text-foreground">Policy Automation:</strong> Each economic regime generates specific policy signals (such as inventory buffers, credit terms, and capital expenditure gates) that translate economic intelligence into actionable manufacturing decisions.</span>
                  </li>
                </ul>
              </div>

              <p>
                The result? <strong className="text-foreground">You lock in material cost advantages during downturns, avoid overproduction during bubbles, and maintain optimal inventory through full cycles.</strong> 
                While competitors swing between feast and famine, you operate with consistent efficiency and superior margins.
              </p>
              
              <p className="text-sm italic border-l-2 border-primary pl-4">
                "This isn't about predicting the future—it's about recognizing the present regime and acting accordingly. 
                The dual-circuit framework gives manufacturers the same structural advantage that macro hedge funds have used for decades."
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">Platform Components Explained</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="dashboard">
                <AccordionTrigger>
                  <span className="font-semibold">Dashboard - Manufacturing Command Center</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> This is your real-time control panel that displays the economic regime status and key manufacturing metrics.</p>
                  <p><strong className="text-foreground">Key metrics displayed:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>FDR Score:</strong> The current Financial-to-Real Divergence ratio (for example, 5.0 means that financial assets are inflated 5 times more than the real economy)</li>
                    <li><strong>Active SKUs:</strong> The number of products you are currently manufacturing</li>
                    <li><strong>Average Fill Rate:</strong> The percentage of demand you are able to satisfy with available materials (100% indicates perfect fulfillment, while 70% indicates a material shortage)</li>
                    <li><strong>Recent Allocations:</strong> The most recent material distribution runs, showing which products received materials</li>
                  </ul>
                  <p><strong className="text-foreground">When to use it:</strong> Check this dashboard daily to understand current economic conditions and monitor manufacturing health.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="forecasting">
                <AccordionTrigger>
                  <span className="font-semibold">Forecasting - Regime-Aware Demand Predictions</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> This module predicts future demand for each product while automatically adjusting predictions based on the current economic regime.</p>
                  <p><strong className="text-foreground">How it works:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>It analyzes your historical sales data (past demand patterns)</li>
                    <li>It applies exponential smoothing and moving averages for statistical forecasting</li>
                    <li>It multiplies the results by regime-specific factors (for example, it reduces forecasts by 20% during Imbalanced Excess periods)</li>
                    <li>It displays the predicted units needed for the next period</li>
                  </ul>
                  <p><strong className="text-foreground">Example:</strong> If Widget A historically sells 1,000 units per month, but the platform detects that we are in an Imbalanced Excess regime, the forecast might display 800 units—thereby warning you to reduce production before the downturn occurs.</p>
                  <p><strong className="text-foreground">When to use it:</strong> Review this weekly for production planning and quarterly for capacity decisions.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="allocation">
                <AccordionTrigger>
                  <span className="font-semibold">Allocation - Smart Material Distribution Engine</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> This engine solves the complex problem of determining which products should receive which materials when you cannot manufacture everything at once.</p>
                  <p><strong className="text-foreground">The optimization considers:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>BOM (Bill of Materials):</strong> The recipe showing materials needed per product (for example, Widget A requires 2kg of steel plus 0.5kg of plastic)</li>
                    <li><strong>Available Inventory:</strong> The materials you have on hand plus those arriving soon</li>
                    <li><strong>SKU Priorities:</strong> Which products are most important (such as high-margin products or those for strategic customers)</li>
                    <li><strong>Budget Constraints:</strong> The total spending limit you have set</li>
                  </ul>
                  <p><strong className="text-foreground">Output you receive:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Allocated Units:</strong> The number of each product you can manufacture</li>
                    <li><strong>Fill Rate:</strong> The percentage of planned production achieved (for example, if you planned 100 units but received materials for 85 units, the fill rate equals 85%)</li>
                    <li><strong>Material Usage:</strong> Which materials were fully consumed versus which have leftovers</li>
                  </ul>
                  <p><strong className="text-foreground">Example:</strong> Suppose you have 1,000 kg of steel. Widget A requires 2 kg per unit (priority level 10), while Widget B requires 3 kg per unit (priority level 5). The engine maximizes value by allocating more steel to Widget A first.</p>
                  <p><strong className="text-foreground">When to use it:</strong> Run this before each production cycle to optimize material distribution.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="procurement">
                <AccordionTrigger>
                  <span className="font-semibold">Procurement - Counter-Cyclical Buying Signals</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> This module informs you when to aggressively purchase materials (at low prices) versus when to hold back (thereby avoiding peak prices).</p>
                  <p><strong className="text-foreground">Procurement signals by regime:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Real Economy Lead (FDR &lt; 0.8):</strong> BUY signal—competitors are fearful, prices are depressed, and this is your opportunity to stockpile materials</li>
                    <li><strong>Healthy Expansion (FDR 0.8-1.5):</strong> Normal purchasing patterns—maintain steady-state procurement</li>
                    <li><strong>Asset-Led Growth (FDR 1.5-3.0):</strong> Accelerate purchasing—prices are rising but have not yet peaked</li>
                    <li><strong>Imbalanced Excess (FDR &gt; 3.0):</strong> HOLD signal—the market is in bubble territory, so preserve cash and delay purchases</li>
                  </ul>
                  <p><strong className="text-foreground">Additional information displayed:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Supplier lead times (the duration until materials arrive)</li>
                    <li>Current inventory levels (on-hand quantities plus inbound shipments)</li>
                    <li>Material codes and units for purchasing purposes</li>
                  </ul>
                  <p><strong className="text-foreground">When to use it:</strong> Review this monthly or whenever the FDR crosses regime threshold boundaries.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reports">
                <AccordionTrigger>
                  <span className="font-semibold">Reports - Historical Analytics & Performance Tracking</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> Shows trends over time so you can learn from past allocation decisions and track manufacturing efficiency.</p>
                  <p><strong className="text-foreground">Analytics provided:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Allocation History:</strong> List of every allocation run with dates, budgets, and regime context</li>
                    <li><strong>Fill Rate Trends:</strong> Are you getting better or worse at meeting demand?</li>
                    <li><strong>SKU Performance:</strong> Which products consistently achieve high fill rates vs. which struggle</li>
                    <li><strong>Material Utilization:</strong> Are you over-ordering certain materials and running short on others?</li>
                  </ul>
                  <p><strong className="text-foreground">Use cases:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Compare performance across economic regimes</li>
                    <li>Identify materials to stockpile during favorable conditions</li>
                    <li>Justify capital allocation decisions to leadership</li>
                  </ul>
                  <p><strong className="text-foreground">When to use:</strong> Monthly for performance reviews, quarterly for strategic planning.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configuration">
                <AccordionTrigger>
                  <span className="font-semibold">Configuration - Master Data Management</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> Central place to manage your products, materials, and system settings.</p>
                  <p><strong className="text-foreground">You can configure:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>SKU Priorities:</strong> Set which products are most important (scale 1-10, higher = more critical)</li>
                    <li><strong>Material Inventory:</strong> Track on-hand quantities, inbound shipments, material codes</li>
                    <li><strong>Bill of Materials (BOM):</strong> Define material requirements for each product</li>
                    <li><strong>Supplier Information:</strong> Lead times, contact info, pricing (if integrated)</li>
                  </ul>
                  <p><strong className="text-foreground">When to use:</strong> Update inventory weekly, adjust priorities when business strategy changes.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="compliance">
                <AccordionTrigger>
                  <span className="font-semibold">Compliance Management - Regulatory Intelligence & Audit Tracking</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> Manages regulatory compliance documents, tracks audits, and maintains approval workflows—all with economic regime context to help you understand how different economic conditions affect compliance requirements and enforcement patterns.</p>
                  <p><strong className="text-foreground">Key features:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Document Version Control:</strong> Track compliance documents (policies, procedures, certificates, permits) with full version history and approval workflows</li>
                    <li><strong>Audit Management:</strong> Schedule and track internal/external audits, document findings, and manage corrective actions—each audit records the FDR ratio and economic regime at the time of assessment</li>
                    <li><strong>Regime-Aware Compliance:</strong> The system tracks which economic regime each document was created/modified under, helping you understand how compliance costs shift during different economic cycles</li>
                    <li><strong>Approval Workflows:</strong> Multi-level approval system for critical compliance documents ensures proper oversight and audit trails</li>
                  </ul>
                  <p><strong className="text-foreground">Example:</strong> During an Imbalanced Excess regime (FDR &gt; 3.0), regulatory enforcement often tightens as governments seek revenue. The system helps you prepare by flagging upcoming audit dates and ensuring all documentation is current before the regime shift occurs.</p>
                  <p><strong className="text-foreground">When to use:</strong> Update compliance documents as regulations change, review audit schedules quarterly, track regime patterns annually.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="production-kpis">
                <AccordionTrigger>
                  <span className="font-semibold">Production KPIs - Real-Time OEE Tracking & Bottleneck Detection</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> Calculates Overall Equipment Effectiveness (OEE) in real-time, tracks production runs, identifies bottlenecks, and provides regime-aware production recommendations to optimize manufacturing performance.</p>
                  <p><strong className="text-foreground">OEE Formula (Industry Standard):</strong></p>
                  <div className="bg-card border rounded p-3 my-2">
                    <p className="font-mono text-xs">OEE = Availability × Performance × Quality</p>
                    <ul className="list-none pl-4 space-y-1 mt-2">
                      <li><strong>Availability:</strong> (Operating Time / Planned Time) × 100</li>
                      <li><strong>Performance:</strong> (Actual Production / Theoretical Max) × 100</li>
                      <li><strong>Quality:</strong> (Good Units / Total Units) × 100</li>
                    </ul>
                  </div>
                  <p><strong className="text-foreground">Production metrics tracked:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Production Runs:</strong> Track start/end times, planned vs actual units, cycle times, downtime minutes, and defect rates for each production session</li>
                    <li><strong>Downtime Events:</strong> Categorize and analyze stoppages (breakdowns, changeovers, material shortages, maintenance, quality issues) with severity tracking</li>
                    <li><strong>Automated Bottleneck Detection:</strong> The system analyzes downtime patterns and automatically identifies machinery or processes causing production constraints</li>
                    <li><strong>Cycle Time Analysis:</strong> Compare actual cycle times against targets to identify efficiency opportunities</li>
                  </ul>
                  <p><strong className="text-foreground">Regime-aware recommendations:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Healthy Expansion:</strong> Optimize for growth—invest in capacity expansion and automation</li>
                    <li><strong>Asset-Led Growth:</strong> Balance expansion with efficiency—focus on productivity improvements over capacity additions</li>
                    <li><strong>Imbalanced Excess:</strong> Defensive posture—reduce production costs, improve margins, delay non-critical capex</li>
                    <li><strong>Real Economy Lead:</strong> Capitalize on growth—increase capacity to meet demand, lock in favorable supplier contracts</li>
                  </ul>
                  <p><strong className="text-foreground">Example:</strong> Your bottling line shows OEE of 68% (below the 75% industry standard). Automated analysis reveals that 45% of downtime comes from changeover delays. During a Real Economy Lead regime, the system recommends investing in quick-change tooling to capture the demand surge, whereas during Imbalanced Excess, it suggests procedural improvements instead of capital spending.</p>
                  <p><strong className="text-foreground">When to use:</strong> Monitor OEE daily, review bottleneck reports weekly, align production strategy with regime changes monthly.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="external-intelligence">
                <AccordionTrigger>
                  <span className="font-semibold">External Intelligence - Continuous Economic Data Gathering</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">What it does:</strong> Continuously gathers economic indicators, market data, and industry metrics from 15+ external APIs to provide real-time intelligence for FDR calculations and regime determination.</p>
                  <p><strong className="text-foreground">Data sources integrated:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>FRED (Federal Reserve Economic Data):</strong> 800K+ indicators including S&P 500, Treasury yields, Federal Funds Rate, GDP, industrial production, manufacturing PMI—unlimited free access</li>
                    <li><strong>Alpha Vantage:</strong> Economic indicators plus market news sentiment analysis—25 requests/day free tier</li>
                    <li><strong>DBnomics:</strong> Aggregates 22,000+ datasets from 82 providers (IMF, World Bank, OECD, Eurostat) for global economic data—unlimited access</li>
                    <li><strong>World Bank API:</strong> 16,000+ development indicators across 45+ databases—unlimited access</li>
                    <li><strong>IMF, OECD, Trading Economics:</strong> International financial statistics, labor data, trade metrics, and cross-country comparisons</li>
                    <li><strong>News API:</strong> Market news aggregation for sentiment analysis—100 requests/day</li>
                  </ul>
                  <p><strong className="text-foreground">How it enhances decision-making:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Real-Time FDR Calculation:</strong> Instead of relying solely on historical data, the platform pulls current financial and real economy indicators to calculate FDR ratios that reflect today's conditions</li>
                    <li><strong>Manufacturing-Specific Metrics:</strong> Tracks ISM Manufacturing PMI, manufacturers' new orders, durable goods orders, and capacity utilization—key indicators for production planning</li>
                    <li><strong>Market Sentiment:</strong> Analyzes news sentiment (bullish/bearish scores) to anticipate market moves before they appear in hard data</li>
                    <li><strong>Global Context:</strong> Compares U.S. manufacturing indicators against international trends to identify export/import opportunities</li>
                  </ul>
                  <p><strong className="text-foreground">Example:</strong> The platform detects that S&P 500 has surged 15% while industrial production index has only grown 2% in the same quarter. This divergence pushes FDR from 2.2 to 3.4, triggering a regime shift from Asset-Led Growth to Imbalanced Excess. The system automatically adjusts demand forecasts downward by 20% and signals HOLD on new material purchases—all before you manually notice the macroeconomic shift.</p>
                  <p><strong className="text-foreground">When to use:</strong> The system runs automatically in the background, updating regime calculations continuously. Review external data trends during strategic planning sessions.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Key Vocabulary & Concepts
            </h3>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">FDR (Financial-to-Real Divergence)</h4>
                <p className="text-muted-foreground">Ratio comparing financial market growth to real economy activity. FDR = (Financial Circuit Growth) / (Real Circuit Growth). Above 3.0 = bubble, below 0.8 = recovery.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">SKU (Stock Keeping Unit)</h4>
                <p className="text-muted-foreground">A specific product you manufacture. Each SKU has its own demand forecast, priority, and material requirements.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">BOM (Bill of Materials)</h4>
                <p className="text-muted-foreground">Recipe listing materials needed to make one unit of a product. Example: Widget A = 2kg Steel + 0.5kg Plastic + 1 Circuit Board.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Fill Rate</h4>
                <p className="text-muted-foreground">Percentage of planned production achieved. Fill Rate = (Allocated Units / Planned Units) × 100%. Higher is better—100% means you met full demand.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Allocation</h4>
                <p className="text-muted-foreground">The process of distributing limited materials across competing products. The system optimizes to maximize total value given constraints.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Regime</h4>
                <p className="text-muted-foreground">Economic state defined by FDR level. Each regime (Healthy, Asset-Led, Excess, Real Lead) requires different manufacturing strategies.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Policy Signals</h4>
                <p className="text-muted-foreground">Actionable recommendations generated by each regime. Examples: "Increase inventory buffer by 20%" or "Extend supplier payment terms to 60 days."</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Counter-Cyclical</h4>
                <p className="text-muted-foreground">Acting opposite to market sentiment. Buying when others panic (low prices), holding when others euphoric (high prices). Antonym of "pro-cyclical."</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Financial Circuit</h4>
                <p className="text-muted-foreground">Asset markets: stocks, bonds, derivatives. Measured by S&P 500 returns and margin debt growth. Can inflate independent of real production.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Real Circuit</h4>
                <p className="text-muted-foreground">Productive economy: manufacturing, employment, actual goods/services. Measured by PMI, core inflation, commercial lending. Reflects genuine economic activity.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">PMI (Purchasing Managers' Index)</h4>
                <p className="text-muted-foreground">Survey-based indicator of manufacturing health. Above 50 = expansion, below 50 = contraction. Key real economy metric in FDR calculation.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Constraint-Based Optimization</h4>
                <p className="text-muted-foreground">Mathematical approach that finds best solution given limits (budget, materials, capacity). The allocation engine uses this to maximize production value.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">OEE (Overall Equipment Effectiveness)</h4>
                <p className="text-muted-foreground">Industry-standard metric for production efficiency. OEE = Availability × Performance × Quality. World-class = 85%+, typical = 60-75%, poor = &lt;60%.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Bottleneck</h4>
                <p className="text-muted-foreground">Constraint that limits production throughput. Can be machinery (frequent breakdowns), materials (shortages), labor (insufficient staffing), or processes (inefficient workflows).</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Cycle Time</h4>
                <p className="text-muted-foreground">Time required to complete one production unit. Actual vs. target cycle time reveals efficiency gaps. Lower cycle times = higher throughput and productivity.</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-1">Compliance Regime Awareness</h4>
                <p className="text-muted-foreground">Understanding how economic cycles affect regulatory enforcement. During excess periods, regulators tighten oversight; during recovery, enforcement may soften as governments prioritize growth.</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Practical Example: Complete Workflow
            </h3>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Scenario: Mid-size automotive parts manufacturer</p>
              
              <div className="space-y-2">
                <p><strong className="text-foreground">Step 1 - Dashboard Check (Monday morning):</strong></p>
                <p>You open the dashboard and see FDR = 2.8, regime = "Asset-Led Growth." Financial markets are running ahead of manufacturing—warning sign that material prices may spike soon.</p>
              </div>

              <div className="space-y-2">
                <p><strong className="text-foreground">Step 2 - Review Forecasts:</strong></p>
                <p>Navigate to Forecasting page. Your three key SKUs show:</p>
                <ul className="list-disc pl-6">
                  <li>Brake Assembly: 1,200 units predicted (up 10% from baseline due to regime multiplier)</li>
                  <li>Fuel Pump: 850 units predicted (steady)</li>
                  <li>Alternator: 600 units predicted (down 5%—lower priority in Asset-Led regime)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p><strong className="text-foreground">Step 3 - Run Allocation:</strong></p>
                <p>Go to Allocation page. You have:</p>
                <ul className="list-disc pl-6">
                  <li>2,000kg Steel (on hand) + 500kg (inbound)</li>
                  <li>800kg Aluminum</li>
                  <li>300 Electronic Components</li>
                  <li>Budget: $75,000</li>
                </ul>
                <p>Click "Run Allocation" → The engine calculates you can produce:</p>
                <ul className="list-disc pl-6">
                  <li>Brake Assembly: 1,000 units (83% fill rate—short on electronics)</li>
                  <li>Fuel Pump: 850 units (100% fill rate)</li>
                  <li>Alternator: 450 units (75% fill rate—deprioritized due to lower margin)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p><strong className="text-foreground">Step 4 - Procurement Decision:</strong></p>
                <p>Navigate to Procurement. The platform signals: "ACCELERATE PURCHASING - Asset-Led regime suggests material cost inflation ahead."</p>
                <p>You place an order for 1,000 additional electronic components from your supplier (14-day lead time) to prepare for next month's Brake Assembly demand spike.</p>
              </div>

              <div className="space-y-2">
                <p><strong className="text-foreground">Step 5 - Track Results:</strong></p>
                <p>Two weeks later, FDR jumps to 3.2 (Imbalanced Excess). Electronic component prices surge 18%. Your early procurement saved $15,000. Reports page confirms average fill rate improved from 78% to 86% this quarter.</p>
              </div>

              <p className="text-foreground italic pt-2">
                This is the competitive advantage: You acted on regime intelligence while competitors reacted to price increases after they happened.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
