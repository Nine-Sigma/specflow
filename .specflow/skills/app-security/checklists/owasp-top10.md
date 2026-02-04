# OWASP Top 10 2021 Security Checklist

Code-level vulnerability detection organized by OWASP category.

## A01: Broken Access Control

**Description:** Restrictions on authenticated users not properly enforced, allowing access to unauthorized data or functionality.

**Look for:**
- Missing authorization checks on endpoints
- Insecure Direct Object References (IDOR)
- Elevation of privilege (user acting as admin)
- Path traversal attacks
- CORS misconfiguration allowing untrusted origins

**Anti-pattern (wrong):**
```typescript
// BAD: No authorization check - any authenticated user can access any user's data
app.get('/api/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user);
});

// BAD: Trusting user input for role
app.post('/api/admin', async (req, res) => {
  if (req.body.isAdmin) {  // User-controlled!
    await performAdminAction();
  }
});
```

**Correct pattern:**
```typescript
// GOOD: Check resource ownership
app.get('/api/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (user.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(user);
});

// GOOD: Check role from session/token, not user input
app.post('/api/admin', requireRole('admin'), async (req, res) => {
  await performAdminAction();
});
```

**Severity:**
- CRITICAL: Missing auth check allows accessing other users' data
- CRITICAL: Privilege escalation possible (user becomes admin)
- MAJOR: Missing rate limiting on sensitive operations
- MAJOR: Overly permissive CORS configuration

---

## A02: Cryptographic Failures

**Description:** Failures related to cryptography leading to exposure of sensitive data.

**Look for:**
- Hardcoded secrets, API keys, passwords
- Weak algorithms (MD5, SHA1 for passwords, DES, RC4)
- Cleartext storage of sensitive data
- Missing encryption for data in transit
- Predictable random values for security

**Anti-pattern (wrong):**
```typescript
// BAD: Hardcoded API key
const STRIPE_KEY = 'sk_live_EXAMPLE_DO_NOT_USE';

// BAD: MD5 for password (fast, weak)
const hash = crypto.createHash('md5').update(password).digest('hex');

// BAD: Storing password in cleartext
user.password = req.body.password;
await user.save();

// BAD: Math.random for tokens
const token = Math.random().toString(36);
```

**Correct pattern:**
```typescript
// GOOD: Environment variable
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

// GOOD: bcrypt for passwords (slow, salted)
const hash = await bcrypt.hash(password, 12);

// GOOD: Verify password with constant-time comparison
const valid = await bcrypt.compare(input, user.passwordHash);

// GOOD: Cryptographically secure random
const token = crypto.randomBytes(32).toString('hex');
```

**Severity:**
- CRITICAL: Hardcoded production secrets in code
- CRITICAL: Cleartext password storage
- MAJOR: Weak hashing algorithm for passwords
- MAJOR: Predictable random values for tokens
- MINOR: Missing encryption for non-sensitive data

---

## A03: Injection

**Description:** User input interpreted as code/commands due to insufficient validation.

**Look for:**
- SQL string concatenation with user input
- Command execution with user data
- innerHTML assignment with untrusted data
- eval() or Function() with user input
- Template injection

**Anti-pattern (wrong):**
```typescript
// BAD: SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = '${userId}'`;
await db.query(query);

// BAD: Command injection
exec(`ls ${userInput}`);

// BAD: XSS via innerHTML
element.innerHTML = userContent;

// BAD: eval with user data
eval(req.body.expression);

// BAD: Template literal SQL
db.query(`DELETE FROM orders WHERE user_id = '${req.params.id}'`);
```

**Correct pattern:**
```typescript
// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: Command with array arguments (no shell)
execFile('ls', [sanitizedPath]);

// GOOD: textContent for untrusted data
element.textContent = userContent;

// GOOD: Avoid eval; use JSON.parse for data
const data = JSON.parse(req.body.data);

// GOOD: ORM with safe binding
const user = await prisma.user.findUnique({ where: { id: userId } });
```

**Severity:**
- CRITICAL: SQL injection in auth query (login bypass)
- CRITICAL: Command injection with user input
- CRITICAL: XSS with stored user content
- MAJOR: SQL injection in read-only query
- MAJOR: Reflected XSS in error messages

---

## A04: Insecure Design

**Description:** Missing or ineffective control design, not implementation bugs.

**Look for:**
- Missing rate limiting on sensitive operations
- No account lockout after failed attempts
- Missing CAPTCHA on public forms
- Business logic that trusts client calculations
- No fraud detection on payment flows

**Anti-pattern (wrong):**
```typescript
// BAD: No rate limiting on login
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  return res.json({ token: createToken(user) });
});

