import { Component, ReactNode, ErrorInfo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

interface TabErrorBoundaryProps {
  children: ReactNode;
  tabName: string;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  public state: TabErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.tabName}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Error loading {this.props.tabName}</CardTitle>
              </div>
              <CardDescription>
                Something went wrong while loading this section. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error && (
                <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-auto max-h-24">
                  <p className="text-destructive">{this.state.error.message}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

interface SafeTabContentProps {
  tabName: string;
  children: ReactNode;
}

export function SafeTabContent({ tabName, children }: SafeTabContentProps) {
  return (
    <TabErrorBoundary tabName={tabName}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </TabErrorBoundary>
  );
}
