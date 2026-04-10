import { useEffect, useRef, useCallback } from 'react';
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

const MAX_RECONNECT_ATTEMPTS = 5;
const CONNECT_TIMEOUT_MS = 10000;
const MAX_RECONNECT_DELAY_MS = 16000;

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;
    const wsUrl = protocol + "//" + host + (port ? ":" + port : "") + "/ws";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout — close and trigger onclose/reconnect if server doesn't respond
      connectTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(connectTimeoutRef.current);
        console.log('[WebSocket] Connected to real-time updates (server-side authenticated)');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'connection_established') {
            console.log('[WebSocket]', message.message);
            return;
          }

          if (message.type === 'database_update') {
            console.log(`[WebSocket] Received update: ${message.entity}:${message.action}`);
            
            if (message.entity === 'economic_indicators' || message.entity === 'external_economic_data') {
              queryClient.invalidateQueries({ queryKey: ['/api/economics/regime'] });
            } else if (message.entity === 'sensor_reading') {
              queryClient.invalidateQueries({ queryKey: ['/api/sensors'] });
              queryClient.invalidateQueries({ queryKey: ['/api/maintenance-alerts'] });
            } else if (message.entity === 'production_kpi') {
              queryClient.invalidateQueries({ queryKey: ['/api/production/kpis'] });
            } else if (message.entity === 'commodity_price') {
              queryClient.invalidateQueries({ queryKey: ['/api/commodities/prices'] });
            } else if (message.entity === 'purchase_order') {
              queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
            }

            if (onMessage) {
              onMessage(message);
            }
          } else if (message.type === 'regime_change') {
            console.log(`[WebSocket] REGIME CHANGE: ${message.data?.from} -> ${message.data?.to} (FDR: ${message.data?.fdr?.toFixed(2)})`);
            
            queryClient.invalidateQueries({ queryKey: ['/api/economics/regime'] });
            queryClient.invalidateQueries({ queryKey: ['/api/economics/indicators'] });
            
            if (onMessage) {
              onMessage(message);
            }
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = () => {
        // Suppress per-error noise; disconnection is handled in onclose
      };

      ws.onclose = () => {
        clearTimeout(connectTimeoutRef.current);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY_MS
          );
          console.log(`[WebSocket] Disconnected. Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          // Max retries reached — stop silently to avoid console spam
          console.log('[WebSocket] Max reconnect attempts reached. Real-time updates paused.');
        }
      };
    } catch (error) {
      // Malformed URL or environment where WebSocket is unavailable
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearTimeout(connectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
  };
}
