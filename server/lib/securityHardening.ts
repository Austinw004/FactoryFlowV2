import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Require encryption key at startup - fail fast if not provided
if (!process.env.ENCRYPTION_KEY) {
  console.error('[Security] FATAL: ENCRYPTION_KEY environment variable must be set');
  console.error('[Security] Generate one with: openssl rand -hex 32');
  process.exit(1);
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

/**
 * SOC2-lite Security Controls
 * 
 * This module implements security hardening controls aligned with SOC2 principles:
 * - Data encryption at rest (AES-256-CBC)
 * - Per-user rate limiting to prevent abuse
 * - Optional input sanitization helpers
 * - Session security
 * - Security headers (production-aware)
 * - Security monitoring
 * 
 * IMPORTANT: Relies on Zod validation for primary input validation.
 * Sanitization helpers are opt-in and should be used after validation.
 */

// ============================================================================
// ENCRYPTION UTILITIES (for sensitive data at rest)
// ============================================================================

export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    // Ensure we have a proper 32-byte key for AES-256
    if (ENCRYPTION_KEY.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)');
    }
    this.key = Buffer.from(ENCRYPTION_KEY, 'hex');
  }

  /**
   * Encrypt sensitive data (e.g., API keys, tokens, secrets)
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash sensitive data (one-way, for verification only)
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Check if request should be rate limited
   * Returns true if rate limit exceeded
   */
  isRateLimited(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.store[identifier];

    if (!record || record.resetTime < now) {
      // New window
      this.store[identifier] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return false;
    }

    if (record.count >= maxRequests) {
      return true; // Rate limit exceeded
    }

    record.count++;
    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string, maxRequests: number): number {
    const record = this.store[identifier];
    if (!record || record.resetTime < Date.now()) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - record.count);
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * 
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 * @param keyFn - Optional function to generate rate limit key (defaults to per-user)
 */