// BAD: Trust client-side price calculation
app.post('/checkout', async (req, res) => {
  const total = req.body.calculatedTotal;  // User-controlled!
  await chargeCustomer(total);
});

// BAD: No lockout after failed attempts
async function authenticate(credentials) {
  const user = await db.findUser(credentials.email);
  return bcrypt.compare(credentials.password, user.hash);
}
```

**Correct pattern:**
```typescript
// GOOD: Rate limiting middleware
app.post('/login', rateLimit({ max: 5, windowMs: 60000 }), async (req, res) => {
  const user = await authenticate(req.body);
  return res.json({ token: createToken(user) });
});

// GOOD: Server-side price calculation
app.post('/checkout', async (req, res) => {
  const cart = await getCart(req.user.id);
  const total = calculateTotal(cart);  // Server-calculated
  await chargeCustomer(total);
});

// GOOD: Account lockout
async function authenticate(credentials) {
  const user = await db.findUser(credentials.email);
  if (user.loginAttempts >= 5) {
    throw new Error('Account locked. Try again in 15 minutes.');
  }
  // ... continue auth
}
```

**Severity:**
- MAJOR: No rate limiting on auth endpoints
- MAJOR: Trust client-side financial calculations
- MAJOR: No account lockout mechanism
- MINOR: Missing CAPTCHA on public forms

---

## A05: Security Misconfiguration

**Description:** Missing security hardening or improper configuration.

**Look for:**
- Debug mode enabled in production
- Default credentials not changed
- Verbose error messages exposing internals
- Unnecessary features enabled
- Missing security headers

**Anti-pattern (wrong):**
```typescript
// BAD: Debug mode in production
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

// BAD: Default admin credentials
const ADMIN_PASSWORD = 'admin123';

// BAD: Verbose error messages
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,          // Exposes internals!
    query: req.query,          // Leaks request data!
    dbConnection: db.config    // Leaks DB config!
  });
});
```

**Correct pattern:**
```typescript
// GOOD: Production error handling
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.id });  // Log internally
  res.status(500).json({
    error: 'An error occurred',
    requestId: req.id  // For support reference
  });
});

// GOOD: Force credential change on first login
if (user.mustChangePassword) {
  return res.redirect('/change-password');
}

// GOOD: Security headers
app.use(helmet());  // Sets CSP, HSTS, X-Frame-Options, etc.
```

**Severity:**
- CRITICAL: Debug mode in production with stack traces
- CRITICAL: Default/hardcoded admin credentials
- MAJOR: Verbose error messages exposing paths/config
- MAJOR: Missing HTTPS enforcement
- MINOR: Missing non-essential security headers

---

## A06: Vulnerable and Outdated Components

**Description:** Using components with known vulnerabilities.

**Look for:**
- Dependencies with known CVEs
- Outdated packages with security patches
- Components no longer maintained
- Missing lockfile (unpinned versions)

**Anti-pattern (wrong):**
```json
// BAD: Old versions with known vulnerabilities
{
  "dependencies": {
    "lodash": "4.17.4",      // CVE-2019-10744
    "minimist": "0.0.10",    // CVE-2020-7598
    "node-forge": "0.9.0"    // CVE-2020-7720
  }
}

// BAD: No lockfile - versions float
// Missing package-lock.json or yarn.lock
```

**Correct pattern:**
```json
// GOOD: Updated dependencies
{
  "dependencies": {
    "lodash": "^4.17.21",
    "minimist": "^1.2.8"
  }
}

// GOOD: Run security audits in CI
// npm audit --audit-level=high
// pip check / safety check
```

**Verification commands:**
```bash
npm audit --audit-level=high
pip check
safety check
snyk test
```

**Severity:**
- CRITICAL: Dependency with actively exploited CVE
- MAJOR: Dependency with high-severity CVE
- MAJOR: No lockfile (unpredictable builds)
- MINOR: Minor CVE in non-sensitive dependency

---

## A07: Identification and Authentication Failures

**Description:** Confirmation of user identity, authentication, and session management weaknesses.

**Look for:**
- Weak password requirements
- Missing multi-factor authentication (MFA) on sensitive ops
- Session fixation (no regeneration on login)
- Predictable session IDs
- Missing session timeout

**Anti-pattern (wrong):**
```typescript
// BAD: Weak password policy
if (password.length < 4) {
  throw new Error('Password too short');
}

