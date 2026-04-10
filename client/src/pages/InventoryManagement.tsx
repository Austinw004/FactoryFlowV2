import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Calendar,
  AlertCircle,
  Sparkles,
  Activity
} from "lucide-react";
import type {
  PurchaseOrder,
  MaterialUsageTracking,
  ProcurementSchedule,
  AutoPurchaseRecommendation,
  Material,
  Supplier
} from "@shared/schema";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function InventoryManagement() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Fetch all data
  const { data: purchaseOrders, isLoading: isLoadingOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: materialUsage, isLoading: isLoadingUsage } = useQuery<MaterialUsageTracking[]>({
    queryKey: ["/api/material-usage"],
  });

  const { data: procurementSchedules, isLoading: isLoadingSchedules } = useQuery<ProcurementSchedule[]>({
    queryKey: ["/api/procurement-schedules"],
  });

  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery<AutoPurchaseRecommendation[]>({
    queryKey: ["/api/auto-purchase-recommendations"],
  });

  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const isLoading = isLoadingOrders || isLoadingUsage || isLoadingSchedules || isLoadingRecommendations;

  // Helper functions
  const getMaterialName = (materialId: string) => {
    const material = materials?.find(m => m.id === materialId);
    return material?.name || "Unknown Material";
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || "Unknown Supplier";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <Activity className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "in_progress":
        return "default";
      case "delivered":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getRecommendationPriorityVariant = (priority: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Filter purchase orders by status
  const filteredOrders = purchaseOrders?.filter(order => 
    selectedStatus === "all" || order.status === selectedStatus
  ) || [];

  const orderCounts = {
    all: purchaseOrders?.length || 0,
    pending: purchaseOrders?.filter(o => o.status === "pending").length || 0,
    in_progress: purchaseOrders?.filter(o => o.status === "in_progress").length || 0,
    delivered: purchaseOrders?.filter(o => o.status === "delivered").length || 0,
    cancelled: purchaseOrders?.filter(o => o.status === "cancelled").length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-inventory">
          Inventory Management
        </h1>
        <p className="text-muted-foreground mt-1">
          One-stop shop for purchase orders, material usage, and automated procurement
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orders">{orderCounts.all}</div>
            <p className="text-xs text-muted-foreground">All purchase orders</p>
          </CardContent>
        </Card>

        <Card data-testid="card-in-progress">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-in-progress">{orderCounts.in_progress}</div>
            <p className="text-xs text-muted-foreground">Active deliveries</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending">{orderCounts.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-schedules">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-schedules">
              {procurementSchedules?.filter(s => s.isActive === "active").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Automated procurement</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList data-testid="tabs-inventory">
          <TabsTrigger value="orders" data-testid="tab-orders">
            <Package className="h-4 w-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">
            <TrendingDown className="h-4 w-4 mr-2" />
            Material Usage
          </TabsTrigger>
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <Calendar className="h-4 w-4 mr-2" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Track all purchase orders across different status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("all")}
                  data-testid="button-filter-all"
                >
                  All ({orderCounts.all})
                </Button>
                <Button
                  variant={selectedStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("pending")}
                  data-testid="button-filter-pending"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Pending ({orderCounts.pending})
                </Button>
                <Button
                  variant={selectedStatus === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("in_progress")}
                  data-testid="button-filter-inprogress"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  In Progress ({orderCounts.in_progress})
                </Button>
                <Button
                  variant={selectedStatus === "delivered" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("delivered")}
                  data-testid="button-filter-delivered"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Delivered ({orderCounts.delivered})
                </Button>
                <Button
                  variant={selectedStatus === "cancelled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("cancelled")}
                  data-testid="button-filter-cancelled"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Cancelled ({orderCounts.cancelled})
                </Button>
              </div>

              {/* Orders Table */}
              {filteredOrders.length === 0 ? (
                <Alert data-testid="alert-no-orders">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No purchase orders found for this status.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{getMaterialName(order.materialId)}</TableCell>
                          <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                          <TableCell>{order.quantity.toFixed(2)}</TableCell>
                          <TableCell>${order.totalCost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)} data-testid={`badge-status-${order.id}`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(order.status)}
                                {order.status.replace("_", " ")}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(order.orderDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {order.expectedDeliveryDate
                              ? format(new Date(order.expectedDeliveryDate), "MMM d, yyyy")
                              : "TBD"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Material Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Usage Tracking</CardTitle>
              <CardDescription>Monitor material consumption and costs</CardDescription>
            </CardHeader>
            <CardContent>
              {!materialUsage || materialUsage.length === 0 ? (
                <Alert data-testid="alert-no-usage">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No material usage records found. Usage will be tracked automatically as production runs.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantity Used</TableHead>
                        <TableHead>Usage Type</TableHead>
                        <TableHead>Usage Date</TableHead>
                        <TableHead>Remaining Stock</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialUsage.slice(0, 10).map((usage) => (
                        <TableRow key={usage.id} data-testid={`row-usage-${usage.id}`}>
                          <TableCell>{getMaterialName(usage.materialId)}</TableCell>
                          <TableCell>{usage.quantityUsed.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{usage.usageType}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(usage.usageDate), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell>{usage.remainingStock?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell>${usage.totalCost?.toFixed(2) || "0.00"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procurement Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Procurement Schedules</CardTitle>
              <CardDescription>Automated recurring purchase orders (customer timing vs predictive)</CardDescription>
            </CardHeader>
            <CardContent>
              {!procurementSchedules || procurementSchedules.length === 0 ? (
                <Alert data-testid="alert-no-schedules">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No procurement schedules configured. Set up automated purchasing schedules to streamline operations.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Schedule Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Next Order</TableHead>
                        <TableHead>Total Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procurementSchedules.map((schedule) => (
                        <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                          <TableCell>{getMaterialName(schedule.materialId)}</TableCell>
                          <TableCell>{getSupplierName(schedule.supplierId)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{schedule.scheduleType}</Badge>
                          </TableCell>
                          <TableCell>{schedule.quantity.toFixed(2)}</TableCell>
                          <TableCell>${schedule.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={schedule.isActive === "active" ? "default" : "secondary"}>
                              {schedule.isActive}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(schedule.nextOrderDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{schedule.totalOrdersPlaced}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Purchase Recommendations</CardTitle>
              <CardDescription>Intelligent recommendations based on inventory levels, prices, and economic conditions</CardDescription>
            </CardHeader>
            <CardContent>
              {!recommendations || recommendations.length === 0 ? (
                <Alert data-testid="alert-no-recommendations">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No AI recommendations available. The system will analyze inventory and market conditions automatically.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} data-testid={`card-recommendation-${rec.id}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            {getMaterialName(rec.materialId)}
                          </CardTitle>
                          <CardDescription>
                            {rec.recommendationType.replace("_", " ")}
                          </CardDescription>
                        </div>
                        <Badge variant={getRecommendationPriorityVariant(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Suggested Quantity:</span>
                            <p className="font-semibold">{rec.suggestedQuantity.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Suggested Price:</span>
                            <p className="font-semibold">${rec.suggestedPrice?.toFixed(2) || "TBD"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost Savings:</span>
                            <p className="font-semibold">
                              ${rec.costSavings?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">AI Confidence:</span>
                            <p className="font-semibold">{(rec.aiConfidence * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Reasoning:</span>
                          <p className="mt-1">{rec.reasoning}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{rec.status}</Badge>
                          {rec.economicRegime && (
                            <span className="text-xs text-muted-foreground">
                              Regime: {rec.economicRegime}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
