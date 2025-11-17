import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export type BroadcastMessage = {
  type: 'database_update';
  entity: string;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  companyId?: string;
  data?: any;
};

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected');
    clients.add(ws);

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        console.log('[WebSocket] Received message:', parsed);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      clients.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      message: 'Connected to real-time update stream',
    }));
  });

  console.log('[WebSocket] Server initialized on path /ws');
  
  return wss;
}

export function broadcastUpdate(message: BroadcastMessage) {
  if (!wss || clients.size === 0) {
    return;
  }

  const payload = JSON.stringify(message);
  
  let sentCount = 0;
  let errorCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        sentCount++;
      } catch (error) {
        console.error('[WebSocket] Failed to send to client:', error);
        errorCount++;
      }
    }
  });

  if (sentCount > 0) {
    console.log(`[WebSocket] Broadcast ${message.type}:${message.entity}:${message.action} to ${sentCount} clients`);
  }
}

export function closeWebSocket() {
  if (wss) {
    clients.forEach((client) => {
      client.close();
    });
    clients.clear();
    wss.close();
    console.log('[WebSocket] Server closed');
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