// BAD: Session fixation - same session ID after login
async function login(req, user) {
  req.session.userId = user.id;  // Keeps existing session ID
  return { success: true };
}

// BAD: Credential exposure in logs
logger.info(`User ${email} logged in with password ${password}`);

// BAD: JWT with no expiration
const token = jwt.sign({ userId: user.id }, secret);  // No exp claim
```

**Correct pattern:**
```typescript
// GOOD: Strong password policy
const requirements = [
  password.length >= 12,
  /[A-Z]/.test(password),
  /[a-z]/.test(password),
  /[0-9]/.test(password),
  /[^A-Za-z0-9]/.test(password)
];

// GOOD: Regenerate session on login
async function login(req, user) {
  await new Promise(resolve => req.session.regenerate(resolve));
  req.session.userId = user.id;
  return { success: true };
}

// GOOD: Never log credentials
logger.info(`User ${email} logged in`);

// GOOD: JWT with expiration
const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });
```

**Severity:**
- CRITICAL: Authentication bypass possible
- CRITICAL: Credentials exposed in logs/responses
- MAJOR: Session fixation vulnerability
- MAJOR: Weak password policy (< 8 chars)
- MAJOR: JWT without expiration
- MINOR: Missing password strength indicator

---

## A08: Software and Data Integrity Failures

**Description:** Code and infrastructure lacking integrity verification.

**Look for:**
- Unsafe deserialization of untrusted data
- CI/CD pipeline without integrity checks
- Auto-updates without signature verification
- Unverified CDN resources

**Anti-pattern (wrong):**
```typescript
// BAD: Unsafe deserialization
const user = YAML.load(userInput);  // Can execute code
const data = pickle.loads(buffer);   // Python - arbitrary code exec

// BAD: Unverified CDN script
<script src="https://cdn.example.com/library.js"></script>

// BAD: Dynamic require with user input
const plugin = require(req.body.pluginPath);  // Arbitrary file load
```

**Correct pattern:**
```typescript
// GOOD: Safe parsing
const user = JSON.parse(userInput);  // JSON is data-only
const data = yaml.load(input, { schema: yaml.SAFE_SCHEMA });

// GOOD: Subresource integrity
<script src="https://cdn.example.com/library.js"
        integrity="sha384-oqVuAfXRKap..."
        crossorigin="anonymous"></script>

// GOOD: Whitelist allowed plugins
const ALLOWED_PLUGINS = ['analytics', 'tracking'];
if (!ALLOWED_PLUGINS.includes(req.body.plugin)) {
  throw new Error('Invalid plugin');
}
const plugin = require(`./plugins/${req.body.plugin}`);
```

**Severity:**
- CRITICAL: Unsafe deserialization allows code execution
- MAJOR: Dynamic require/import with user input
- MAJOR: Missing subresource integrity for CDN
- MINOR: Missing signature verification on updates

---

## A09: Security Logging and Monitoring Failures

**Description:** Insufficient logging, detection, monitoring, and active response.

**Look for:**
- Authentication events not logged
- Failed logins not tracked
- Sensitive data in logs (passwords, tokens, PII)
- No alerting on suspicious activity
- Logs not centralized

**Anti-pattern (wrong):**
```typescript
// BAD: No logging of auth events
async function login(credentials) {
  const user = await authenticate(credentials);
  return createSession(user);
}

// BAD: Sensitive data in logs
logger.info('Login attempt', { email, password });
logger.debug('Token generated:', accessToken);

// BAD: Swallowed errors
try {
  await sensitiveOperation();
} catch (e) {
  // Silent failure - no logging
}
```

**Correct pattern:**
```typescript
// GOOD: Log security events
async function login(credentials) {
  const user = await authenticate(credentials);
  logger.info('auth.login.success', { userId: user.id, ip: req.ip });
  return createSession(user);
}

// GOOD: Log failures with safe data
logger.warn('auth.login.failure', {
  email,           // OK to log
  ip: req.ip,
  reason: 'invalid_password'  // Never log the actual password
});

