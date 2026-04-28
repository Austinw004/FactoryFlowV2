import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Database,
  FileText,
  Zap,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { useState } from "react";

interface ComplianceStatus {
  endToEndDataflow: boolean;
  downstreamEffect: boolean;
  entityResolution: boolean;
  regimeAware: boolean;
  failureLogging: boolean;
  noConflicts: boolean;
  documented: boolean;
}

interface IntegrationReadiness {
  integrationId: string;
  integrationName: string;
  tier: "full" | "configured" | "setup_ready";
  type: string;
  compliance: ComplianceStatus;
  overallStatus: "compliant" | "partial" | "non_compliant";
  limitations: string[];
  isConfigured: boolean;
}

interface ReadinessReport {
  totalIntegrations: number;
  byTier: {
    full: number;
    configured: number;
    setupReady: number;
  };
  byCompliance: {
    compliant: number;
    partial: number;
    nonCompliant: number;
  };
  integrations: IntegrationReadiness[];
  generatedAt: string;
}

export function IntegrationReadinessReport() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<{
    success: boolean;
    report: ReadinessReport;
    mandate: {
      description: string;
      requirements: string[];
    };
  }>({
    queryKey: ["/api/integrations/readiness"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading readiness report...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.success || !data?.report) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            Unable to load readiness report
          </div>
        </CardContent>
      </Card>
    );
  }

  const { report, mandate } = data;
  const compliancePercent = Math.round(
    (report.byCompliance.compliant / report.totalIntegrations) * 100
  );
  const partialPercent = Math.round(
    (report.byCompliance.partial / report.totalIntegrations) * 100
  );

  const fullIntegrations = report.integrations.filter((i) => i.tier === "full");
  const configuredIntegrations = report.integrations.filter(
    (i) => i.tier === "configured"
  );
  const setupReadyIntegrations = report.integrations.filter(
    (i) => i.tier === "setup_ready"
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "partial":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const renderIntegrationItem = (integration: IntegrationReadiness, showLimitations: boolean = true) => (
    <div
      key={integration.integrationId}
      className="flex flex-col p-3 rounded-lg border gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(integration.overallStatus)}
          <span className="font-medium">{integration.integrationName}</span>
          <span className="text-xs text-muted-foreground">
            ({integration.type})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {integration.isConfigured ? (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
              Credentials Set
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Awaiting Setup
            </Badge>
          )}
        </div>
      </div>
      {showLimitations && integration.limitations.length > 0 && (
        <div className="pl-6 text-xs text-muted-foreground">
          <span className="font-medium">Limitations:</span>{" "}
          {integration.limitations.slice(0, 2).join("; ")}
          {integration.limitations.length > 2 && ` (+${integration.limitations.length - 2} more)`}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">
                Integration Integrity Mandate
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh-readiness"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${isRefetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{report.totalIntegrations}</div>
              <div className="text-xs text-muted-foreground">
                Total
              </div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {report.byTier.full}
              </div>
              <div className="text-xs text-green-600/80">Full Tier</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {report.byTier.configured}
              </div>
              <div className="text-xs text-blue-600/80">Configured</div>
            </div>
            <div className="text-center p-3 bg-amber-500/10 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {report.byTier.setupReady}
              </div>
              <div className="text-xs text-amber-600/80">Setup Ready</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {report.byCompliance.compliant}
              </div>
              <div className="text-xs text-purple-600/80">Compliant</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Compliance Progress</span>
              <span>{compliancePercent}% fully compliant</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${compliancePercent}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${partialPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-good rounded-full" /> Compliant
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-signal rounded-full" /> Partial
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full" />{" "}
                Non-compliant
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
              onClick={() =>
                setExpandedSection(
                  expandedSection === "full" ? null : "full"
                )
              }
              data-testid="section-full-integrations"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="font-medium">
                  Full Tier ({fullIntegrations.length})
                </span>
                <Badge variant="secondary" className="text-xs">
                  API-capable with data persistence
                </Badge>
              </div>
              {expandedSection === "full" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
            {expandedSection === "full" && (
              <div className="pl-4 space-y-2">
                <div className="text-xs text-muted-foreground p-2 bg-green-500/5 rounded border border-green-500/10">
                  Full tier integrations have implemented API connections with data persistence. 
                  Status shows whether credentials are configured.
                </div>
                {fullIntegrations.map((i) => renderIntegrationItem(i, true))}
              </div>
            )}

            <div
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
              onClick={() =>
                setExpandedSection(
                  expandedSection === "configured" ? null : "configured"
                )
              }
              data-testid="section-configured-integrations"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  Configured Tier ({configuredIntegrations.length})
                </span>
                <Badge variant="secondary" className="text-xs">
                  Credential storage only
                </Badge>
              </div>
              {expandedSection === "configured" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
            {expandedSection === "configured" && (
              <div className="pl-4 space-y-2 max-h-72 overflow-y-auto">
                <div className="text-xs text-muted-foreground p-2 bg-blue-500/5 rounded border border-blue-500/10">
                  Configured tier integrations store credentials but require additional API implementation 
                  for full functionality. Data flow is not yet active.
                </div>
                {configuredIntegrations.slice(0, 15).map((i) => renderIntegrationItem(i, true))}
                {configuredIntegrations.length > 15 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    + {configuredIntegrations.length - 15} more integrations
                  </div>
                )}
              </div>
            )}

            <div
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
              onClick={() =>
                setExpandedSection(
                  expandedSection === "setup_ready" ? null : "setup_ready"
                )
              }
              data-testid="section-setup-ready-integrations"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Settings className="w-4 h-4 text-amber-500" />
                <span className="font-medium">
                  Setup Ready ({setupReadyIntegrations.length})
                </span>
                <Badge variant="secondary" className="text-xs">
                  UI only, no backend
                </Badge>
              </div>
              {expandedSection === "setup_ready" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
            {expandedSection === "setup_ready" && (
              <div className="pl-4 space-y-2 max-h-72 overflow-y-auto">
                <div className="text-xs text-muted-foreground p-2 bg-amber-500/5 rounded border border-amber-500/10">
                  Setup Ready integrations have UI components but no backend implementation. 
                  These require development to become functional.
                </div>
                {setupReadyIntegrations.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No setup-ready integrations in registry
                  </div>
                ) : (
                  setupReadyIntegrations.slice(0, 15).map((i) => renderIntegrationItem(i, true))
                )}
                {setupReadyIntegrations.length > 15 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    + {setupReadyIntegrations.length - 15} more integrations
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Mandate Requirements
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {mandate.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {req}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-right mt-4">
            Last updated: {new Date(report.generatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
