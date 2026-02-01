# Architecture Decision Categories

<!-- Source: _bmad/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md -->

Framework for organizing architectural decisions by domain. Use this to systematically address all critical decisions for a project.

## The Five Decision Categories

### Category 1: Data Architecture

Decisions about how data is stored, validated, and managed.

| Decision Area | What to Decide |
|---------------|----------------|
| Database choice | (if not determined by starter) SQL vs NoSQL, specific database |
| Data modeling approach | Schema design patterns, normalization level |
| Data validation strategy | Where validation happens (API, DB, both), validation library |
| Migration approach | Tool choice, versioning strategy |
| Caching strategy | Cache layer, invalidation patterns |

### Category 2: Authentication & Security

Decisions about user identity and data protection.

| Decision Area | What to Decide |
|---------------|----------------|
| Authentication method | Session-based, JWT, OAuth, etc. |
| Authorization patterns | RBAC, ABAC, policy-based |
| Security middleware | CORS, rate limiting, security headers |
| Data encryption approach | At rest, in transit, field-level |
| API security strategy | API keys, OAuth scopes, signed requests |

### Category 3: API & Communication

Decisions about how components and services communicate.

| Decision Area | What to Decide |
|---------------|----------------|
| API design patterns | REST, GraphQL, gRPC, etc. |
| API documentation approach | OpenAPI/Swagger, GraphQL introspection |
| Error handling standards | Error format, error codes, logging |
| Rate limiting strategy | Limits per tier, throttling behavior |
| Communication between services | Sync vs async, message queues, events |

### Category 4: Frontend Architecture

Decisions about client-side implementation (if applicable).

| Decision Area | What to Decide |
|---------------|----------------|
| State management approach | Redux, Zustand, Context, etc. |
| Component architecture | Design system, component library |
| Routing strategy | File-based, config-based, nested |
| Performance optimization | Code splitting, lazy loading, SSR/SSG |
| Bundle optimization | Bundler choice, tree shaking, chunking |

### Category 5: Infrastructure & Deployment

Decisions about where and how the application runs.

| Decision Area | What to Decide |
|---------------|----------------|
| Hosting strategy | Cloud provider, serverless vs containers |
| CI/CD pipeline approach | GitHub Actions, GitLab CI, etc. |
| Environment configuration | Env vars, secrets management, config files |
| Monitoring and logging | APM tool, log aggregation, alerting |
| Scaling strategy | Horizontal vs vertical, auto-scaling rules |

## Decision Recording

For each decision made, document:

| Field | Description |
|-------|-------------|
| Decision | What was decided |
| Version | Technology version (if applicable) |
| Rationale | Why this choice |
| Affected components | What this impacts |
| Provided by starter | Whether starter template already decided this |

## Scope-Based Category Coverage

Match depth to scope level:

| Scope | Categories to Cover |
|-------|---------------------|
| trivial | Skip - no architecture doc |
| small | None or 1 if new endpoint |
| medium | 2-3 most relevant |
| large | All 5 with rationale |
| complex | All 5 with ADRs for significant decisions |

## Decision Priority Levels

Not all decisions are equal. Classify as:

**Critical (Block Implementation)**
- Must be decided before any code is written
- Wrong choice causes major rework
- Example: Database choice, authentication method

**Important (Shape Architecture)**
- Affects design significantly but can be refined
- Wrong choice causes moderate rework
- Example: State management, API documentation

**Deferrable (Post-MVP)**
- Can be decided later without rework
- Nice-to-have optimization
- Example: Bundle optimization, advanced caching

## Anti-Patterns

- Making all decisions upfront for small scope
- Deferring critical decisions for "later"
- Not documenting rationale (future devs need context)
- Re-deciding what starter template already chose
- Ignoring existing technical preferences