// GOOD: Log and handle errors
try {
  await sensitiveOperation();
} catch (e) {
  logger.error('security.operation.failed', { error: e.message });
  throw new Error('Operation failed');  // Re-throw with safe message
}
```

**Severity:**
- MAJOR: No logging of authentication events
- MAJOR: Sensitive data (passwords, tokens) in logs
- MINOR: Failed operations not logged
- MINOR: No alerting on repeated failures

---

## A10: Server-Side Request Forgery (SSRF)

**Description:** Server fetches a URL without validating user-supplied destination.

**Look for:**
- User-controlled URLs passed to fetch/request
- Webhook URLs without validation
- URL redirects without allowlist
- Image/file fetching from user URLs

**Anti-pattern (wrong):**
```typescript
// BAD: Fetch arbitrary user-supplied URL
app.post('/fetch', async (req, res) => {
  const response = await fetch(req.body.url);  // Can access internal services!
  res.json(await response.json());
});

// BAD: Webhook to arbitrary URL
app.post('/webhook/register', async (req, res) => {
  webhooks.add(req.body.callbackUrl);  // Attacker can probe internal network
});

// BAD: Image proxy without validation
app.get('/proxy', async (req, res) => {
  const image = await fetch(req.query.url);
  res.send(await image.buffer());
});
```

**Correct pattern:**
```typescript
// GOOD: Validate URL against allowlist
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];

app.post('/fetch', async (req, res) => {
  const url = new URL(req.body.url);
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }
  const response = await fetch(url);
  res.json(await response.json());
});

// GOOD: Block internal network ranges
function isInternalUrl(urlString) {
  const url = new URL(urlString);
  const ip = dns.lookup(url.hostname);
  return isPrivateIP(ip);  // Check 10.x, 172.16.x, 192.168.x, localhost
}

// GOOD: Webhook URL validation
app.post('/webhook/register', async (req, res) => {
  const url = new URL(req.body.callbackUrl);
  if (url.protocol !== 'https:') {
    return res.status(400).json({ error: 'HTTPS required' });
  }
  // Additional validation...
});
```

**Severity:**
- CRITICAL: SSRF can access internal services (AWS metadata, etc.)
- CRITICAL: SSRF can probe internal network
- MAJOR: URL redirect without validation
- MAJOR: Missing protocol validation (allows file://, gopher://)

---

## A11: Supply Chain (Additional)

**Description:** Attacks targeting the software supply chain (dependencies, CI/CD).

**Look for:**
- Typosquatting packages (lodas instead of lodash)
- Postinstall scripts in dependencies
- Unpinned GitHub Actions
- Missing lockfile integrity

**Anti-pattern (wrong):**
```yaml
# BAD: Unpinned action versions
- uses: actions/checkout@master  # Can change without warning

# BAD: Trusting all postinstall scripts
npm install --ignore-scripts=false  # Runs arbitrary code
```

**Correct pattern:**
```yaml
# GOOD: Pin to commit SHA
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v3.5.2

# GOOD: Audit postinstall scripts
npm install --ignore-scripts  # Manual review of scripts
```

**Severity:**
- CRITICAL: Typosquatting package installed
- MAJOR: Unpinned CI/CD dependencies
- MAJOR: Running unknown postinstall scripts

---

## A12: Exception Handling (Additional)

**Description:** Improper exception handling leading to information disclosure or denial of service.

**Look for:**
- Empty catch blocks (swallowed errors)
- Bare except clauses (Python)
- Stack traces in responses
- Unhandled promise rejections

**Anti-pattern (wrong):**
```typescript
// BAD: Empty catch block
try {
  await criticalOperation();
} catch (e) {
  // Silent failure!
}

// BAD: Catch-all that continues execution
try {
  user = await db.findUser(id);
} catch {
  user = null;  // Might mask serious errors
}
```

```python
# BAD: Bare except (Python)
try:
    result = dangerous_operation()
except:  # Catches everything, even KeyboardInterrupt!
    pass
```

**Correct pattern:**
```typescript
// GOOD: Log and handle appropriately
try {
  await criticalOperation();
} catch (e) {
  logger.error('Critical operation failed', { error: e });
  throw new ApplicationError('Operation failed', { cause: e });
}

// GOOD: Specific error handling
try {
  user = await db.findUser(id);
} catch (e) {
  if (e instanceof NotFoundError) {
    return null;
  }
  throw e;  // Re-throw unexpected errors
}
```

```python
# GOOD: Specific exceptions (Python)
try:
    result = dangerous_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
```

**Severity:**
- MAJOR: Empty catch block in critical code path
- MAJOR: Bare except that swallows all errors
- MINOR: Generic catch in non-critical code
