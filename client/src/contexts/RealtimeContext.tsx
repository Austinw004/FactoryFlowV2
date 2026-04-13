import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────
export interface RealtimeMessage {
  type: string;
  entity?: string;
  action?: string;
  timestamp: string;
  companyId?: string;
  data?: any;
  message?: string;
}

type MessageHandler = (message: RealtimeMessage) => void;

interface RealtimeContextValue {
  isConnected: boolean;
  lastMessage: RealtimeMessage | null;
  messageCount: number;
  reconnect: () => void;
  subscribe: (handler: MessageHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  lastMessage: null,
  messageCount: 0,
  reconnect: () => {},
  subscribe: () => () => {},
});

// ── Entity → query key mapping ─────────────────────────────────────────────
const ENTITY_QUERY_MAP: Record<string, string[][]> = {
  material: [["/api/materials"]],
  materials: [["/api/materials"]],
  supplier: [["/api/suppliers"]],
  suppliers: [["/api/suppliers"]],
  sku: [["/api/skus"]],
  skus: [["/api/skus"]],
  machinery: [["/api/machinery"]],
  employee: [["/api/employees"]],
  employees: [["/api/employees"]],
  purchase_order: [["/api/purchase-orders"]],
  inventory: [["/api/materials"], ["/api/inventory"]],
  production_run: [["/api/production/kpis"], ["/api/production-runs"]],
  production_kpi: [["/api/production/kpis"]],
  sensor_reading: [["/api/sensors"], ["/api/maintenance-alerts"]],
  maintenance_alert: [["/api/maintenance-alerts"]],
  commodity_price: [["/api/commodities/prices"]],
  demand_prediction: [["/api/demand-predictions"]],
  allocation: [["/api/allocations"]],
  compliance_document: [["/api/compliance/documents"]],
  work_order: [["/api/work-orders"]],
  quality_record: [["/api/quality"]],
  economic_indicators: [["/api/economics/regime"]],
  external_economic_data: [["/api/economics/regime"]],
  forecast: [["/api/forecasts"], ["/api/multi-horizon-forecasts"]],
  audit_log: [["/api/audit-logs"]],
};

// ── Friendly labels for toast notifications ────────────────────────────────
const ENTITY_LABELS: Record<string, string> = {
  material: "Material",
  supplier: "Supplier",
  sku: "SKU",
  machinery: "Equipment",
  employee: "Employee",
  purchase_order: "Purchase Order",
  inventory: "Inventory",
  production_run: "Production Run",
  production_kpi: "Production KPI",
  sensor_reading: "Sensor Reading",
  maintenance_alert: "Maintenance Alert",
  commodity_price: "Commodity Price",
  demand_prediction: "Demand Prediction",
  allocation: "Allocation",
  compliance_document: "Compliance Document",
  work_order: "Work Order",
  quality_record: "Quality Record",
  forecast: "Forecast",
};

const ACTION_LABELS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
};

// ── Provider ───────────────────────────────────────────────────────────────
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Set<MessageHandler>>(new Set());
  const { toast } = useToast();
  const maxReconnectAttempts = 10;

  const subscribe = useCallback((handler: MessageHandler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log("[Realtime] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          setLastMessage(message);
          setMessageCount((c) => c + 1);

          if (message.type === "connection_established") {
            return;
          }

          // Invalidate relevant queries
          if (message.type === "database_update" && message.entity) {
            const queryKeys = ENTITY_QUERY_MAP[message.entity] || [];
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });

            // Show toast for important updates (not high-frequency ones like sensors)
            const silentEntities = ["sensor_reading", "production_kpi", "economic_indicators", "external_economic_data"];
            if (!silentEntities.includes(message.entity)) {
              const entityLabel = ENTITY_LABELS[message.entity] || message.entity;
              const actionLabel = ACTION_LABELS[message.action || ""] || message.action || "changed";
              toast({
                title: `${entityLabel} ${actionLabel}`,
                description: message.data?.name
                  ? `"${message.data.name}" was ${actionLabel}`
                  : `A ${entityLabel.toLowerCase()} record was ${actionLabel}`,
                duration: 3000,
              });
            }
          }

          if (message.type === "regime_change") {
            queryClient.invalidateQueries({ queryKey: ["/api/economics/regime"] });
            queryClient.invalidateQueries({ queryKey: ["/api/economics/indicators"] });
            toast({
              title: "Economic Regime Change",
              description: `Market regime shifted: ${message.data?.from} → ${message.data?.to}`,
              duration: 5000,
            });
          }

          // Notify subscribers
          subscribersRef.current.forEach((handler) => handler(message));
        } catch (error) {
          console.error("[Realtime] Parse error:", error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("[Realtime] Connection failed:", error);
      setIsConnected(false);
    }
  }, [toast]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Reconnect on visibility change
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && !wsRef.current) {
        reconnect();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [reconnect]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastMessage, messageCount, reconnect, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────
export function useRealtime() {
  return useContext(RealtimeContext);
}

export function useRealtimeSubscription(handler: MessageHandler) {
  const { subscribe } = useRealtime();
  useEffect(() => {
    return subscribe(handler);
  }, [handler, subscribe]);
}
