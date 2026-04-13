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

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'connection_established') {
            return;
          }

          if (message.type === 'database_update') {
            // Invalidate relevant queries based on entity type
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

            // Call custom message handler if provided
            if (onMessage) {
              onMessage(message);
            }
          } else if (message.type === 'regime_change') {
            // Invalidate all economic data queries
            queryClient.invalidateQueries({ queryKey: ['/api/economics/regime'] });
            queryClient.invalidateQueries({ queryKey: ['/api/economics/indicators'] });
            
            // Call custom message handler if provided
            if (onMessage) {
              onMessage(message);
            }
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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
