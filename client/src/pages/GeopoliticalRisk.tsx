import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, AlertTriangle } from "lucide-react";

export default function GeopoliticalRisk() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Geopolitical Risk</h1>
        <p className="text-muted-foreground">Trade war modeling and regional FDR analysis</p>
      </div>
      <Tabs defaultValue="risk">
        <TabsList><TabsTrigger value="risk">Risk Assessment</TabsTrigger></TabsList>
        <TabsContent value="risk">
          <Card><CardHeader><CardTitle>Geopolitical Risk Map</CardTitle><CardDescription>Track trade tensions and regional FDR divergence</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Monitor how geopolitical events affect supply chains and procurement strategies across regions.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
