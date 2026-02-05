# Library Discovery Methodology

Before specifying custom implementation, systematically search for existing solutions.

## When to Search

| Feature Type | Search Depth | Example |
|--------------|--------------|---------|
| Common patterns | Quick (2-3 queries) | Auth, validation, rate limiting |
| Infrastructure | Standard (5+ queries) | Caching, queuing, storage |
| Domain-specific | Deep (research mode) | ML, 3D, audio processing |

**Always search when:**
- Feature involves well-known patterns (auth, CRUD, validation)
- Implementation would exceed ~50 lines of code
- Problem has "there must be a library for this" feel

**Skip search when:**
- Pure business logic specific to this app
- Trivial utilities (<20 lines)
- Already using an established library for this

## Search Protocol

### Step 1: Identify Domain Keywords

Extract problem domain from feature description:
- "rate limiting" -> rate-limiter, throttle, ratelimit
- "email sending" -> email, smtp, transactional-email
- "authentication" -> auth, jwt, oauth, session

### Step 2: Execute Searches

Use WebFetch or web search tool with queries:

```
Query patterns:
1. "{domain} npm package 2026" (or pypi, crates.io)
2. "{domain} {framework} library" (e.g., "rate limiting express")
3. "best {domain} library node.js"
4. "{domain} library comparison github"
```

### Step 3: Evaluate Options

For each library found, check:

| Criterion | Signal | Weight |
|-----------|--------|--------|
| Downloads | npm weekly downloads | HIGH |
| Maintenance | Last commit < 6 months | HIGH |
| Stars | GitHub stars > 500 | MEDIUM |
| Issues | Open issue ratio | MEDIUM |
| Bundle size | bundlephobia.com | LOW |
| License | MIT/Apache/BSD | HIGH |
| TypeScript | Native TS support | MEDIUM |

### Step 4: Document Decision

In spec output, include:

```markdown
## Library Analysis

| Problem | Recommended | Alternatives | Rationale |
|---------|-------------|--------------|-----------|
| Rate limiting | rate-limiter-flexible | express-rate-limit | Multiple algorithms, Redis support, battle-tested (10M+ downloads) |
| Validation | zod | yup, joi | Native TypeScript, smaller bundle, infer types |

### Build vs Buy Decision

**USE LIBRARY:** rate-limiter-flexible
- 10M+ weekly downloads
- Supports sliding window, token bucket, fixed window
- Redis integration built-in
- Maintained (last commit: 2 weeks ago)

**CUSTOM JUSTIFIED WHEN:**
- Library doesn't meet security requirements (documented reason)
- Bundle size unacceptable for target (documented size)
- License incompatible (documented license)
- No library exists (documented search)
```

## Common Patterns to Search

| Pattern | Top Libraries (Node.js) | Top Libraries (Python) |
|---------|-------------------------|------------------------|
| Rate limiting | rate-limiter-flexible, express-rate-limit | slowapi, ratelimit |
| Validation | zod, yup, joi | pydantic, marshmallow |
| Auth/JWT | jose, jsonwebtoken | python-jose, PyJWT |
| HTTP client | axios, ky, got | httpx, requests |
| ORM | prisma, drizzle, typeorm | sqlalchemy, tortoise |
| Email | nodemailer, @sendgrid/mail | python-emails, sendgrid |
| Caching | ioredis, keyv | redis-py, cachetools |
| Queue | bullmq, agenda | celery, rq |
| File upload | multer, busboy | python-multipart |
| WebSocket | socket.io, ws | python-socketio, websockets |

## Red Flags (Custom Implementation Warning)

If Analyst or Dev is about to write >50 lines for:
- Input validation
- Rate limiting
- JWT handling
- Email sending
- File upload handling
- Retry logic
- Caching layer
- Queue processing

**STOP and search first.** These are solved problems.
