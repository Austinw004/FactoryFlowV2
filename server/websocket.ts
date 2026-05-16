import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { unsign } from 'cookie-signature';
import { storage } from './storage';
import { verifyToken } from './lib/jwtAuth';

let wss: WebSocketServer | null = null;

interface AuthenticatedClient {
  socket: WebSocket;
  companyId?: string;
}

const clients = new Set<AuthenticatedClient>();

export type BroadcastMessage = {
  type: 'database_update' | 'regime_change';
  entity: string;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  companyId: string;
  data?: any;
};

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WebSocket] Client attempting connection');

    let authenticatedCompanyId: string | undefined;

    try {
      // Dual-mode auth: JWT-bearer customers (signed in via /api/auth/login)
      // pass their access token as ?token=… in the WS URL — the browser
      // WebSocket API doesn't let you set Authorization headers, so the
      // query-string carry is the standard pattern. Replit-session users
      // still authenticate via connect.sid cookie. Without this dual path,
      // every JWT user's WS handshake closed with 1008 'Authentication
      // required' and the client reconnected in a ~1Hz loop forever —
      // visible to the customer as Dashboard's "CONNECTION: Offline /
      // Reconnecting..." badge.
      const url = new URL(req.url || '/', 'http://localhost');
      const queryToken = url.searchParams.get('token');

      if (queryToken) {
        let payload: ReturnType<typeof verifyToken>;
        try {
          payload = verifyToken(queryToken);
        } catch {
          console.warn('[WebSocket] Invalid JWT in query string, closing connection');
          ws.close(1008, 'Invalid token');
          return;
        }
        if (payload.type !== 'access') {
          console.warn('[WebSocket] Non-access JWT presented, closing connection');
          ws.close(1008, 'Invalid token type');
          return;
        }
        const user = await storage.getUser(payload.sub);
        if (!user?.companyId) {
          console.warn('[WebSocket] JWT user has no company, closing connection');
          ws.close(1008, 'User not associated with company');
          return;
        }
        authenticatedCompanyId = user.companyId;
        console.log(`[WebSocket] JWT client authenticated for company: ${authenticatedCompanyId}`);
      } else {
        // Cookie-based path (Replit session auth)
        const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
        const sessionCookie = cookies['connect.sid'];

        if (!sessionCookie) {
          console.warn('[WebSocket] No JWT and no session cookie, closing connection');
          ws.close(1008, 'Authentication required');
          return;
        }

        if (!sessionCookie.startsWith('s:')) {
          console.warn('[WebSocket] Invalid session cookie format, closing connection');
          ws.close(1008, 'Invalid session cookie');
          return;
        }

        const signedValue = sessionCookie.slice(2);
        const sessionSecret = process.env.SESSION_SECRET;

        if (!sessionSecret) {
          console.error('[WebSocket] SESSION_SECRET not configured');
          ws.close(1011, 'Server configuration error');
          return;
        }

        const sessionId = unsign(signedValue, sessionSecret);

        if (sessionId === false) {
          console.warn('[WebSocket] Invalid session signature, closing connection');
          ws.close(1008, 'Invalid session signature');
          return;
        }

        const sessionData = await storage.getSessionById(sessionId);

        if (!sessionData || !sessionData.passport?.user?.claims?.sub) {
          console.warn('[WebSocket] Invalid or expired session, closing connection');
          ws.close(1008, 'Invalid session');
          return;
        }

        const userId = sessionData.passport.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !user.companyId) {
          console.warn('[WebSocket] User has no company, closing connection');
          ws.close(1008, 'User not associated with company');
          return;
        }

        authenticatedCompanyId = user.companyId;
        console.log(`[WebSocket] Session client authenticated for company: ${authenticatedCompanyId}`);
      }
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      ws.close(1011, 'Authentication error');
      return;
    }
    
    const client: AuthenticatedClient = {
      socket: ws,
      companyId: authenticatedCompanyId,
    };
    clients.add(client);

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        // Respond to client heartbeat pings so the client knows the connection is alive
        if (parsed?.type === 'ping') {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
          return;
        }
      } catch (error) {
        // Silently ignore malformed client frames; they cannot affect server state
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(client);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      clients.delete(client);
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

  if (!message.companyId) {
    console.error(`[WebSocket] BLOCKED: broadcastUpdate called without companyId for entity=${message.entity}. This is a tenant isolation violation.`);
    return;
  }

  const payload = JSON.stringify(message);
  
  let sentCount = 0;
  let errorCount = 0;
  let filteredCount = 0;
  let unauthenticatedCount = 0;
  
  clients.forEach((client) => {
    if (!client.companyId) {
      unauthenticatedCount++;
      return;
    }
    
    if (message.companyId !== client.companyId) {
      filteredCount++;
      return;
    }
    
    if (client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(payload);
        sentCount++;
      } catch (error) {
        console.error('[WebSocket] Failed to send to client:', error);
        errorCount++;
      }
    }
  });

  if (sentCount > 0) {
    console.log(`[WebSocket] Broadcast ${message.type}:${message.entity}:${message.action} to ${sentCount} authenticated clients (filtered ${filteredCount}, skipped ${unauthenticatedCount} unauthenticated)`);
  }
}

export function closeWebSocket() {
  if (wss) {
    clients.forEach((client) => {
      client.socket.close();
    });
    clients.clear();
    wss.close();
    console.log('[WebSocket] Server closed');
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
