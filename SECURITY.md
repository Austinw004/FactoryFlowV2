# Security & Compliance Documentation

## Overview

This Manufacturing Allocation Intelligence SaaS platform implements **SOC2-lite security controls** to ensure data protection, integrity, and compliance with industry standards. Our security architecture follows defense-in-depth principles with multiple layers of protection.

---

## Security Features

### 1. **Role-Based Access Control (RBAC)**

**What it does:** Controls who can access and modify different parts of the system.

**Features:**
- 27 granular permissions across all functional areas
- 5 predefined roles: Admin, Executive, Procurement Manager, Production Planner, Analyst
- Custom role creation with flexible permission assignment
- Company-scoped access control (multi-tenant isolation)

**How to use:**
- Navigate to Settings → Users & Roles
- Assign roles to users
- Create custom roles with specific permissions
- View role assignments in the user management interface

**Technical details:**
- Implemented in `server/lib/rbac.ts`
- Middleware enforcement on all protected routes
- Permission checks at both route and UI level

---

### 2. **Comprehensive Audit Logging**

**What it does:** Tracks all user actions for compliance and security monitoring.

**What's logged:**
- All create, update, delete operations
- User authentication events
- Data export and import operations
- Role assignments and permission changes
- System configuration changes

**Log details include:**
- User ID and company ID
- Timestamp
- Action type (create/update/delete/etc.)
- Entity type and ID
- Changes made (before/after snapshots)
- IP address and user agent

**How to access:**
- Available via API: `GET /api/audit-logs`
- Filtered by company, user, date range, entity type
- Exportable for compliance reporting

**Technical details:**
- Implemented in `server/lib/auditLogger.ts`
- Automatic logging middleware
- Database persistence for long-term retention

---

### 3. **Data Encryption**

**What it does:** Protects sensitive data at rest using industry-standard encryption.

**Encryption details:**
- **Algorithm:** AES-256-CBC
- **Key management:** Environment-based encryption keys
- **Scope:** API keys, tokens, secrets, sensitive configuration

**Usage:**
```typescript
import { encryptionService } from './lib/securityHardening';

// Encrypt sensitive data
const encrypted = encryptionService.encrypt(apiKey);

// Decrypt when needed
const decrypted = encryptionService.decrypt(encrypted);

// Hash for verification
const hashed = encryptionService.hash(password);
```

**Best practices:**
- Never log encrypted keys
- Rotate encryption keys periodically
- Store encryption keys in secure environment variables

---

### 4. **Rate Limiting**

**What it does:** Prevents abuse by limiting request frequency.

**Default limits:**
- **Global API:** 100 requests/minute per IP
- **Authentication:** 5 requests/minute (prevents brute force)
- **Read-only endpoints:** 300 requests/minute
- **Sensitive operations:** 3 requests/minute

**Response headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: When the limit resets

**429 Too Many Requests response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

**Technical details:**
- In-memory rate limiting with automatic cleanup
- Configurable per-endpoint limits
- Distributed rate limiting support for scaling

---

### 5. **Input Sanitization & Validation**

**What it does:** Prevents XSS, injection attacks, and malformed input.

**Protection against:**
- Cross-Site Scripting (XSS)
- SQL Injection attempts
- HTML/JavaScript injection
- Path traversal attacks
- Malformed emails and URLs

**Sanitization process:**
1. Remove dangerous characters (`<`, `>`, `javascript:`, etc.)
2. Strip event handlers (`onclick`, `onerror`, etc.)
3. Validate data types and formats
4. Apply Zod schema validation
5. Log suspicious patterns

**SQL Injection Detection:**
- Pattern-based detection for SQL keywords
- Automatic blocking of suspicious queries
- Security event logging for monitoring

---

### 6. **Security Headers**

**What it does:** Configures browser security policies to prevent attacks.

**Headers applied:**
- **X-Frame-Options:** `DENY` - Prevents clickjacking
- **X-Content-Type-Options:** `nosniff` - Prevents MIME sniffing
- **X-XSS-Protection:** `1; mode=block` - Enables XSS protection
- **Strict-Transport-Security:** Forces HTTPS
- **Content-Security-Policy:** Restricts resource loading
- **Referrer-Policy:** Controls referrer information leakage
- **Permissions-Policy:** Disables unnecessary browser features

