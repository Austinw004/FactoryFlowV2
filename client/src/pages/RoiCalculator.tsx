import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, Calculator, DollarSign, TrendingUp, 
  Percent, Clock, ArrowRight, Sparkles, BarChart3
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function RoiCalculator() {
  const [, setLocation] = useLocation();
  
  // Input state
  const [annualSpend, setAnnualSpend] = useState(5000000);
  const [skuCount, setSkuCount] = useState(200);
  const [forecastAccuracy, setForecastAccuracy] = useState(65);
  const [procurementCycles, setProcurementCycles] = useState(12);

  // Projected estimate percentages (not proven, for estimation purposes only)
  const PROCUREMENT_SAVINGS_RATE = 0.18; // 18% projected from counter-cyclical timing opportunity
  const FORECAST_IMPROVEMENT = 0.30; // 30% MAPE improvement potential
  const STOCKOUT_REDUCTION = 0.25; // 25% reduction potential in stockouts
  const CARRYING_COST_RATE = 0.20; // 20% industry standard carrying cost rate

  // Calculations
  const procurementSavings = annualSpend * PROCUREMENT_SAVINGS_RATE;
  const forecastImprovementValue = (100 - forecastAccuracy) * FORECAST_IMPROVEMENT;
  const newAccuracy = Math.min(95, forecastAccuracy + forecastImprovementValue);
  
  // Estimated inventory reduction from better forecasting (conservative 10%)
  const inventoryReduction = annualSpend * 0.15 * 0.10;
  const carryingCostSavings = inventoryReduction * CARRYING_COST_RATE;
  
  // Time savings (hours per month * avg procurement salary)
  const timeSavingsHours = procurementCycles * 8; // 8 hours per cycle saved
  const timeSavingsValue = timeSavingsHours * 75 * 12; // $75/hr * 12 months
  
  // Total annual value
  const totalAnnualValue = procurementSavings + carryingCostSavings + timeSavingsValue;
  
  // ROI based on Professional plan
  const annualCost = 799 * 12;
  const roi = ((totalAnnualValue - annualCost) / annualCost) * 100;
  const paybackMonths = annualCost / (totalAnnualValue / 12);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(0)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4">ROI Calculator</Badge>
          <h1 className="text-4xl font-bold mb-4">Calculate Your Potential Savings</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how counter-cyclical procurement timing and intelligent forecasting could impact your bottom line.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Inputs */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Your Numbers
              </h2>
              
              <div className="space-y-8">
                {/* Annual Procurement Spend */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="spend">Annual Procurement Spend</Label>
                    <span className="font-semibold">{formatCurrency(annualSpend)}</span>
                  </div>
                  <Slider
                    id="spend"
                    min={500000}
                    max={50000000}
                    step={100000}
                    value={[annualSpend]}
                    onValueChange={(v) => setAnnualSpend(v[0])}
                    data-testid="slider-spend"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$500K</span>
                    <span>$50M</span>
                  </div>
                </div>

                {/* SKU Count */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="skus">Number of SKUs</Label>
                    <span className="font-semibold">{skuCount}</span>
                  </div>
                  <Slider
                    id="skus"
                    min={10}
                    max={5000}
                    step={10}
                    value={[skuCount]}
                    onValueChange={(v) => setSkuCount(v[0])}
                    data-testid="slider-skus"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10</span>
                    <span>5,000</span>
                  </div>
                </div>

                {/* Current Forecast Accuracy */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="accuracy">Current Forecast Accuracy</Label>
                    <span className="font-semibold">{forecastAccuracy}%</span>
                  </div>
                  <Slider
                    id="accuracy"
                    min={30}
                    max={90}
                    step={1}
                    value={[forecastAccuracy]}
                    onValueChange={(v) => setForecastAccuracy(v[0])}
                    data-testid="slider-accuracy"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>30% (Poor)</span>
                    <span>90% (Excellent)</span>
                  </div>
                </div>

                {/* Procurement Cycles */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="cycles">Procurement Cycles per Year</Label>
                    <span className="font-semibold">{procurementCycles}</span>
                  </div>
                  <Slider
                    id="cycles"
                    min={4}
                    max={52}
                    step={1}
                    value={[procurementCycles]}
                    onValueChange={(v) => setProcurementCycles(v[0])}
                    data-testid="slider-cycles"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Quarterly</span>
                    <span>Weekly</span>
                  </div>
                </div>
              </div>

              <Card className="p-4 mt-8 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These calculations use conservative estimates based on typical customer outcomes. 
                  Actual results vary based on industry, market conditions, and implementation quality.
                </p>
              </Card>
            </div>

            {/* Results */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Your Potential Savings
              </h2>

              {/* Summary Cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <Card className="p-6 bg-primary text-primary-foreground">
                  <div className="text-sm opacity-80 mb-1">Annual Value</div>
                  <div className="text-3xl font-bold">{formatCurrency(totalAnnualValue)}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">ROI</div>
                  <div className="text-3xl font-bold text-green-600">{formatPercent(roi)}</div>
                </Card>
              </div>

              {/* Breakdown */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Value Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">Procurement Savings</div>
                        <div className="text-xs text-muted-foreground">Counter-cyclical timing opportunities</div>
                      </div>
                    </div>
                    <div className="font-semibold text-green-600">{formatCurrency(procurementSavings)}</div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Carrying Cost Reduction</div>
                        <div className="text-xs text-muted-foreground">Better forecasting = lower inventory</div>
                      </div>
                    </div>
                    <div className="font-semibold text-blue-600">{formatCurrency(carryingCostSavings)}</div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-medium">Time Savings</div>
                        <div className="text-xs text-muted-foreground">{timeSavingsHours} hours/year automated</div>
                      </div>
                    </div>
                    <div className="font-semibold text-purple-600">{formatCurrency(timeSavingsValue)}</div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">Forecast Accuracy</div>
                        <div className="text-xs text-muted-foreground">Improvement with regime-aware models</div>
                      </div>
                    </div>
                    <div className="font-semibold">{forecastAccuracy}% → {newAccuracy.toFixed(0)}%</div>
                  </div>
                </div>
              </Card>

              {/* Payback */}
              <Card className="p-6 mt-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Payback Period</div>
                    <div className="text-sm text-muted-foreground">Based on Professional plan ($799/mo)</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {paybackMonths.toFixed(1)} months
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold mb-6 text-center">Estimation Methodology</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">These are projected estimates based on counter-cyclical procurement research, not guaranteed results.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="text-2xl font-bold text-primary mb-2">Estimated potential</div>
              <div className="font-medium mb-1">Potential Procurement Savings</div>
              <p className="text-sm text-muted-foreground">
                Estimated savings opportunity from counter-cyclical buying - purchasing when economic indicators signal optimal timing.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-primary mb-2">Estimated potential</div>
              <div className="font-medium mb-1">Potential MAPE Improvement</div>
              <p className="text-sm text-muted-foreground">
                Projected forecast accuracy improvement from regime-aware models with automated retraining.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-primary mb-2">~8 hrs</div>
              <div className="font-medium mb-1">Estimated Time Saved</div>
              <p className="text-sm text-muted-foreground">
                Estimated time savings per procurement cycle through automation and AI assistance.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">Ready to Validate These Estimates?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start a pilot to test these projections with your own data and see real results.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/pilot-program")} data-testid="button-start-pilot">
              Start a Pilot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} data-testid="button-schedule-demo">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Prescient Labs. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
