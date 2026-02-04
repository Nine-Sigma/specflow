# Semantic Context Detection

Guide for identifying security-sensitive code contexts using semantic reasoning.

## Purpose

This document guides Claude to understand WHAT code does, not just match keywords. Security review requires understanding code PURPOSE to apply appropriate scrutiny.

**Key principle:** A function that handles passwords needs security review even if it doesn't contain the word "password".

---

## Context Detection Heuristics

### Authentication Context (Apply CRITICAL scrutiny)

Code that handles user identity verification.

**File path markers:**
- `auth/`, `authentication/`, `login/`, `session/`
- `user/`, `account/`, `identity/`
- `oauth/`, `sso/`, `saml/`

**Function name markers:**
- `login`, `logout`, `authenticate`, `authorize`
- `verify`, `validate[Credentials|Password|Token]`
- `createSession`, `destroySession`, `regenerate`
- `resetPassword`, `changePassword`, `forgotPassword`
- `register`, `signup`, `createAccount`

**Variable/parameter markers:**
- `password`, `passwordHash`, `credentials`
- `token`, `accessToken`, `refreshToken`, `jwt`
- `sessionId`, `session`, `cookie`
- `user`, `userId`, `currentUser`
- `apiKey`, `secretKey`, `privateKey`

**Database table markers:**
- `users`, `accounts`, `credentials`
- `sessions`, `tokens`, `refresh_tokens`
- `passwords`, `password_resets`

**What to check:**
- Password hashing algorithm (bcrypt/argon2, not MD5/SHA1)
- Session regeneration on login
- Token expiration and rotation
- Constant-time comparison for secrets
- Rate limiting on auth endpoints

---

### Payment Context (Apply CRITICAL scrutiny)

Code that handles financial transactions.

**File path markers:**
- `payment/`, `billing/`, `checkout/`
- `subscription/`, `pricing/`, `invoice/`
- `stripe/`, `paypal/`, `braintree/`

**Function name markers:**
- `charge`, `pay`, `refund`, `capture`
- `subscribe`, `cancel[Subscription]`
- `createInvoice`, `processPayment`
- `addCard`, `removeCard`, `updatePaymentMethod`
- `calculateTotal`, `applyDiscount`

**Variable/parameter markers:**
- `amount`, `price`, `total`, `subtotal`
- `card`, `cardNumber`, `cvv`, `expiry`
- `stripe[Customer|PaymentIntent|Subscription]`
- `transaction`, `transactionId`
- `currency`, `discount`, `tax`

**External API markers:**
- `stripe.`, `paypal.`, `braintree.`
- `charges.create`, `paymentIntents.create`
- Webhook handlers for payment events

**What to check:**
- Server-side price/total calculation (never trust client)
- PCI DSS compliance for card handling
- Idempotency for payment requests
- Webhook signature verification
- Sensitive data not logged

---

### PII Context (Apply CRITICAL scrutiny)

Code that handles personally identifiable information.

**File path markers:**
- `profile/`, `account/`, `personal/`
- `user/`, `customer/`, `member/`
- `kyc/`, `verification/`

**Variable/parameter markers:**
- `ssn`, `socialSecurity`, `taxId`
- `dob`, `dateOfBirth`, `birthDate`
- `address`, `streetAddress`, `zipCode`, `postalCode`
- `phone`, `phoneNumber`, `mobile`
- `email`, `emailAddress`
- `name`, `firstName`, `lastName`, `fullName`
- `driverLicense`, `passport`, `nationalId`

**Database field patterns:**
- `personal_*`, `pii_*`, `sensitive_*`
- `encrypted_*`, `hashed_*`
- Fields with `NOT NULL` + `UNIQUE` on email/ssn

