# Security Audit Report
**Date:** 25 March 2026  
**Application:** Todo App  
**Auditor:** GitHub Copilot Security Review  
**Scope:** Full-stack application security review (Backend, Frontend, Infrastructure)

---

## Executive Summary

This security audit examines the todo application for common web security vulnerabilities including XSS, injection attacks, authentication issues, configuration weaknesses, and deployment security. The application demonstrates **good baseline security practices** with proper use of prepared statements, React's built-in XSS protection, and security middleware. However, several **critical and high-severity issues** require immediate attention, particularly around rate limiting, HTTPS enforcement, and input validation.

### Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Requires Immediate Action |
| 🟠 High | 2 | Requires Prompt Action |
| 🟡 Medium | 4 | Should Be Addressed |
| 🟢 Low | 2 | Consider for Future |
| ✅ Pass | 9 | Good Security Practices |

### Overall Security Posture: **MODERATE RISK**

---

## Table of Contents

1. [Critical Findings](#critical-findings)
2. [High Severity Findings](#high-severity-findings)
3. [Medium Severity Findings](#medium-severity-findings)
4. [Low Severity Findings](#low-severity-findings)
5. [Positive Security Findings](#positive-security-findings)
6. [Detailed Analysis by Category](#detailed-analysis-by-category)
7. [Remediation Roadmap](#remediation-roadmap)
8. [Code Examples & Fixes](#code-examples--fixes)
9. [Compliance & Standards](#compliance--standards)

---

## Critical Findings

### 🔴 CRIT-001: No Rate Limiting or Request Throttling

**Severity:** CRITICAL  
**CVSS Score:** 7.5 (High)  
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Description:**
The API endpoints have no rate limiting implemented, making the application vulnerable to:
- Denial of Service (DoS) attacks
- Brute force attacks (if authentication is added later)
- Resource exhaustion
- Spam/abuse
- API scraping

**Affected Components:**
- All API endpoints in [backend/src/routes/todos.ts](backend/src/routes/todos.ts)
- Nginx reverse proxy configuration

**Attack Scenario:**
```bash
# Attacker can flood the server with requests
while true; do
  curl -X POST http://localhost/api/todos \
    -H "Content-Type: application/json" \
    -d '{"text":"spam"}' &
done
# This could create thousands of todos per second, exhausting:
# - Database connections
# - Memory
# - Disk space
# - CPU resources
```

**Impact:**
- Application unavailability
- Degraded performance for legitimate users
- Increased infrastructure costs
- Potential data corruption from concurrent writes

**Remediation:**

**Option 1: Application-Level Rate Limiting (Recommended)**

Install `@fastify/rate-limit`:
```bash
pnpm add @fastify/rate-limit --filter backend
```

Update [backend/src/app.ts](backend/src/app.ts):
```typescript
import rateLimit from '@fastify/rate-limit';

export async function buildApp(): Promise<FastifyInstance> {
  runMigrations();
  const app = Fastify({ logger: true });

  await app.register(helmetPlugin);
  
  // Add rate limiting
  await app.register(rateLimit, {
    max: 100,                    // Max 100 requests
    timeWindow: '15 minutes',    // Per 15-minute window
    cache: 10000,                // Cache up to 10k IPs
    allowList: ['127.0.0.1'],    // Whitelist localhost for health checks
    redis: undefined,            // Use memory (upgrade to Redis for production)
    skipOnError: true,           // Don't rate limit if Redis fails
    ban: 5,                      // Ban after 5 violations (optional)
    errorResponseBuilder: (request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${context.after}`,
      }
    })
  });

  // More restrictive limits for write operations
  await app.register(rateLimit, {
    max: 20,
    timeWindow: '1 minute',
  }, {
    prefix: '/api/todos',
    method: ['POST', 'PATCH', 'DELETE']
  });

  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });
  
  // ... rest of the configuration
}
```

**Option 2: Nginx-Level Rate Limiting**

Update [frontend/nginx.conf](frontend/nginx.conf):
```nginx
# Add at the top of the file
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=write_limit:10m rate=1r/s;

server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests with rate limiting
    location /api/ {
        # General API rate limit: 10 requests/second, burst of 20
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Stricter limits for write operations
    location ~ ^/api/todos(/.*)?$ {
        limit_req zone=write_limit burst=5 nodelay;
        
        if ($request_method ~ ^(POST|PATCH|DELETE)$) {
            # Extra strict for mutations
        }
        
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Verification:**
```bash
# Test rate limiting
for i in {1..150}; do 
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost/api/todos
done
# Should see 429 responses after hitting the limit
```

**Priority:** IMMEDIATE  
**Estimated Effort:** 2-4 hours

---

## High Severity Findings

### 🟠 HIGH-001: Missing Input Length Validation

**Severity:** HIGH  
**CVSS Score:** 6.5 (Medium-High)  
**CWE:** CWE-1284 (Improper Validation of Specified Quantity in Input)

**Description:**
The todo text field has no maximum length validation. While empty strings are rejected, an attacker can submit extremely long strings, leading to:
- Database bloat (SQLite file size exhaustion)
- Memory exhaustion during JSON parsing
- Denial of Service through resource exhaustion
- UI rendering issues
- Potential buffer overflow in downstream systems

**Affected Code:**
[backend/src/routes/todos.ts](backend/src/routes/todos.ts#L32-L40)
```typescript
// Current code - VULNERABLE
if (typeof text !== 'string' || text.trim().length === 0) {
  return reply.status(422).send({
    error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
  });
}
// No maximum length check!
```

**Attack Scenario:**
```javascript
// Attacker sends 10MB of text
fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    text: 'A'.repeat(10 * 1024 * 1024) // 10MB string
  })
});
// This creates a massive database entry and consumes memory
```

**Impact:**
- Database file size exhaustion
- Memory exhaustion (OOM kills)
- Slow query performance
- UI/UX degradation
- Backup/restore issues

**Remediation:**

Update [backend/src/routes/todos.ts](backend/src/routes/todos.ts):
```typescript
app.post('/api/todos', async (request, reply) => {
  const body = request.body as Record<string, unknown> | null;

  if (!body || !('text' in body)) {
    return reply.status(422).send({
      error: { code: 'VALIDATION_ERROR', message: 'text is required' },
    });
  }

  const text = body.text;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return reply.status(422).send({
      error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
    });
  }

  // FIX: Add maximum length validation
  const MAX_TODO_LENGTH = 500; // Reasonable limit for a todo item
  
  if (text.length > MAX_TODO_LENGTH) {
    return reply.status(422).send({
      error: { 
        code: 'VALIDATION_ERROR', 
        message: `Todo text cannot exceed ${MAX_TODO_LENGTH} characters` 
      },
    });
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  insertTodo.run(id, text.trim(), 0, createdAt);

  return reply.status(201).send({ id, text: text.trim(), isComplete: false, createdAt });
});
```

Also add Fastify body size limits in [backend/src/app.ts](backend/src/app.ts):
```typescript
export async function buildApp(): Promise<FastifyInstance> {
  runMigrations();
  
  const app = Fastify({ 
    logger: true,
    bodyLimit: 1048576, // 1MB max request body size
  });
  
  // ... rest of configuration
}
```

Add frontend validation in [frontend/src/components/AddTodoForm.tsx](frontend/src/components/AddTodoForm.tsx):
```typescript
export function AddTodoForm({ isCreating, onAdd }: AddTodoFormProps) {
  const [text, setText] = useState('')
  const MAX_LENGTH = 500

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length === 0) return
    if (text.length > MAX_LENGTH) return // Client-side validation
    
    try {
      await onAdd(text.trim())
      setText('')
    } catch {
      // error is surfaced by useTodos, input is preserved
    }
  }

  return (
    <form className="add-todo-form" onSubmit={handleSubmit}>
      <label htmlFor="new-todo">New todo</label>
      <div className="add-todo-form__row">
        <input
          id="new-todo"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          disabled={isCreating}
          maxLength={MAX_LENGTH}
        />
        <button 
          type="submit" 
          disabled={isCreating || text.trim().length === 0 || text.length > MAX_LENGTH}
        >
          Add
        </button>
      </div>
      {text.length > MAX_LENGTH && (
        <p className="error-text">
          Maximum {MAX_LENGTH} characters allowed
        </p>
      )}
    </form>
  )
}
```

**Priority:** HIGH  
**Estimated Effort:** 1-2 hours

---

### 🟠 HIGH-002: No HTTPS/TLS Enforcement

**Severity:** HIGH  
**CVSS Score:** 7.4 (High)  
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)

**Description:**
The application serves content over HTTP with no HTTPS/TLS encryption. All data transmitted between client and server is sent in cleartext, making it vulnerable to:
- Man-in-the-Middle (MitM) attacks
- Session hijacking
- Data interception
- Network eavesdropping
- Credential theft (if authentication is added)

**Affected Components:**
- [docker-compose.yml](docker-compose.yml) - Exposes port 80 only
- [frontend/nginx.conf](frontend/nginx.conf) - No SSL configuration
- [backend/src/server.ts](backend/src/server.ts) - HTTP only

**Attack Scenario:**
An attacker on the same network (coffee shop WiFi, compromised router, etc.) can:
1. Intercept all HTTP traffic using tools like Wireshark
2. Read todo items in plaintext
3. Modify requests/responses (inject malicious content)
4. Steal session tokens (if authentication is added)

**Impact:**
- Complete data exposure
- Loss of confidentiality and integrity
- Compliance violations (GDPR, HIPAA, PCI-DSS require encryption in transit)
- User privacy violations
- Trust and reputation damage

**Remediation:**

**Development/Testing: Use mkcert for local HTTPS**

```bash
# Install mkcert
brew install mkcert  # macOS
# or
choco install mkcert  # Windows
# or
apt install mkcert  # Linux

# Create local CA
mkcert -install

# Generate certificates
mkdir -p nginx/certs
mkcert -cert-file nginx/certs/cert.pem -key-file nginx/certs/key.pem localhost 127.0.0.1
```

Update [docker-compose.yml](docker-compose.yml):
```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_PATH: /app/data/todos.db
      CORS_ORIGIN: https://localhost  # Change to https
      PORT: "3000"
    volumes:
      - db-data:/app/data

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "443:443"  # HTTPS port
      - "80:80"    # HTTP redirect
    depends_on:
      - backend
    volumes:
      - ./nginx/certs:/etc/nginx/certs:ro  # Mount certificates

volumes:
  db-data:
```

Update [frontend/nginx.conf](frontend/nginx.conf):
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to the backend service
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;  # For development only
    }

    # Serve SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Production: Use Let's Encrypt or Cloud Provider SSL**

For production deployment:
- Use Let's Encrypt with certbot for free SSL certificates
- Or use cloud provider SSL (AWS ACM, Cloudflare, etc.)
- Configure auto-renewal
- Use SSL Labs to verify configuration (https://www.ssllabs.com/ssltest/)

**Priority:** HIGH  
**Estimated Effort:** 2-3 hours (development), 4-8 hours (production)

---

## Medium Severity Findings

### 🟡 MED-001: Missing CSRF Protection

**Severity:** MEDIUM  
**CVSS Score:** 5.4 (Medium)  
**CWE:** CWE-352 (Cross-Site Request Forgery)

**Description:**
The API has no CSRF (Cross-Site Request Forgery) protection. While CORS is configured, it only protects against certain cross-origin requests. An attacker can still exploit CSRF via:
- Simple requests (GET, HEAD, POST with specific content types)
- Cookie-based session attacks (if authentication is added)
- Social engineering

**Current Mitigation:**
- CORS is configured ([backend/src/app.ts](backend/src/app.ts#L53))
- No cookies are used (reduces CSRF risk)
- No authentication (reduces attack surface)

**Why This Is Still a Risk:**
If authentication/sessions are added later without CSRF protection, the application becomes vulnerable.

**Attack Scenario (if authentication is added):**
```html
<!-- Attacker's malicious website -->
<img src="https://todo-app.com/api/todos/user-important-todo-id" 
     style="display:none">
<!-- This would delete the user's todo when they visit the attacker's page -->
```

**Remediation:**

**Option 1: Use CSRF Tokens (Recommended for session-based auth)**

Install `@fastify/csrf-protection`:
```bash
pnpm add @fastify/csrf-protection --filter backend
```

Update [backend/src/app.ts](backend/src/app.ts):
```typescript
import csrf from '@fastify/csrf-protection';

export async function buildApp(): Promise<FastifyInstance> {
  runMigrations();
  const app = Fastify({ logger: true });

  await app.register(helmetPlugin);
  
  // CSRF protection
  await app.register(csrf, {
    sessionPlugin: '@fastify/cookie',  // Or @fastify/session
    cookieOpts: { signed: true }
  });

  // ... rest of configuration
}
```

**Option 2: Use SameSite Cookies (If using cookie-based auth)**

```typescript
// When setting cookies
reply.setCookie('sessionId', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',  // or 'lax'
  maxAge: 3600
});
```

**Option 3: Custom Headers (Current best practice for APIs)**

Require a custom header for state-changing operations:
```typescript
// In routes/todos.ts
app.post('/api/todos', async (request, reply) => {
  // Verify custom header
  if (!request.headers['x-requested-with']) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Invalid request' }
    });
  }
  
  // ... rest of handler
});
```

Update frontend [hooks/useTodos.ts](frontend/src/hooks/useTodos.ts):
```typescript
const createTodo = useCallback(async (text: string) => {
  setIsCreating(true)
  setError(null)
  try {
    const res = await assertOk(
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'  // CSRF mitigation
        },
        body: JSON.stringify({ text }),
      }),
    )
    // ... rest of code
  }
});
```

**Priority:** MEDIUM (HIGH if authentication is planned)  
**Estimated Effort:** 2-3 hours

---

### 🟡 MED-002: Exposed Backend Port in Docker

**Severity:** MEDIUM  
**CVSS Score:** 4.3 (Medium)  
**CWE:** CWE-668 (Exposure of Resource to Wrong Sphere)

**Description:**
The backend service exposes port 3000 directly to the host ([docker-compose.yml](docker-compose.yml#L6)). This allows clients to bypass the nginx reverse proxy and directly access the backend API, circumventing:
- Rate limiting (if implemented in nginx)
- Security headers
- Access logs
- SSL termination
- IP filtering

**Affected Code:**
```yaml
# docker-compose.yml
backend:
  ports:
    - "3000:3000"  # ⚠️ Direct access to backend
```

**Attack Scenario:**
```bash
# Bypass nginx and access backend directly
curl http://localhost:3000/api/todos
# This works even if nginx has rate limiting or access controls
```

**Impact:**
- Security controls bypass
- Inconsistent security posture
- Difficult to enforce policies
- Audit trail gaps

**Remediation:**

Update [docker-compose.yml](docker-compose.yml):
```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    # Remove port mapping - only accessible via Docker network
    # ports:
    #   - "3000:3000"  # REMOVED
    expose:
      - "3000"  # Only expose to Docker network
    environment:
      DATABASE_PATH: /app/data/todos.db
      CORS_ORIGIN: http://localhost
      PORT: "3000"
    volumes:
      - db-data:/app/data
    networks:
      - app-network  # Use custom network

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"  # Only frontend exposed
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  db-data:
```

For local development debugging, use a separate docker-compose override:
```yaml
# docker-compose.override.yml (not committed to repo)
services:
  backend:
    ports:
      - "3000:3000"  # Only for local debugging
```

**Priority:** MEDIUM  
**Estimated Effort:** 30 minutes

---

### 🟡 MED-003: Missing Content Security Policy (CSP)

**Severity:** MEDIUM  
**CVSS Score:** 4.7 (Medium)  
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)

**Description:**
While `@fastify/helmet` is used ([backend/src/app.ts](backend/src/app.ts#L51)), there's no custom Content Security Policy configured. This leaves the application vulnerable to:
- XSS attacks (if a vulnerability is introduced)
- Clickjacking
- Data injection
- Cross-site script inclusion

**Current State:**
Helmet provides default CSP, but it may be too permissive or not tailored to the app's needs.

**Remediation:**

Update [backend/src/app.ts](backend/src/app.ts):
```typescript
await app.register(helmetPlugin, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // React inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],  // Prevent clickjacking
      upgradeInsecureRequests: [],  // Force HTTPS
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },  // Prevent framing
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});
```

Add CSP reporting endpoint to monitor violations:
```typescript
app.post('/api/csp-report', async (request, reply) => {
  app.log.warn({ cspViolation: request.body }, 'CSP violation reported');
  return reply.status(204).send();
});
```

Update helmet CSP config:
```typescript
contentSecurityPolicy: {
  directives: {
    // ... other directives
    reportUri: '/api/csp-report',
  }
}
```

**Priority:** MEDIUM  
**Estimated Effort:** 1-2 hours

---

### 🟡 MED-004: Insufficient Error Handling Sanitization

**Severity:** MEDIUM  
**CVSS Score:** 3.7 (Low-Medium)  
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:**
While the global error handler prevents internal error disclosure ([backend/src/app.ts](backend/src/app.ts#L58-L66)), route-specific errors could be more generic. Some errors directly expose validation logic that could aid attackers.

**Affected Code:**
[backend/src/routes/todos.ts](backend/src/routes/todos.ts#L30-L33)
```typescript
if (!body || !('text' in body)) {
  return reply.status(422).send({
    error: { code: 'VALIDATION_ERROR', message: 'text is required' },
  });
}
```

**Potential Issue:**
Error messages could be used for reconnaissance to understand the API structure.

**Current Mitigation:**
- Errors are already fairly generic
- No stack traces or internal paths exposed
- Error codes are standardized

**Remediation:**

Consider a centralized error response generator:
```typescript
// backend/src/utils/errors.ts
export const ErrorResponses = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request parameters'
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found'
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later'
  }
} as const;
```

Use in routes:
```typescript
if (!body || !('text' in body)) {
  return reply.status(422).send({ error: ErrorResponses.VALIDATION_ERROR });
}
```

Log detailed errors server-side for debugging:
```typescript
app.log.info({ 
  validation: 'missing text field', 
  body: body 
}, 'Validation failed');
```

**Priority:** LOW-MEDIUM  
**Estimated Effort:** 1 hour

---

## Low Severity Findings

### 🟢 LOW-001: No Authentication or Authorization

**Severity:** LOW  
**CVSS Score:** N/A (Informational)  
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:**
The application has no authentication or authorization. Any user can:
- View all todos
- Create todos
- Update any todo
- Delete any todo

**Note:** This may be intentional for a demo/learning application.

**Impact:**
- No data privacy
- No user isolation
- No access control
- Unsuitable for production use with real user data

**Remediation (If Authentication is Required):**

Consider implementing:

1. **JWT Authentication**
```bash
pnpm add @fastify/jwt --filter backend
```

```typescript
// Register JWT
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-me-in-production'
});

// Protect routes
app.addHook('onRequest', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});
```

2. **Add user_id to todos table**
```sql
ALTER TABLE todos ADD COLUMN user_id TEXT NOT NULL;
CREATE INDEX idx_todos_user_id ON todos(user_id);
```

3. **Filter todos by authenticated user**
```typescript
// Only return todos belonging to the user
const selectAll = db.prepare(
  'SELECT * FROM todos WHERE user_id = ?'
);

app.get('/api/todos', async (request, reply) => {
  const userId = request.user.id; // From JWT
  const rows = selectAll.all(userId);
  return reply.send(rows);
});
```

**Priority:** LOW (unless production use is planned)  
**Estimated Effort:** 8-16 hours for full implementation

---

### 🟢 LOW-002: Container Running as Root

**Severity:** LOW  
**CVSS Score:** 2.3 (Low)  
**CWE:** CWE-250 (Execution with Unnecessary Privileges)

**Description:**
Docker containers run as root by default. While this is common, it's a security best practice to run as a non-privileged user.

**Affected Files:**
- [backend/Dockerfile](backend/Dockerfile)
- [frontend/Dockerfile](frontend/Dockerfile)

**Remediation:**

Update [backend/Dockerfile](backend/Dockerfile):
```dockerfile
# Stage 2: runtime
FROM node:lts-slim AS runtime
WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

RUN corepack enable \
    && pnpm install --filter backend --frozen-lockfile --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/db/migrations ./backend/dist/db/migrations

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
```

Update [frontend/Dockerfile](frontend/Dockerfile):
```dockerfile
# Stage 2: serve
FROM nginx:alpine AS runtime

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Change ownership
RUN chown -R appuser:appuser /usr/share/nginx/html \
    && chown -R appuser:appuser /var/cache/nginx \
    && chown -R appuser:appuser /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appuser /var/run/nginx.pid

# Update nginx to run as non-root
RUN sed -i 's/user  nginx;/user  appuser;/g' /etc/nginx/nginx.conf

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Priority:** LOW  
**Estimated Effort:** 1 hour

---

## Positive Security Findings

### ✅ PASS-001: SQL Injection Protection

**Status:** ✅ SECURE

**Finding:**
The application properly uses prepared statements for all database queries ([backend/src/routes/todos.ts](backend/src/routes/todos.ts#L8-L18)).

**Evidence:**
```typescript
const selectById = db.prepare(
  'SELECT id, text, is_complete AS isComplete, created_at AS createdAt FROM todos WHERE id = ?',
);
const insertTodo = db.prepare(
  'INSERT INTO todos (id, text, is_complete, created_at) VALUES (?, ?, ?, ?)',
);
```

All user input is passed as parameters (never concatenated), preventing SQL injection attacks.

---

### ✅ PASS-002: XSS Protection (React)

**Status:** ✅ SECURE

**Finding:**
React automatically escapes all rendered content. No use of `dangerouslySetInnerHTML` found.

**Evidence:**
[frontend/src/components/TodoItem.tsx](frontend/src/components/TodoItem.tsx#L21)
```tsx
<span className="todo-item__text">{todo.text}</span>
```

React escapes `{todo.text}` automatically, preventing XSS even if malicious content is stored.

**Test:**
```bash
# Try to inject XSS
curl -X POST http://localhost/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(\"XSS\")</script>"}'

# The script tag will be rendered as text, not executed
```

---

### ✅ PASS-003: CORS Configuration

**Status:** ✅ PROPERLY CONFIGURED

**Finding:**
CORS is correctly configured with origin restriction ([backend/src/app.ts](backend/src/app.ts#L53-L55)).

**Evidence:**
```typescript
await app.register(corsPlugin, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
});
```

Only the specified origin can make cross-origin requests, preventing unauthorized API access from other websites.

---

### ✅ PASS-004: Helmet Security Headers

**Status:** ✅ IMPLEMENTED

**Finding:**
Fastify Helmet middleware is registered ([backend/src/app.ts](backend/src/app.ts#L51)), providing essential security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (if HTTPS is enabled)

---

### ✅ PASS-005: No Vulnerable Dependencies

**Status:** ✅ CLEAN

**Finding:**
Dependency audit shows no known vulnerabilities:

```bash
# Backend
pnpm audit --prod
# No known vulnerabilities found

# Frontend
pnpm audit --prod
# No known vulnerabilities found
```

All dependencies are up-to-date and secure.

---

### ✅ PASS-006: Environment Variable Security

**Status:** ✅ SECURE

**Finding:**
Sensitive configuration is properly externalized to environment variables:
- `.env` files are in `.gitignore` ([.gitignore](/.gitignore#L8-L11))
- `.env` files are in `.dockerignore` ([.dockerignore](/.dockerignore#L10-L13))
- Database path is configurable ([backend/src/db/client.ts](backend/src/db/client.ts#L4-L7))
- CORS origin is configurable

No secrets are hardcoded in the source code.

---

### ✅ PASS-007: Multi-Stage Docker Builds

**Status:** ✅ SECURE

**Finding:**
Both Dockerfiles use multi-stage builds, minimizing attack surface:
- Builder stage includes dev dependencies
- Runtime stage only includes production code and dependencies
- Smaller final image size
- Fewer potential vulnerabilities

---

### ✅ PASS-008: Input Validation (Partial)

**Status:** ✅ GOOD (with room for improvement)

**Finding:**
Required fields are validated:
- `text` field presence ([backend/src/routes/todos.ts](backend/src/routes/todos.ts#L29-L33))
- `text` type checking
- `text` empty string prevention
- `isComplete` boolean validation

**Recommendation:** Add length limits (see HIGH-001)

---

### ✅ PASS-009: TypeScript Type Safety

**Status:** ✅ SECURE

**Finding:**
Full TypeScript implementation provides:
- Compile-time type checking
- Prevention of type-related vulnerabilities
- Better code quality and maintainability
- Clear interfaces for data structures

---

## Detailed Analysis by Category

### 1. Injection Attacks

| Attack Type | Status | Details |
|-------------|--------|---------|
| SQL Injection | ✅ Protected | Prepared statements used throughout |
| NoSQL Injection | N/A | Not using NoSQL database |
| Command Injection | ✅ Protected | No shell commands executed with user input |
| LDAP Injection | N/A | Not using LDAP |
| Template Injection | ✅ Protected | React handles all rendering |

### 2. Cross-Site Scripting (XSS)

| XSS Type | Status | Details |
|----------|--------|---------|
| Reflected XSS | ✅ Protected | React auto-escaping, no URL params rendered |
| Stored XSS | ✅ Protected | React auto-escaping on all stored content |
| DOM-based XSS | ✅ Protected | No direct DOM manipulation |

### 3. Authentication & Session Management

| Control | Status | Details |
|---------|--------|---------|
| Authentication | ❌ Not Implemented | No auth system (may be intentional) |
| Session Management | ❌ Not Implemented | No sessions |
| Password Storage | N/A | No passwords |
| Multi-Factor Auth | N/A | No auth |
| Session Timeout | N/A | No sessions |

### 4. Access Control

| Control | Status | Details |
|---------|--------|---------|
| Authorization | ❌ Not Implemented | All data public |
| Vertical Privilege Escalation | N/A | No roles |
| Horizontal Privilege Escalation | N/A | No user isolation |
| IDOR (Insecure Direct Object References) | ⚠️ Vulnerable | Any user can access any todo by ID |

### 5. Cryptography

| Control | Status | Details |
|---------|--------|---------|
| Encryption in Transit | 🟠 Not Implemented | HTTP only, no TLS (HIGH-002) |
| Encryption at Rest | ⚠️ Partial | SQLite file not encrypted |
| Password Hashing | N/A | No passwords |
| Secure Random | ✅ Good | UUIDs use crypto.randomUUID() |

### 6. Input Validation

| Validation | Status | Details |
|------------|--------|---------|
| Type Validation | ✅ Implemented | TypeScript + runtime checks |
| Required Fields | ✅ Implemented | text, isComplete validated |
| Length Limits | 🟠 Missing | No max length (HIGH-001) |
| Format Validation | ⚠️ Partial | Basic string/boolean checks |
| Sanitization | ✅ Good | trim() used, React escapes |

### 7. Security Configuration

| Configuration | Status | Details |
|---------------|--------|---------|
| Security Headers | ✅ Implemented | Helmet middleware |
| CORS | ✅ Configured | Origin restriction |
| HSTS | 🟠 Partial | Requires HTTPS |
| CSP | 🟡 Default | Could be customized (MED-003) |
| Error Handling | ✅ Good | Generic error messages |

---

## Remediation Roadmap

### Phase 1: Critical & High Priority (Week 1)

| Item | Priority | Effort | Impact |
|------|----------|--------|--------|
| CRIT-001: Rate Limiting | Critical | 4h | Prevents DoS |
| HIGH-001: Input Length Validation | High | 2h | Prevents resource exhaustion |
| HIGH-002: HTTPS/TLS | High | 4h | Data confidentiality |

**Total Estimated Effort:** 10 hours  
**Expected Impact:** Mitigates most critical vulnerabilities

### Phase 2: Medium Priority (Week 2)

| Item | Priority | Effort | Impact |
|------|----------|--------|--------|
| MED-001: CSRF Protection | Medium | 3h | Defense in depth |
| MED-002: Remove Backend Port Exposure | Medium | 0.5h | Security consistency |
| MED-003: CSP Configuration | Medium | 2h | XSS defense layer |

**Total Estimated Effort:** 5.5 hours  
**Expected Impact:** Strengthens overall security posture

### Phase 3: Low Priority & Future Enhancements (Month 1)

| Item | Priority | Effort | Impact |
|------|----------|--------|--------|
| LOW-001: Authentication System | Low* | 16h | Required for production |
| LOW-002: Non-Root Containers | Low | 1h | Defense in depth |
| MED-004: Error Sanitization | Low-Med | 1h | Reconnaissance prevention |

**Total Estimated Effort:** 18 hours  
**Expected Impact:** Production-ready security

*Note: Authentication priority becomes HIGH if real user data will be stored.

---

## Code Examples & Fixes

### Complete Secure Backend Configuration

<details>
<summary>backend/src/app.ts (Click to expand)</summary>

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from '@fastify/cors';
import helmetPlugin from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { db } from './db/client';
import { todosRoutes } from './routes/todos';
import fs from 'fs';
import path from 'path';

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const migrations = [
    {
      name: '0000_fuzzy_black_crow',
      file: path.join(__dirname, 'db/migrations/0000_fuzzy_black_crow.sql'),
    },
  ];

  for (const migration of migrations) {
    const applied = db
      .prepare('SELECT name FROM __migrations WHERE name = ?')
      .get(migration.name);
    if (!applied) {
      const sql = fs.readFileSync(migration.file, 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO __migrations (name, applied_at) VALUES (?, ?)').run(
        migration.name,
        new Date().toISOString(),
      );
    }
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  runMigrations();

  const app = Fastify({ 
    logger: true,
    bodyLimit: 1048576, // 1MB max request body
  });

  // Security headers with custom CSP
  await app.register(helmetPlugin, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      }
    },
    frameguard: { action: "deny" },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    }
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${context.after}`,
      }
    })
  });

  // CORS
  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Health check
  app.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  // Todo routes
  await app.register(todosRoutes);

  return app;
}
```
</details>

### Secure Todo Routes with Validation

<details>
<summary>backend/src/routes/todos.ts (Click to expand)</summary>

```typescript
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db } from '../db/client';
import type { Todo } from '../db/schema';

const MAX_TODO_LENGTH = 500;

export async function todosRoutes(app: FastifyInstance): Promise<void> {
  const selectAll = db.prepare(
    'SELECT id, text, is_complete AS isComplete, created_at AS createdAt FROM todos',
  );
  const selectById = db.prepare(
    'SELECT id, text, is_complete AS isComplete, created_at AS createdAt FROM todos WHERE id = ?',
  );
  const insertTodo = db.prepare(
    'INSERT INTO todos (id, text, is_complete, created_at) VALUES (?, ?, ?, ?)',
  );
  const updateIsComplete = db.prepare('UPDATE todos SET is_complete = ? WHERE id = ?');
  const deleteTodo = db.prepare('DELETE FROM todos WHERE id = ?');

  // GET /api/todos
  app.get('/api/todos', async (_request, reply) => {
    const rows = selectAll.all() as unknown as Todo[];
    return reply.send(rows.map((row) => ({ ...row, isComplete: row.isComplete === 1 })));
  });

  // POST /api/todos
  app.post('/api/todos', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;

    if (!body || !('text' in body)) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'text is required' },
      });
    }

    const text = body.text;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
      });
    }

    if (text.length > MAX_TODO_LENGTH) {
      return reply.status(422).send({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Todo text cannot exceed ${MAX_TODO_LENGTH} characters` 
        },
      });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    insertTodo.run(id, text.trim(), 0, createdAt);

    return reply.status(201).send({ 
      id, 
      text: text.trim(), 
      isComplete: false, 
      createdAt 
    });
  });

  // PATCH /api/todos/:id
  app.patch('/api/todos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown> | null;

    if (!body || !('isComplete' in body) || typeof body.isComplete !== 'boolean') {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'isComplete must be a boolean' },
      });
    }

    const existing = selectById.get(id) as unknown as Todo | undefined;

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
      });
    }

    updateIsComplete.run(body.isComplete ? 1 : 0, id);

    return reply.send({
      id: existing.id,
      text: existing.text,
      isComplete: body.isComplete,
      createdAt: existing.createdAt,
    });
  });

  // DELETE /api/todos/:id
  app.delete('/api/todos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = selectById.get(id) as unknown as Todo | undefined;

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
      });
    }

    deleteTodo.run(id);

    return reply.status(204).send();
  });
}
```
</details>

---

## Compliance & Standards

### OWASP Top 10 (2021) Coverage

| Risk | Status | Notes |
|------|--------|-------|
| A01:2021 – Broken Access Control | ⚠️ Partial | No auth (intentional for demo) |
| A02:2021 – Cryptographic Failures | 🟠 Issue | No HTTPS (HIGH-002) |
| A03:2021 – Injection | ✅ Protected | Prepared statements |
| A04:2021 – Insecure Design | ✅ Good | Secure architecture |
| A05:2021 – Security Misconfiguration | 🟡 Partial | Some issues (MED-002, MED-003) |
| A06:2021 – Vulnerable Components | ✅ Clean | No known vulnerabilities |
| A07:2021 – Identification & Auth Failures | N/A | No auth system |
| A08:2021 – Software & Data Integrity | ✅ Good | Integrity checks in place |
| A09:2021 – Security Logging Failures | ⚠️ Partial | Basic logging only |
| A10:2021 – Server-Side Request Forgery | ✅ Protected | No external requests |

### GDPR Considerations

If this application will handle EU user data:
- ❌ **Encryption in transit:** Not implemented (HIGH-002)
- ⚠️ **Data minimization:** Collects minimal data (good)
- ❌ **Right to erasure:** No user association
- ❌ **Data portability:** No export function
- ⚠️ **Privacy by design:** Partial implementation

### PCI-DSS Considerations

Not applicable (no payment card data), but if payment processing is added:
- ❌ **Requirement 4:** Encrypt transmission (HIGH-002)
- ❌ **Requirement 8:** Identify and authenticate access (LOW-001)
- ✅ **Requirement 6.5.1:** Injection flaws protected
- ⚠️ **Requirement 6.5.3:** Insufficient logging

---

## Testing & Verification

### Security Testing Checklist

```bash
# 1. Test SQL injection
curl -X POST http://localhost/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"test'\'' OR 1=1--"}'
# Should create a todo with that literal text, not execute SQL

# 2. Test XSS
curl -X POST http://localhost/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script>"}'
# Should render as text in UI, not execute

# 3. Test CORS
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost/api/todos -v
# Should reject if origin not allowed

# 4. Test rate limiting (after implementation)
for i in {1..150}; do 
  curl -w "%{http_code}\n" -s -o /dev/null http://localhost/api/todos
done
# Should see 429 after limit

# 5. Test input length (after implementation)
curl -X POST http://localhost/api/todos \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$(python3 -c 'print("A"*1000)')\"}"
# Should reject with 422

# 6. Dependency audit
cd backend && pnpm audit
cd frontend && pnpm audit
# Should show no vulnerabilities
```

### Recommended Security Tools

1. **OWASP ZAP:** Automated security scanner
2. **Burp Suite:** Manual penetration testing
3. **npm audit / pnpm audit:** Dependency scanning
4. **Snyk:** Continuous dependency monitoring
5. **SonarQube:** Code quality and security analysis
6. **Trivy:** Container vulnerability scanning

---

## Conclusion

The todo application demonstrates **good fundamental security practices** including SQL injection protection, XSS mitigation, and secure dependency management. However, **critical gaps** in rate limiting, HTTPS enforcement, and input validation must be addressed before production deployment.

### Immediate Actions Required:

1. ✅ Implement rate limiting (CRIT-001)
2. ✅ Add input length validation (HIGH-001)
3. ✅ Enable HTTPS/TLS (HIGH-002)

### Recommended for Production:

4. ✅ Remove backend port exposure (MED-002)
5. ✅ Configure CSP (MED-003)
6. ✅ Add CSRF protection (MED-001)
7. ✅ Implement authentication if handling user data (LOW-001)

Following this remediation roadmap will bring the application to **production-ready security standards**.

---

**Report Generated:** 25 March 2026  
**Next Review:** Recommended within 30 days of implementing changes  
**Contact:** For questions about this report or security concerns