**CSP Policy:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' wss: https:;
```

---

### 7. **Session Security**

**What it does:** Secures user sessions and prevents session hijacking.

**Features:**
- **HttpOnly cookies:** Prevents JavaScript access to session cookies
- **Secure flag:** Enforces HTTPS transmission
- **SameSite:** `strict` - CSRF protection
- **Session expiration:** 24 hours with rolling renewal
- **Automatic logout:** On inactivity

**Configuration:**
```typescript
{
  secret: process.env.SESSION_SECRET,
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}
```

---

### 8. **Security Monitoring & Alerts**

**What it does:** Tracks security events and anomalies in real-time.

**Monitored events:**
- Rate limit violations
- SQL injection attempts
- XSS attack attempts
- Authentication failures
- Suspicious activity patterns

**Event severity levels:**
- **Low:** Minor violations, single occurrences
- **Medium:** Repeated violations, potential probing
- **High:** Clear attack patterns, multiple failures
- **Critical:** Active attacks, system compromise attempts

**Access monitoring:**
- **API:** `GET /api/security/events?minutes=60`
- **Summary:** `GET /api/security/summary`

**Response format:**
```json
{
  "totalEvents": 150,
  "last24Hours": 42,
  "byType": {
    "rateLimits": 30,
    "sqlInjections": 5,
    "xssAttempts": 2,
    "authFailures": 3,
    "suspicious": 2
  },
  "bySeverity": {
    "low": 35,
    "medium": 5,
    "high": 2,
    "critical": 0
  }
}
```

---

## Data Privacy & Compliance

### Multi-Tenant Data Isolation

- Every data record is scoped to a `companyId`
- Database queries automatically filter by company
- Cross-company access is prevented at the database level
- User permissions are company-specific

### Data Export & Deletion

**Data portability:**
- Export all company data in JSON, CSV, or Excel formats
- Includes SKUs, materials, suppliers, forecasts, allocations
- Self-service export via Settings → Data Management

**Data deletion:**
- Cascade deletion of company data
- Audit logs preserved for compliance
- User can request full data deletion

### GDPR Compliance

- **Right to access:** Users can export all their data
- **Right to deletion:** Company admins can delete all company data
- **Right to rectification:** Users can update their information
- **Consent management:** Clear consent for data processing
- **Data minimization:** Only collect necessary data

---

## SOC2 Compliance Checklist

### Organizational Security

- ✅ Role-Based Access Control (RBAC)
- ✅ Least privilege access enforcement
- ✅ User authentication and authorization
- ✅ Multi-factor authentication support (via Replit Auth)

### Logical Security

- ✅ Encryption at rest (AES-256-CBC)
- ✅ Encryption in transit (HTTPS/TLS)
- ✅ Session security and timeout
- ✅ Password security (via OAuth provider)

### Change Management

- ✅ Comprehensive audit logging
- ✅ Version control (Git)
- ✅ Change tracking and attribution
- ✅ Rollback capabilities

### Risk Management

- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Security monitoring and alerts

### Operations

- ✅ Automated testing
- ✅ Error logging and monitoring
- ✅ Performance monitoring
- ✅ Disaster recovery (database backups)

### System Monitoring

- ✅ Real-time security event tracking
- ✅ Audit log retention
- ✅ Performance metrics
- ✅ Error tracking

---

## Security Best Practices

### For Developers

1. **Never commit secrets to version control**
   - Use environment variables for all sensitive data
   - Never hard-code API keys, passwords, or tokens

2. **Always validate input**
   - Use Zod schemas for request validation
   - Sanitize user input before processing
   - Never trust client-side data

3. **Follow principle of least privilege**
   - Grant minimum necessary permissions
   - Check permissions at both route and function level
   - Never bypass RBAC checks

4. **Log security-relevant events**
   - Use audit logger for all mutations
   - Log authentication failures
   - Record permission denials

5. **Keep dependencies updated**
   - Regularly update npm packages
   - Monitor security advisories
   - Address vulnerabilities promptly

### For System Administrators

1. **Regular security audits**
   - Review audit logs weekly
   - Monitor security events daily
   - Investigate anomalies promptly

2. **Access management**
   - Review user roles quarterly
   - Remove inactive users
   - Audit permission assignments

3. **Incident response**
   - Have a security incident response plan
   - Know how to access audit logs
   - Document security incidents

4. **Backup and recovery**
   - Regular database backups
   - Test restore procedures
   - Maintain disaster recovery plan

### For End Users

1. **Strong authentication**
   - Use strong, unique passwords
   - Enable MFA if available
   - Never share credentials

2. **Data handling**
   - Only export data when necessary
   - Protect exported data files
   - Delete exports after use

3. **Report suspicious activity**
   - Report unusual system behavior
   - Report unauthorized access attempts
   - Contact security team for concerns

---

## API Security Reference

### Protected Routes

All routes require authentication unless marked `[PUBLIC]`:

```
POST   /api/auth/*               [Rate limited: 5/min]
GET    /api/*                    [Authenticated + RBAC]
POST   /api/*                    [Authenticated + RBAC + Audit]
PATCH  /api/*                    [Authenticated + RBAC + Audit]
DELETE /api/*                    [Authenticated + RBAC + Audit]
```

### Security Headers on All Responses

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: [policy]
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
```

---

## Incident Response

### If you detect suspicious activity:

1. **Immediate actions:**
   - Document the event (screenshot, logs)
   - Note the time, user, and affected resources
   - Do not delete evidence

2. **Escalation:**
   - Contact system administrator
   - Provide audit log exports
   - Share security event summaries

3. **Investigation:**
   - Review audit logs for the time period
   - Check security monitoring events
   - Identify affected data and users

4. **Remediation:**
   - Revoke compromised access
   - Reset credentials if needed
   - Apply additional security measures

5. **Post-incident:**
   - Document findings
   - Update security procedures
   - Communicate to affected users if needed

---

## Security Contacts

For security issues or questions:

- **Security incidents:** Check security monitoring dashboard
- **Audit log access:** API endpoint `/api/audit-logs`
- **Security events:** API endpoint `/api/security/summary`

---

## Version History

- **v1.0** (Nov 2024) - Initial SOC2-lite security implementation
  - RBAC with 27 permissions
  - Comprehensive audit logging
  - AES-256 encryption
  - Rate limiting
  - Input sanitization
  - Security headers
  - Security monitoring

---

**Last Updated:** November 24, 2024
**Review Frequency:** Quarterly
**Next Review:** February 24, 2025
