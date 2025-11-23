import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { unsign } from 'cookie-signature';
import { storage } from './storage';

let wss: WebSocketServer | null = null;

// Store clients with their associated company IDs for tenant isolation
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
  companyId?: string;
  data?: any;
};

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WebSocket] Client attempting connection');
    
    // SERVER-SIDE AUTHENTICATION: Extract and validate user from session
    let authenticatedCompanyId: string | undefined;
    
    try {
      // Extract session cookie from upgrade request
      const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
      const sessionCookie = cookies['connect.sid']; // Default express-session cookie name
      
      if (!sessionCookie) {
        console.warn('[WebSocket] No session cookie found, closing connection');
        ws.close(1008, 'Authentication required');
        return;
      }
      
      // CRITICAL SECURITY: Verify signed cookie signature before trusting session ID
      // express-session signs cookies as: s:SESSION_ID.SIGNATURE
      if (!sessionCookie.startsWith('s:')) {
        console.warn('[WebSocket] Invalid session cookie format, closing connection');
        ws.close(1008, 'Invalid session cookie');
        return;
      }
      
      // Remove 's:' prefix and verify signature using SESSION_SECRET
      const signedValue = sessionCookie.slice(2);
      const sessionSecret = process.env.SESSION_SECRET;
      
      if (!sessionSecret) {
        console.error('[WebSocket] SESSION_SECRET not configured');
        ws.close(1011, 'Server configuration error');
        return;
      }
      
      // Unsign the cookie - returns false if signature is invalid
      const sessionId = unsign(signedValue, sessionSecret);
      
      if (sessionId === false) {
        console.warn('[WebSocket] Invalid session signature, closing connection');
        ws.close(1008, 'Invalid session signature');
        return;
      }
      
      // Get session from database to extract user info
      // Note: We need to query the sessions table directly since express-session stores session data there
      const sessionData = await storage.getSessionById(sessionId);
      
      if (!sessionData || !sessionData.passport?.user?.claims?.sub) {
        console.warn('[WebSocket] Invalid or expired session, closing connection');
        ws.close(1008, 'Invalid session');
        return;
      }
      
      // Get authenticated user and their company
      const userId = sessionData.passport.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.companyId) {
        console.warn('[WebSocket] User has no company, closing connection');
        ws.close(1008, 'User not associated with company');
        return;
      }
      
      authenticatedCompanyId = user.companyId;
      console.log(`[WebSocket] Client authenticated for company: ${authenticatedCompanyId}`);
      
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      ws.close(1011, 'Authentication error');
      return;
    }
    
    // Create authenticated client with SERVER-VALIDATED companyId
    const client: AuthenticatedClient = {
      socket: ws,
      companyId: authenticatedCompanyId,
    };
    clients.add(client);

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        console.log(`[WebSocket] Received message from company ${client.companyId}:`, parsed.type);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
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

  const payload = JSON.stringify(message);
  
  let sentCount = 0;
  let errorCount = 0;
  let filteredCount = 0;
  let unauthenticatedCount = 0;
  
  clients.forEach((client) => {
    // CRITICAL SECURITY: Skip unauthenticated clients entirely
    if (!client.companyId) {
      unauthenticatedCount++;
      return; // Never send company-scoped data to unauthenticated clients
    }
    
    // TENANT ISOLATION: Only send messages to clients in the same company
    if (message.companyId && message.companyId !== client.companyId) {
      filteredCount++;
      return; // Skip clients from other companies
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
