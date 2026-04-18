import { useEffect, useRef, useCallback, useState } from 'react';
import { queryClient } from '@/lib/queryClient';

export type WebSocketMessage = {
  type: string;
  entity?: string;
  action?: string;
  timestamp: string;
  companyId?: string;
  data?: any;
  message?: string;
};

type MessageHandler = (message: WebSocketMessage) => void;

const DEV = import.meta.env.DEV;

const MAX_RECONNECT_ATTEMPTS = 8;
const CONNECT_TIMEOUT_MS = 10000;
const MAX_RECONNECT_DELAY_MS = 16000;
const HEARTBEAT_INTERVAL_MS = 25000;
const HEARTBEAT_TIMEOUT_MS = 10000;

// Map server entity names to client query keys to invalidate.
// Keep in sync with server/websocket.ts broadcast entities.
const INVALIDATION_MAP: Record<string, string[]> = {
  economic_indicators: ['/api/economics/regime'],
  external_economic_data: ['/api/economics/regime'],
  sensor_reading: ['/api/sensors', '/api/maintenance-alerts', '/api/predictive-maintenance/sensors', '/api/predictive-maintenance/readings'],
  production_kpi: ['/api/production/kpis'],
  commodity_price: ['/api/commodities/prices'],
  purchase_order: ['/api/purchase-orders', '/api/auto-purchase-recommendations'],
  work_order: ['/api/work-orders', '/api/purchase-orders'],
  inventory: ['/api/materials', '/api/skus', '/api/inventory'],
  material: ['/api/materials'],
  sku: ['/api/skus'],
  supplier: ['/api/suppliers'],
  employee: ['/api/employees'],
  machinery: ['/api/machinery'],
  audit_log: ['/api/audit/logs', '/api/audit/summary'],
  smart_insight_alert: ['/api/smart-insights/alerts', '/api/alerts/summary'],
  maintenance_alert: ['/api/maintenance-alerts', '/api/predictive-maintenance/alerts'],
  quality_record: ['/api/quality-records'],
  automation_run: ['/api/automations/runs', '/api/automations'],
};

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const onMessageRef = useRef<MessageHandler | undefined>(onMessage);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  // Keep latest handler without re-running connect on every render
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch {
        // ignore send failures; onclose will fire
        return;
      }

      // Wait for any inbound frame; if none, force a reconnect.
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (wsRef.current) {
          try { wsRef.current.close(); } catch { /* noop */ }
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }, [clearHeartbeat]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;
    const wsUrl = protocol + "//" + host + (port ? ":" + port : "") + "/ws";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      connectTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(connectTimeoutRef.current);
        if (DEV) console.log('[WebSocket] Connected');
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        // Any inbound frame counts as life — clear heartbeat-deadline timer
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        setLastMessageAt(Date.now());

        let message: WebSocketMessage;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
          return;
        }

        if (message.type === 'connection_established') {
          if (DEV && message.message) console.log('[WebSocket]', message.message);
          return;
        }

        if (message.type === 'pong') {
          return;
        }

        if (message.type === 'database_update' && message.entity) {
          const keys = INVALIDATION_MAP[message.entity];
          if (keys) {
            keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
          }
          if (onMessageRef.current) onMessageRef.current(message);
          return;
        }

        if (message.type === 'regime_change') {
          queryClient.invalidateQueries({ queryKey: ['/api/economics/regime'] });
          queryClient.invalidateQueries({ queryKey: ['/api/economics/indicators'] });
          if (onMessageRef.current) onMessageRef.current(message);
          return;
        }

        // Forward unknown message types in case caller wants them
        if (onMessageRef.current) onMessageRef.current(message);
      };

      ws.onerror = () => {
        // Disconnection is surfaced via onclose
      };

      ws.onclose = () => {
        clearTimeout(connectTimeoutRef.current);
        clearHeartbeat();
        wsRef.current = null;
        setIsConnected(false);

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY_MS,
          );
          // Add jitter to avoid stampede on mass reconnect
          const jittered = delay + Math.floor(Math.random() * 500);
          if (DEV) console.log(`[WebSocket] Disconnected. Reconnecting in ${jittered}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, jittered);
        } else {
          if (DEV) console.log('[WebSocket] Max reconnect attempts reached. Real-time updates paused.');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [clearHeartbeat, startHeartbeat]);

  useEffect(() => {
    connect();

    // Reconnect when the tab regains focus / network comes back
    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      connect();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(reconnectTimeoutRef.current);
      clearTimeout(connectTimeoutRef.current);
      clearHeartbeat();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
    };
  }, [connect, clearHeartbeat]);

  return {
    isConnected,
    lastMessageAt,
    reconnect: () => {
      reconnectAttemptsRef.current = 0;
      connect();
    },
  };
}