**What to check:**
- Data encryption at rest
- Access logging for PII reads
- Data minimization (don't collect unnecessary PII)
- Retention policies implemented
- GDPR/CCPA compliance for data export/deletion

---

### API Context (Apply HIGH scrutiny)

Code that handles HTTP requests and external communication.

**File path markers:**
- `api/`, `routes/`, `controllers/`, `handlers/`
- `endpoints/`, `resources/`, `middleware/`

**Function name markers:**
- `get`, `post`, `put`, `delete`, `patch` (HTTP methods)
- `handle[Request]`, `process[Request]`
- `validate`, `sanitize`, `serialize`
- Route decorators: `@Get`, `@Post`, `@Route`

**Variable/parameter markers:**
- `req`, `request`, `res`, `response`
- `body`, `params`, `query`, `headers`
- `ctx`, `context` (Koa/Hono style)

**What to check:**
- Input validation on all parameters
- Authorization checks before data access
- Rate limiting on public endpoints
- CORS configuration
- Response doesn't leak internal data

---

### Secrets Context (Apply HIGH scrutiny)

Code that handles API keys, credentials, and configuration.

**File path markers:**
- `config/`, `settings/`, `env/`
- `.env`, `secrets.yaml`, `credentials.json`

**Variable/parameter markers:**
- `API_KEY`, `SECRET_KEY`, `PRIVATE_KEY`
- `DATABASE_URL`, `REDIS_URL`, `CONNECTION_STRING`
- `AWS_*`, `GCP_*`, `AZURE_*`
- `process.env.`, `os.environ`, `config.`
- `CLIENT_SECRET`, `APP_SECRET`

**What to check:**
- No hardcoded secrets in source code
- Environment variables for all secrets
- Secrets not logged
- Different secrets per environment
- Secrets rotation capability

---

### Crypto Context (Apply HIGH scrutiny)

Code that performs encryption, hashing, or signing.

**File path markers:**
- `crypto/`, `encryption/`, `security/`
- `utils/hash`, `lib/cipher`

**Function name markers:**
- `encrypt`, `decrypt`, `hash`, `verify`
- `sign`, `validate[Signature]`
- `generateKey`, `deriveKey`
- `randomBytes`, `secureRandom`

**Variable/parameter markers:**
- `cipher`, `key`, `iv`, `salt`, `nonce`
- `signature`, `digest`, `hash`
- `publicKey`, `privateKey`, `secretKey`

**Deprecated algorithm markers (flag if found):**
- `MD5`, `SHA1` (for security purposes)
- `DES`, `3DES`, `RC4`, `Blowfish`
- `ECB` mode (any block cipher)
- `PKCS1v15` (for RSA)

**What to check:**
- Modern algorithms (AES-256, SHA-256+, RSA-2048+)
- Proper IV/nonce handling (random, never reused)
- Key derivation for passwords (PBKDF2, bcrypt, argon2)
- Cryptographically secure random numbers

---

## Scrutiny Escalation Table

| Context | Default Severity | Escalate To | Trigger |
|---------|-----------------|-------------|---------|
| Authentication | MAJOR | CRITICAL | Auth bypass possible, credentials exposed |
| Payment | MAJOR | CRITICAL | Money loss possible, card data exposed |
| PII | MAJOR | CRITICAL | Data exposure possible, compliance violation |
| API | MINOR | MAJOR | User-facing endpoint, auth required |
| Secrets | MAJOR | CRITICAL | Secret could be exposed/leaked |
| Crypto | MAJOR | CRITICAL | Weak algorithm, key exposure |
| General | MINOR | MAJOR | User-facing impact |

---

## Semantic vs Syntactic Detection

### The Problem with Syntactic Detection

Syntactic (regex) detection matches keywords regardless of context:

```typescript
// Syntactic flags this (false positive):
const passwordRequirements = "Must be 8+ characters";  // String content, not a password

// Syntactic misses this (false negative):
function updateCredentials(cred: string) {
  user.secret = cred;  // This IS handling a password!
}
```

### Semantic Detection Approach

Semantic detection understands code PURPOSE:

1. **Analyze function signature** - What does this function DO?
2. **Trace data flow** - Where does user input go?
3. **Understand relationships** - What does this variable represent?
4. **Consider context** - What file/module is this in?

**Example:**
```typescript
// Semantic understands this handles auth even without "password" keyword
async function processLogin(email: string, secret: string): Promise<User> {
  const user = await findByEmail(email);
  const valid = await compare(secret, user.hash);  // compare() suggests verification
  if (!valid) throw new AuthError();
  return user;
}
```

Semantic reasoning identifies:
- Function name `processLogin` suggests authentication
- Parameter `secret` being compared to `hash` suggests password verification
- `AuthError` thrown confirms auth context
- Should check: bcrypt usage, timing-safe comparison, rate limiting

---

## Context Propagation

When a function is called FROM a security context, it inherits that scrutiny.

### Example: Propagation Chain

```typescript
// auth/login.ts (AUTH context)
import { hashPassword } from '../utils/crypto';  // crypto.ts inherits AUTH scrutiny

export async function login(credentials: Credentials) {
  const hash = hashPassword(credentials.password);  // Call to crypto utility
  // ...
}
```

```typescript
// utils/crypto.ts
// This file gets AUTH-level scrutiny because it's called from auth context
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);  // GOOD: bcrypt usage
}
```

### Propagation Rules

1. **Direct import** - Imported functions inherit caller's context level
2. **Shared utilities** - If called from CRITICAL context, apply CRITICAL scrutiny
3. **Database operations** - Inherit context from calling code
4. **API calls** - Inherit context from calling code

---

## Context Detection Checklist

When reviewing a file:

1. [ ] Check file path for context markers (auth/, payment/, etc.)
2. [ ] Scan function names for security-relevant operations
3. [ ] Identify parameter names suggesting sensitive data
4. [ ] Check imports for crypto/payment/auth libraries
5. [ ] Trace where user input flows
6. [ ] Identify external API integrations
7. [ ] Assign highest applicable context level
8. [ ] Apply corresponding OWASP checklist items

---

## Examples: Context Classification

### Example 1: Clear Auth Context

```typescript
// File: src/auth/session.ts
import { sign, verify } from 'jsonwebtoken';

export function createSession(user: User): string {
  return sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
```

**Context:** Authentication (CRITICAL)
**Markers:** File path `auth/`, JWT operations, `process.env.JWT_SECRET`
**Apply:** A02 (crypto), A07 (auth), full auth checklist

### Example 2: Implicit Payment Context

```typescript
// File: src/services/checkout.ts
import Stripe from 'stripe';

export async function processOrder(cart: Cart, paymentMethodId: string) {
  const total = calculateTotal(cart);
  await stripe.paymentIntents.create({ amount: total, ... });
}
```

**Context:** Payment (CRITICAL)
**Markers:** Stripe import, `paymentIntents`, amount calculation
**Apply:** A01 (access control), A02 (secrets), A04 (design - idempotency)

### Example 3: Hidden Auth in Utility

```typescript
// File: src/utils/validation.ts
export function validateUserInput(data: { email: string; secret: string }) {
  if (data.secret.length < 8) throw new Error('Too short');
}
```

**Context:** Authentication (inherited - validates `secret`)
**Markers:** Parameter named `secret`, length validation (password policy)
**Apply:** A07 (auth), check password policy requirements

### Example 4: General Utility

```typescript
// File: src/utils/format.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

**Context:** General (STANDARD scrutiny)
**Markers:** No security-relevant operations
**Apply:** Basic code quality only