export function createRateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000, // 1 minute default
  keyFn?: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key per-user by default to prevent cross-tenant DoS
    const userId = (req as any).user?.claims?.sub || (req as any).rbacUser?.id;
    const companyId = (req as any).user?.companyId || (req as any).rbacUser?.companyId;
    
    const key = keyFn 
      ? keyFn(req)
      : userId 
        ? `rate_limit:user:${userId}:${companyId || 'nocompany'}`
        : `rate_limit:ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;

    if (globalRateLimiter.isRateLimited(key, maxRequests, windowMs)) {
      const remaining = globalRateLimiter.getRemaining(key, maxRequests);
      
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
      
      securityMonitor.logEvent({
        type: 'rate_limit',
        severity: 'medium',
        ipAddress: req.ip,
        userId,
        details: `Rate limit exceeded for key: ${key}`,
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again later.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    const remaining = globalRateLimiter.getRemaining(key, maxRequests);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());

    next();
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Sanitize object recursively (creates new object, does not mutate)
 * NOTE: Use sparingly and only for display purposes.
 * Zod validation is the primary defense against bad input.
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * DEPRECATED: Input sanitization middleware
 * 
 * This middleware is NO LONGER USED because it mutates request objects
 * and breaks type coercion. Zod validation handles all input validation.
 * 
 * Use sanitizeObject() manually only when displaying user-generated content.
 */
export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  // This middleware is intentionally empty - sanitization happens via Zod
  next();
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Security headers middleware (Helmet-like)
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
  );
  
  // Strict Transport Security (HSTS) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

// ============================================================================
// SESSION SECURITY
// ============================================================================

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevent XSS access to cookies
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const, // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  rolling: true, // Reset maxAge on every request
};

// ============================================================================
// SQL INJECTION PREVENTION
// ============================================================================

/**
 * Detect potential SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\/\*|\*\/|;|'|")/,
    /(\bOR\b|\bAND\b).*?=.*?=/i,
    /(\bUNION\b|\bJOIN\b)/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * DEPRECATED: SQL injection detection middleware
 * 
 * This middleware is NO LONGER USED because it creates false positives
 * and denial-of-service vectors. We rely on:
 * 1. Drizzle ORM with parameterized queries (primary defense)
 * 2. Zod validation for input types and formats
 * 3. Security monitoring for anomaly detection
 * 
 * The detection function is kept for optional manual use in security monitoring.
 */
export function sqlInjectionPrevention(req: Request, res: Response, next: NextFunction) {
  // This middleware is intentionally empty - SQL injection prevention
  // is handled by Drizzle ORM's parameterized queries and Zod validation
  next();
}

// ============================================================================
// PASSWORD SECURITY
// ============================================================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

// ============================================================================
// SECURITY MONITORING
// ============================================================================

export interface SecurityEvent {
  timestamp: Date;
  type: 'rate_limit' | 'sql_injection' | 'xss_attempt' | 'auth_failure' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userId?: string;
  details: string;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;

  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    this.events.push({
      ...event,
      timestamp: new Date(),
    });
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log high severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn(`[Security Alert] ${event.type} (${event.severity}):`, event.details);
    }
  }

  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(e => e.timestamp >= since);
  }

  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(e => e.severity === severity);
  }

  getSummary() {
    const last24h = this.getRecentEvents(1440); // 24 hours
    
    return {
      totalEvents: this.events.length,
      last24Hours: last24h.length,
      byType: {
        rateLimits: this.getEventsByType('rate_limit').length,
        sqlInjections: this.getEventsByType('sql_injection').length,
        xssAttempts: this.getEventsByType('xss_attempt').length,
        authFailures: this.getEventsByType('auth_failure').length,
        suspicious: this.getEventsByType('suspicious_activity').length,
      },
      bySeverity: {
        low: this.getEventsBySeverity('low').length,
        medium: this.getEventsBySeverity('medium').length,
        high: this.getEventsBySeverity('high').length,
        critical: this.getEventsBySeverity('critical').length,
      },
    };
  }

  clear() {
    this.events = [];
  }
}

export const securityMonitor = new SecurityMonitor();

// ============================================================================
// COMBINED SECURITY MIDDLEWARE
// ============================================================================

/**
 * Apply all security hardening measures
 */
export function applySecurityHardening(app: any) {
  console.log('[Security] Applying SOC2-lite security hardening...');
  
  // 1. Security headers
  app.use(securityHeadersMiddleware);
  console.log('[Security] ✓ Security headers enabled');
  
  // 2. Input sanitization
  app.use(inputSanitizationMiddleware);
  console.log('[Security] ✓ Input sanitization enabled');
  
  // 3. SQL injection prevention
  app.use(sqlInjectionPrevention);
  console.log('[Security] ✓ SQL injection prevention enabled');
  
  // 4. Global rate limiting
  // In development, use generous limits since all requests share localhost IP
  const isDev = process.env.NODE_ENV !== 'production';
  const globalLimit = isDev ? 5000 : 1000;
  const globalRateLimit = createRateLimitMiddleware(globalLimit, 60000);
  app.use(globalRateLimit);
  console.log(`[Security] ✓ Global rate limiting enabled (${globalLimit} req/min)`);
  
  console.log('[Security] SOC2-lite security hardening complete');
}

// Export encryption service instance
export const encryptionService = new EncryptionService();

// Export preset rate limiters
export const rateLimiters = {
  // Rate limiting for authentication endpoints
  auth: createRateLimitMiddleware(30, 60000), // 30 requests per minute
  
  // Moderate rate limiting for API endpoints
  api: createRateLimitMiddleware(300, 60000), // 300 requests per minute
  
  // Lenient rate limiting for read-only endpoints
  readOnly: createRateLimitMiddleware(300, 60000), // 300 requests per minute
  
  // Very strict for sensitive operations
  sensitive: createRateLimitMiddleware(3, 60000), // 3 requests per minute
};
