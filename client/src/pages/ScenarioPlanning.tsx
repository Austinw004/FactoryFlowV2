import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Activity } from "lucide-react";

export default function ScenarioPlanning() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Scenario Planning</h1>
        <p className="text-muted-foreground">Regime transition modeling and what-if analysis</p>
      </div>
      <Tabs defaultValue="simulator">
        <TabsList><TabsTrigger value="simulator">Scenario Simulator</TabsTrigger></TabsList>
        <TabsContent value="simulator">
          <Card><CardHeader><CardTitle>What-If Simulator</CardTitle><CardDescription>Model regime transitions and multi-variable scenarios</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Create scenarios to test how FDR changes, commodity price shifts, and demand fluctuations impact your operations.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
