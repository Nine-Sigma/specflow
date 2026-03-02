import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Set up a full E2E project in a temp directory with all personas,
 * expertise, methodology, skills, agents.json, and a feature directory
 * pre-populated with fixture artifacts.
 */
export async function setupFullE2EProject(
  featureSlug = 'test-feature',
): Promise<string> {
  const dir = join(
    tmpdir(),
    `specflow-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Core directories
  await mkdir(join(dir, '.specflow', 'features', featureSlug), { recursive: true });
  await mkdir(join(dir, '.specflow', 'features', featureSlug, 'drift'), { recursive: true });
  await mkdir(join(dir, '.specflow', 'skills'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'personas'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'scoping'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'discovery'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'requirements'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'synthesis'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'testing'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'review'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'architecture'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'code-intelligence'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'methodology'), { recursive: true });

  // Personas (~400-600 chars each)
  const personas: Record<string, string> = {
    'pm.md': `# John — PM

## Role
Project Manager and orchestrator. Routes work to agents, reviews outputs, and engages the user only for significant decisions.

## Communication Style
Concise and action-oriented. Uses bullet points for status updates. Avoids jargon when communicating with stakeholders. Summarizes agent outputs before presenting to users.

## Principles
- Proportional ceremony: match depth of process to scope of work
- Autonomous routing: agents work independently, PM reviews
- User engagement: only for big decisions, scope confirmation, and final approval
- Quality gates: every agent output passes PM review before routing forward`,

    'analyst.md': `# Mary — Analyst

## Role
Requirements analyst responsible for eliciting, documenting, and validating functional and non-functional requirements using the BOSS criteria framework.

## Communication Style
Precise and structured. Uses requirement IDs (FR-XX, TC-XX, SC-XX, AC-XX) consistently. Asks clarifying questions before assuming. Documents assumptions explicitly.

## Principles
- Binary: every requirement is testable as pass/fail
- Observable: requirements describe externally visible behavior
- Specific: no ambiguous terms like "fast" or "user-friendly" without metrics
- Scope-bound: requirements trace to the feature scope, not the whole system`,

    'architect.md': `# Winston — Architect

## Role
Technical architect who designs system structure, selects patterns, and documents architecture decisions. Reads codebase constraints to align designs with existing code.

## Communication Style
Visual and systematic. Uses diagrams and component breakdowns. Explains trade-offs explicitly. References existing patterns in the codebase when proposing new structures.

## Principles
- Codebase-aligned: designs must work with the existing tech stack and patterns
- Incremental: prefer extending existing architecture over replacing it
- Documented: every significant decision gets an ADR with rationale and alternatives
- Testable: architecture enables testing at every layer`,

    'security.md': `# Jordan — Security

## Role
Security analyst who applies STRIDE threat modeling to identify vulnerabilities and recommend mitigations. Activated for medium+ scope features.

## Communication Style
Risk-focused and methodical. Uses STRIDE categories systematically. Rates threats by severity and likelihood. Provides actionable mitigations, not just warnings.

## Principles
- Defense in depth: multiple layers of protection for critical paths
- Least privilege: minimal permissions at every boundary
- Input validation: never trust data from outside the trust boundary
- Audit trail: security-relevant actions must be traceable`,

    'cost.md': `# Taylor — Cost

## Role
Cost analyst who estimates infrastructure, operational, and development costs. Provides monthly burn-rate projections and identifies cost optimization opportunities.

## Communication Style
Numbers-driven and pragmatic. Uses tables for cost breakdowns. Compares options by TCO. Flags hidden costs like data transfer, logging, and monitoring overhead.

## Principles
- Itemized estimates: break down costs by compute, storage, network, and services
- Growth modeling: project costs at 1x, 5x, and 10x current scale
- Optimization paths: identify where reserved instances or caching reduce spend
- Right-sizing: match resource allocation to actual workload patterns`,

    'dev.md': `# Amelia — Dev

## Role
Senior developer who implements features according to the architecture and requirements lock. Follows existing codebase patterns and conventions.

## Communication Style
Code-focused and pragmatic. Documents implementation decisions inline. Flags deviations from the architecture plan. Reports blockers immediately rather than working around them silently.

## Principles
- Requirements traceability: every code change maps to an FR/TC/AC/SC ID
- Pattern consistency: follow existing codebase conventions over personal preference
- Test coverage: write tests alongside implementation, not after
- Incremental delivery: commit working code in small, reviewable chunks`,

    'qa.md': `# Quinn — QA

## Role
Quality assurance engineer who validates implementations against the test plan and requirements lock. Identifies gaps in coverage and edge cases.

## Communication Style
Evidence-based and thorough. Reports results with exact pass/fail counts. Documents reproduction steps for failures. Distinguishes between bugs, enhancements, and spec ambiguities.

## Principles
- Requirements coverage: every FR/TC/AC/SC gets at least one test scenario
- Edge cases: test boundaries, error paths, and concurrent access
- Regression awareness: verify existing functionality is not broken
- Environment parity: test conditions should match production constraints`,

    'ux-designer.md': `# Sally — UX Designer

## Role
UX designer who creates user experience specifications, interaction flows, and component strategies. Applies scope-dependent depth from core experience to full design system.

## Communication Style
User-centered and visual. Describes interactions from the user's perspective. Uses journey maps and wireframe annotations. Balances aesthetics with accessibility.

## Principles
- User-first: every design decision starts with user needs and context
- Accessibility: WCAG 2.1 AA compliance as baseline, not afterthought
- Consistency: leverage existing design patterns before introducing new ones
- Progressive disclosure: show only what the user needs at each step`,
  };
  for (const [file, content] of Object.entries(personas)) {
    await writeFile(join(dir, '.specflow-lib', 'personas', file), content);
  }

  // Expertise files (~200-400 chars each)
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'scoping', 'scope-levels.md'),
    '## Scope Levels\n\nSpecFlow uses five scope levels to determine ceremony depth:\n\n- **Trivial**: Single-file changes like typos or config tweaks. No pillars required.\n- **Small**: 1-3 file changes. Testing pillar only.\n- **Medium**: 3-10 files. Security and testing pillars.\n- **Large**: 10+ files. All pillars including cost analysis.\n- **Complex**: Multi-service or research-required changes. All pillars plus discovery phase.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'scoping', 'pillar-selection.md'),
    '## Pillar Selection\n\nPillars are activated based on scope level:\n\n| Scope | Security | Cost | Testing |\n|-------|----------|------|---------|\n| trivial | - | - | - |\n| small | - | - | basic |\n| medium | STRIDE | - | standard |\n| large | STRIDE | full | comprehensive |\n| complex | STRIDE+ | full | comprehensive |\n\nThe PM confirms pillar selection with the user for medium+ scope.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'discovery', 'project-classification.md'),
    '## Project Classification\n\nClassify the project before starting analysis:\n\n1. **Greenfield**: New project with no existing code. Full architecture design needed.\n2. **Brownfield**: Existing codebase. Analyze tech stack, patterns, and integration points first.\n3. **Migration**: Moving between technologies. Map current and target state.\n4. **Enhancement**: Adding features to stable codebase. Focus on codebase constraints.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'requirements', 'boss-criteria.md'),
    '## BOSS Criteria\n\nAll requirements must satisfy four criteria:\n\n- **Binary**: Can be tested as pass/fail with no subjective judgment\n- **Observable**: Describes externally visible behavior, not internal implementation\n- **Specific**: Uses precise metrics, counts, or enumerations instead of vague terms\n- **Scope-bound**: Traces directly to the feature being specified, not system-wide concerns\n\nExample: "The API returns 201 with the user ID within 500ms" satisfies all four. "The system is fast" satisfies none.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'synthesis', 'requirements-lock.md'),
    '## Requirements Lock Format\n\nThe requirements lock freezes all requirements after synthesis:\n\n```\n## Requirements Lock\n### Functional Requirements\n- FR-01: [Description] — [Acceptance Criteria]\n### Technical Constraints\n- TC-01: [Description] — [Verification Method]\n### Security Controls\n- SC-01: [Description] — [Mitigation Strategy]\n### Acceptance Criteria\n- AC-01: [Description] — [Test Scenario]\n```\n\nOnce locked, changes require PM approval and drift detection.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'synthesis', 'codebase-analysis.md'),
    '## Codebase Analysis\n\nAnalyze the existing codebase before architecture design:\n\n1. **Tech Stack**: Language, framework, runtime versions\n2. **Patterns**: Architecture patterns (MVC, layered, event-driven), naming conventions\n3. **Integration Points**: External APIs, databases, message queues, shared libraries\n4. **Constraints**: Performance budgets, deployment targets, compatibility requirements\n\nOutput to `1.5-codebase-constraints.md` for the architect to consume.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'testing', 'index.md'),
    '## Testing Expertise\n\nTest strategy scales with scope level:\n\n- **Trivial/Small**: Unit tests for changed functions. Happy path only.\n- **Medium**: Unit + integration tests. Error paths and boundary conditions.\n- **Large/Complex**: Unit + integration + E2E. Performance benchmarks. Security test cases from STRIDE analysis.\n\nAll test plans reference requirement IDs (FR-XX, TC-XX) for traceability. Coverage targets: 80% line coverage for medium+, 60% for small.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'testing', 'test-specification.md'),
    '## Test Specification Format\n\nAll test plans follow a structured format:\n\n### Test Case ID\nUse TC-XX format tied to requirement IDs.\n\n### Sections\n- **Preconditions**: Setup state before test execution\n- **Steps**: Numbered action sequence\n- **Expected Result**: Observable outcome with pass/fail criteria\n- **Priority**: Critical, High, Medium, Low based on risk impact');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'testing', 'tdd-methodology.md'),
    '## TDD Methodology\n\nTest-Driven Development workflow:\n\n1. **Red**: Write a failing test for the next requirement\n2. **Green**: Write minimal code to make the test pass\n3. **Refactor**: Clean up while keeping tests green\n\nApply at unit level for individual functions. Integration tests verify component interactions after unit coverage is complete.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'testing', 'traceability-matrix.md'),
    '## Traceability Matrix\n\nMap requirements to tests:\n\n| Requirement | Test Case | Status |\n|-------------|-----------|--------|\n| FR-XX | TC-XX | Pass/Fail |\n\nEvery FR, TC, AC, and SC in the requirements lock must have at least one corresponding test case.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'review', 'index.md'),
    '## Review Methodology\n\nCode review follows a structured checklist:\n\n1. **Requirements Coverage**: Every FR/TC/AC/SC in the lock has corresponding code\n2. **Architecture Alignment**: Implementation matches the architecture document\n3. **Security Compliance**: STRIDE mitigations are implemented (medium+ scope)\n4. **Test Coverage**: Test plan scenarios are implemented and passing\n5. **Code Quality**: Follows existing patterns, no unnecessary complexity\n\nReview skills from agents.json are loaded to provide domain-specific checks.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'review', 'output-format.md'),
    '## Review Output Format\n\nReview findings use a structured format:\n\n| Severity | Category | File | Finding | Recommendation |\n|----------|----------|------|---------|----------------|\n| critical | security | auth.ts | Missing CSRF token | Add csrf middleware |\n| warning | coverage | user.ts | FR-03 not tested | Add unit test |\n| info | style | utils.ts | Inconsistent naming | Follow project convention |\n\nSeverity levels: critical (blocks merge), warning (should fix), info (nice to have).');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'review', 'skill-loading.md'),
    '## Skill Loading for Review\n\nReview skills are discovered from agents.json:\n\n1. Filter entries where `source: "skill"` and `review-capable: true`\n2. Exclude disabled skills (names starting with `_`)\n3. Apply scope-minimum filtering based on current feature scope\n4. Load SKILL.md content from each matching skill directory\n5. Enforce 50K total character cap across all loaded skills\n\nSkills provide domain-specific review checklists and automated checks.');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'architecture', 'adr-template.md'),
    '## ADR Template\n\nArchitecture Decision Records follow this structure:\n\n### Title\nShort imperative statement (e.g., "Use PostgreSQL for persistent storage")\n\n### Context\nWhat forces are at play? What constraints exist?\n\n### Decision\nWhat was decided and why?\n\n### Consequences\nPositive: What improves?\nNegative: What trade-offs are accepted?\nNeutral: What changes without clear positive/negative impact?\n\n### Alternatives Considered\nWhat other options were evaluated and why were they rejected?');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'architecture', 'validation-checklist.md'),
    '## Architecture Validation Checklist\n\nVerify architecture decisions against these criteria:\n\n1. **Codebase alignment**: Design works with existing tech stack and patterns\n2. **Scalability**: Architecture handles projected growth without redesign\n3. **Testability**: Every component can be tested in isolation\n4. **Security**: Trust boundaries identified and enforced\n5. **Observability**: Logging, metrics, and tracing integrated\n6. **Failure modes**: Graceful degradation paths defined for each external dependency');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'code-intelligence.md'),
    '## Code Intelligence\n\nThe codebase analysis tools provide automated code understanding:\n\n1. **Scanner**: Detects tech stack, frameworks, and project structure\n2. **Indexer**: Extracts symbols (functions, classes, interfaces) with tree-sitter\n3. **Graph Builder**: Maps call relationships and import dependencies\n4. **Impact Analyzer**: Traces blast radius of changes through the call graph\n5. **Enrichment**: Adds codebase context to agent prompts per phase configuration\n\nOutput is capped at 10K characters and truncated gracefully when exceeded.');

  // Methodology files
  await writeFile(join(dir, '.specflow-lib', 'methodology', 'stride-framework.md'), '## STRIDE Framework\nSpoofing Tampering Repudiation Info-Disclosure DoS Escalation.');
  await writeFile(join(dir, '.specflow-lib', 'methodology', 'cost-methodology.md'), '## Cost Methodology\nCost estimation and analysis framework.');
  await writeFile(join(dir, '.specflow-lib', 'methodology', 'brainstorming-techniques.md'), '## Brainstorming\n60 brainstorming techniques for ideation.');
  // UX methodology (all 9)
  const uxFiles = [
    'ux-accessibility.md', 'ux-component-strategy.md', 'ux-consistency-patterns.md',
    'ux-core-experience.md', 'ux-design-systems.md', 'ux-discovery.md',
    'ux-emotional-design.md', 'ux-user-journeys.md', 'ux-visual-foundation.md',
  ];
  for (const file of uxFiles) {
    await writeFile(
      join(dir, '.specflow-lib', 'methodology', file),
      `## ${file.replace('.md', '').replace(/ux-/g, 'UX ').replace(/-/g, ' ')}\nMethodology content for ${file}.`,
    );
  }

  // STATE.md
  await writeFile(join(dir, '.specflow', 'STATE.md'), '# Project State\n\nNot started');

  // Feature artifacts from fixtures (scaled inline fallbacks ~500-1500 chars)
  const fixturesDir = join(import.meta.dirname, 'artifacts');
  const featureDir = join(dir, '.specflow', 'features', featureSlug);
  try {
    const triage = await readFile(join(fixturesDir, 'triage.md'), 'utf8');
    await writeFile(join(featureDir, '0-triage.md'), triage);
  } catch {
    await writeFile(join(featureDir, '0-triage.md'), `## Triage

### Feature: test-feature
### Submitted by: E2E test suite
### Priority: Medium

#### Description
The user wants to add a test feature that exercises the full SpecFlow pipeline. This feature includes user registration with email validation, order creation with amount constraints, and order retrieval with pagination support.

#### Initial Assessment
This appears to be a medium-scope feature affecting 3-8 files across the controller, service, and data access layers. The feature introduces new API endpoints and requires database schema changes.

#### Recommended Phases
1. Requirements analysis (analyst)
2. Codebase constraints analysis (analyst)
3. Architecture design (architect)
4. Security analysis (security — STRIDE)
5. Test engineering (tea)
6. Development (dev)
7. Quality assurance (qa)
8. Review (pm)

#### Dependencies
- Existing user authentication system
- Database migration tooling
- API versioning strategy

#### Risk Factors
- Email validation may require external service integration
- Order amount constraints need business rule clarification
- Pagination strategy must align with existing API patterns`);
  }

  await writeFile(join(featureDir, '0-scope.md'), `## Scope Assessment

### Level: medium
### Estimated Files: 5-8
### Pillars: security, testing

#### Justification
This feature adds new API endpoints (registration, order CRUD) that handle user input and financial data. The medium scope triggers both security (STRIDE for input handling and data protection) and testing (unit + integration + API tests) pillars.

#### File Impact Estimate
- src/controllers/user-controller.ts (new)
- src/controllers/order-controller.ts (new)
- src/services/user-service.ts (new)
- src/services/order-service.ts (new)
- src/models/user.ts (new)
- src/models/order.ts (new)
- src/routes/index.ts (modified)
- src/middleware/validation.ts (modified)

#### Pillar Rationale
- **Security**: New endpoints accept user input (email, password, amounts). STRIDE analysis required for authentication and data handling.
- **Testing**: Multiple service methods with business logic. Integration tests needed for controller-service-database chain.
- **Cost**: Not triggered — no new infrastructure or external service dependencies.`);

  try {
    const spec = await readFile(join(fixturesDir, 'spec.md'), 'utf8');
    await writeFile(join(featureDir, '1-spec.md'), spec);
  } catch {
    await writeFile(join(featureDir, '1-spec.md'), `## Requirements

### FR-01: User Registration
The system shall accept POST /api/users with email (valid format, unique) and password (min 8 chars, 1 uppercase, 1 number). Returns 201 with user ID and created timestamp. Duplicate email returns 409.

### FR-02: Order Creation
The system shall accept POST /api/orders with user_id (existing user), amount (positive decimal, max 10000.00), and description (1-500 chars). Returns 201 with order ID, status "pending", and created timestamp.

### FR-03: Order Retrieval
The system shall accept GET /api/orders?user_id=X&page=N&limit=M with pagination defaults (page=1, limit=20, max=100). Returns 200 with orders array, total count, and pagination metadata.

### TC-01: Input Validation
All endpoints shall validate input before processing. Invalid requests return 400 with field-level error messages in a consistent format: { errors: [{ field, message, code }] }.

### AC-01: Registration Endpoint
POST /api/users with valid email and password returns 201 within 500ms. The user record is persisted and retrievable. Password is stored as bcrypt hash, never in plaintext.

### AC-02: Order Endpoint
POST /api/orders with valid data returns 201 within 200ms. Orders are associated with the authenticated user. Amount is stored as integer cents to avoid floating-point issues.

### SC-01: Email Uniqueness
The database enforces unique constraint on user email. Race conditions during concurrent registration with the same email result in exactly one success and one 409 error.`);
  }

  await writeFile(join(featureDir, '1.5-codebase-constraints.md'), `## Codebase Constraints

### Tech Stack
- **Language**: TypeScript 5.x with strict mode enabled
- **Runtime**: Node.js 22.x LTS
- **Framework**: Express 4.x with typed request/response handlers
- **Database**: PostgreSQL 16 via Prisma ORM with migration tooling
- **Testing**: Vitest 3.x for unit/integration, Supertest for API tests

### Architecture Patterns
- **Layered architecture**: Controller → Service → Repository (Prisma)
- **Dependency injection**: Constructor injection for services, no IoC container
- **Error handling**: Custom AppError class with HTTP status codes, caught by global error middleware
- **Validation**: Zod schemas at controller boundary, shared between client and server

### Integration Points
- Authentication middleware reads JWT from Authorization header
- Rate limiting via express-rate-limit on all /api/* routes
- Request logging via Pino with correlation IDs
- Health check endpoint at GET /health (no auth required)

### Constraints
- All API responses follow { data, meta, errors } envelope format
- Database migrations must be backward-compatible (no column drops without deprecation)
- Response times: p99 < 500ms for reads, < 1000ms for writes`);

  try {
    const arch = await readFile(join(fixturesDir, 'architecture.md'), 'utf8');
    await writeFile(join(featureDir, '2-architecture.md'), arch);
  } catch {
    await writeFile(join(featureDir, '2-architecture.md'), `## Architecture

### Overview
Three-layer architecture extending the existing Express application with new controller, service, and Prisma model modules.

### Component Design

#### User Controller (src/controllers/user-controller.ts)
- POST /api/users → validateUserInput → userService.register → 201 response
- Uses Zod schema for input validation at the boundary
- Returns standardized envelope response format

#### Order Controller (src/controllers/order-controller.ts)
- POST /api/orders → validateOrderInput → orderService.create → 201 response
- GET /api/orders → parsePagination → orderService.findByUser → 200 response
- Requires authenticated user (JWT middleware)

#### User Service (src/services/user-service.ts)
- register(email, password): hash password, check uniqueness, create user
- findByEmail(email): lookup for authentication flow

#### Order Service (src/services/order-service.ts)
- create(userId, amount, description): validate user exists, store order
- findByUser(userId, page, limit): paginated query with total count

### Data Model
- users: id (UUID), email (unique), password_hash, created_at, updated_at
- orders: id (UUID), user_id (FK), amount_cents (int), description, status, created_at

### ADR-01: Store amounts as integer cents
Avoids floating-point precision issues. Frontend converts display values.`);
  }

  await writeFile(join(featureDir, '3-security.md'), `## Security Analysis

### STRIDE Assessment

#### Spoofing
- **Threat**: Attacker impersonates legitimate user via stolen credentials
- **Mitigation**: JWT tokens with 15-minute expiry. Refresh tokens stored in httpOnly cookies. CSRF tokens on state-changing endpoints.
- **Residual Risk**: Low — token rotation limits exposure window

#### Tampering
- **Threat**: Malicious input modifies order amounts or user data
- **Mitigation**: Zod schema validation on all inputs. Amount stored as integer cents (no float manipulation). Parameterized queries via Prisma (SQL injection prevention).
- **Residual Risk**: Low — validation at boundary plus ORM parameterization

#### Repudiation
- **Threat**: User denies placing an order
- **Mitigation**: Audit log records user_id, action, timestamp, IP for all write operations. Logs are append-only with Pino structured logging.
- **Residual Risk**: Low — correlation IDs enable full request tracing

#### Information Disclosure
- **Threat**: Password or PII exposed in logs or error responses
- **Mitigation**: Passwords hashed with bcrypt (cost factor 12). Error responses exclude stack traces in production. Pino redacts password and token fields.
- **Residual Risk**: Medium — log aggregation systems need access controls

#### Denial of Service
- **Threat**: Rate abuse on registration or order creation endpoints
- **Mitigation**: express-rate-limit at 100 req/min per IP on /api/*. Registration limited to 5 req/min per IP.
- **Residual Risk**: Low — rate limiting plus CDN-level DDoS protection

#### Elevation of Privilege
- **Threat**: User accesses another user's orders
- **Mitigation**: All order queries filter by authenticated user_id. No admin endpoints in this feature scope.
- **Residual Risk**: Low — data isolation enforced at service layer`);

  await writeFile(join(featureDir, '4-cost.md'), `## Cost Analysis

### Infrastructure Costs (Monthly)

| Resource | Specification | Cost |
|----------|--------------|------|
| Compute | 1x t3.small (2 vCPU, 2GB) | $15.00 |
| Database | RDS PostgreSQL db.t3.micro | $12.50 |
| Storage | 20GB gp3 EBS | $1.60 |
| Network | ~10GB data transfer | $0.90 |
| Logging | CloudWatch 5GB ingestion | $2.50 |
| **Total** | | **$32.50** |

### Growth Projections

| Scale | Users | Orders/day | Monthly Cost |
|-------|-------|-----------|--------------|
| 1x | 1,000 | 500 | $32.50 |
| 5x | 5,000 | 2,500 | $65.00 |
| 10x | 10,000 | 5,000 | $120.00 |

### Cost Optimization Opportunities
- Reserved instance pricing saves ~30% on compute at 1-year commitment
- Connection pooling (PgBouncer) defers database scaling to 10x+
- Response caching for order list queries reduces database load by ~40%

### Summary
Low-cost implementation. Compute and database are the primary cost drivers. No external service dependencies. Cost scales linearly with user growth.`);

  await writeFile(join(featureDir, '1.6-ux-design.md'), `## UX Design

### Core Experience
Clean, form-based flows for registration and order management. Progressive disclosure: registration is a single-step form, order creation follows a two-step pattern (input → confirmation).

### User Journeys

#### Registration Flow
1. User navigates to /register
2. Enters email and password with real-time validation feedback
3. Submits form → loading state → success redirect to dashboard
4. Error states: duplicate email (inline message), validation failures (field-level errors)

#### Order Creation Flow
1. User clicks "New Order" from dashboard
2. Enters amount and description with character counter
3. Reviews order summary on confirmation step
4. Submits → loading → success toast with order ID
5. Error states: insufficient permissions, amount limits, server errors

### Component Strategy
- Reuse existing Button, Input, and Toast components from the design system
- New OrderForm compound component with validation state management
- New OrderList component with pagination controls and empty state

### Accessibility
- All form inputs have associated labels and aria-describedby for errors
- Focus management: auto-focus first error field on validation failure
- Keyboard navigation: Tab through form fields, Enter to submit, Escape to cancel`);

  await writeFile(join(featureDir, '5-test-plan.md'), `## Test Plan

### Unit Tests
- **UserService.register**: Valid input creates user, duplicate email throws ConflictError, invalid password throws ValidationError
- **UserService.findByEmail**: Returns user for existing email, returns null for unknown email
- **OrderService.create**: Valid input creates order with "pending" status, invalid user_id throws NotFoundError, amount > 10000 throws ValidationError
- **OrderService.findByUser**: Returns paginated results, respects limit/offset, returns empty array for user with no orders
- **Zod schemas**: Validate email format, password strength rules, amount range, description length

### Integration Tests
- **User Controller**: POST /api/users returns 201 for valid input, 409 for duplicate, 400 for invalid
- **Order Controller**: POST /api/orders returns 201, requires auth, validates input. GET /api/orders returns paginated list.
- **Database**: Unique constraint on email enforced under concurrent inserts
- **Middleware**: Validation errors return consistent error envelope format

### E2E Tests
- Full registration → login → create order → list orders → verify order in list
- Registration with duplicate email returns appropriate error
- Order creation without authentication returns 401
- Pagination works correctly with 50+ orders

### Performance Criteria
- Registration endpoint: p99 < 500ms including bcrypt hashing
- Order creation: p99 < 200ms
- Order listing (page of 20): p99 < 100ms`);

  try {
    const lock = await readFile(join(fixturesDir, 'requirements-lock.md'), 'utf8');
    await writeFile(join(featureDir, '5-requirements-lock.md'), lock);
  } catch {
    await writeFile(join(featureDir, '5-requirements-lock.md'), `## Requirements Lock

### Functional Requirements
- FR-01: User Registration — POST /api/users accepts email + password, returns 201 with user ID. Duplicate email returns 409. Password validated for minimum 8 chars with complexity rules.
- FR-02: Order Creation — POST /api/orders accepts user_id + amount + description, returns 201 with order ID and "pending" status. Amount must be positive decimal up to 10000.00.
- FR-03: Order Retrieval — GET /api/orders supports user_id filter, page/limit pagination (defaults 1/20, max 100). Returns orders array with total count and pagination metadata.

### Technical Constraints
- TC-01: Input Validation — All endpoints validate with Zod schemas. Invalid requests return 400 with { errors: [{ field, message, code }] } format.

### Acceptance Criteria
- AC-01: Registration Endpoint — POST /api/users with valid data returns 201 within 500ms. Password stored as bcrypt hash. User retrievable after creation.
- AC-02: Order Endpoint — POST /api/orders with valid data returns 201 within 200ms. Amount stored as integer cents. Orders associated with authenticated user.

### Security Controls
- SC-01: Email Uniqueness — Database unique constraint on email. Concurrent registration race condition results in exactly one 201 and one 409.`);
  }

  // agents.json with scope-gated review skills
  await writeFile(
    join(dir, 'agents.json'),
    JSON.stringify({
      agents: {
        'test-review-skill': {
          source: 'skill',
          'review-capable': true,
          invoke: '.specflow/skills/test-review',
        },
        'test-review-small': {
          source: 'skill',
          'review-capable': true,
          'scope-minimum': 'small',
          invoke: '.specflow/skills/test-review-small',
        },
        'test-review-large': {
          source: 'skill',
          'review-capable': true,
          'scope-minimum': 'large',
          invoke: '.specflow/skills/test-review-large',
        },
        'test-security-skill': {
          source: 'skill',
          'security-capable': true,
          'scope-minimum': 'medium',
          invoke: '.specflow/skills/test-security',
        },
        '_disabled-skill': {
          source: 'skill',
          'review-capable': true,
          invoke: '.specflow/skills/disabled',
        },
        'non-skill-agent': {
          source: 'custom',
          'review-capable': true,
          invoke: 'some-command',
        },
      },
    }, null, 2),
  );

  // Skills
  await mkdir(join(dir, '.specflow', 'skills', 'test-review'), { recursive: true });
  await writeFile(
    join(dir, '.specflow', 'skills', 'test-review', 'SKILL.md'),
    '---\nname: test-review\nuser-invokable: false\n---\n# Test Review Skill\nThis skill reviews code for quality and correctness. It checks naming conventions, error handling patterns, and test coverage gaps. Available at all scope levels as a baseline review check.',
  );
  await mkdir(join(dir, '.specflow', 'skills', 'test-review-small'), { recursive: true });
  await writeFile(
    join(dir, '.specflow', 'skills', 'test-review-small', 'SKILL.md'),
    '---\nname: test-review-small\nuser-invokable: false\n---\n# Small Scope Review Skill\nThis skill adds code style and pattern consistency checks for small+ scope features. It verifies that new code follows existing project conventions for imports, exports, and module structure.',
  );
  await mkdir(join(dir, '.specflow', 'skills', 'test-review-large'), { recursive: true });
  await writeFile(
    join(dir, '.specflow', 'skills', 'test-review-large', 'SKILL.md'),
    '---\nname: test-review-large\nuser-invokable: false\n---\n# Large Scope Review Skill\nThis skill adds architecture compliance checks for large+ scope features. It verifies component boundaries, dependency directions, and ADR compliance across the full change set.',
  );
  await mkdir(join(dir, '.specflow', 'skills', 'test-security'), { recursive: true });
  await writeFile(
    join(dir, '.specflow', 'skills', 'test-security', 'SKILL.md'),
    '---\nname: test-security\nuser-invokable: false\n---\n# Test Security Skill\nThis skill checks for security vulnerabilities using STRIDE categories. It validates input sanitization, authentication checks, authorization boundaries, and data protection measures.',
  );

  return dir;
}

/**
 * Build a synthetic artifact for a given phase with optional overrides.
 */
export function buildArtifact(
  phase: string,
  overrides?: {
    feature?: string;
    requirements?: string;
    content?: string;
    size?: number;
  },
): string {
  const feature = overrides?.feature ?? 'test-feature';
  const templates: Record<string, () => string> = {
    triage: () =>
      `## Triage\n\n### Feature: ${feature}\n### Priority: Medium\n\n#### Description\nUser wants to add ${feature}. This feature involves creating new API endpoints for data management, implementing service-layer business logic, and adding appropriate validation and error handling.\n\n#### Initial Assessment\nEstimated 5-8 files affected across controller, service, and model layers. Requires input validation, authentication integration, and database schema changes.\n\n#### Recommended Phases\n1. Requirements analysis\n2. Codebase constraints\n3. Architecture design\n4. Security analysis (STRIDE)\n5. Test engineering\n6. Development\n7. QA verification\n\n#### Dependencies\n- Existing authentication middleware\n- Database migration tooling\n- API routing configuration`,
    scope: () =>
      `## Scope Assessment\n\n### Level: medium\n### Estimated Files: 5-8\n### Pillars: security, testing\n\n#### Justification\nScope assessment for ${feature}. This feature adds new API endpoints handling user input and business data, triggering security and testing pillars.\n\n#### File Impact\n- 2 new controllers\n- 2 new services\n- 2 new models\n- 1 route modification\n- 1 middleware update\n\n#### Pillar Rationale\n- Security: New endpoints accept external input requiring STRIDE analysis\n- Testing: Multiple service methods with business logic requiring unit and integration tests`,
    spec: () =>
      overrides?.requirements ??
      `## Requirements\n\n### FR-01: Primary Feature\nThe system shall implement ${feature} with proper input validation, error handling, and response formatting. Accepts JSON payloads and returns standardized envelope responses.\n\n### FR-02: Secondary Feature\nThe system shall support additional functionality including pagination, filtering, and sorting on list endpoints. Default pagination: page=1, limit=20, max=100.\n\n### FR-03: Data Retrieval\nThe system shall provide GET endpoints with query parameter filtering. Responses include data array, total count, and pagination metadata.\n\n### TC-01: Input Validation\nAll endpoints shall validate input with Zod schemas. Invalid requests return 400 with field-level error details.\n\n### AC-01: Write Endpoint\nPOST endpoints return 201 within 500ms with created resource ID. Data persisted and immediately retrievable.\n\n### SC-01: Data Integrity\nDatabase constraints enforce uniqueness and referential integrity. Race conditions handled gracefully with appropriate HTTP status codes.`,
    architecture: () =>
      `## Architecture\n\n### Overview\nLayered architecture for ${feature} extending the existing Express application.\n\n### Components\n\n#### Controller Layer\n- Request handling with Zod validation at boundary\n- Standardized response envelope: { data, meta, errors }\n- Error delegation to global error middleware\n\n#### Service Layer\n- Business logic and data orchestration\n- Constructor injection for repository dependencies\n- Transaction management for multi-step operations\n\n#### Data Layer\n- Prisma models with migration scripts\n- Repository pattern wrapping Prisma client\n- Integer storage for monetary values (cents)\n\n### Cross-Cutting Concerns\n- Authentication via JWT middleware on protected routes\n- Rate limiting at controller boundary\n- Structured logging with correlation IDs\n- Input validation with Zod schemas shared between layers`,
    security: () =>
      `## Security Analysis\n\n### STRIDE Assessment\n\n#### Spoofing\n- Threat: Credential theft or token forgery\n- Mitigation: JWT with 15-min expiry, bcrypt password hashing (cost 12), CSRF tokens on state-changing endpoints\n\n#### Tampering\n- Threat: Input manipulation to modify business data\n- Mitigation: Zod schema validation, parameterized queries via Prisma, integer cents for amounts\n\n#### Repudiation\n- Threat: Users deny actions taken\n- Mitigation: Append-only audit log with user_id, action, timestamp, IP via Pino structured logging\n\n#### Information Disclosure\n- Threat: PII or credentials exposed\n- Mitigation: Bcrypt password hashing, Pino field redaction, no stack traces in production errors\n\n#### Denial of Service\n- Threat: Endpoint abuse or resource exhaustion\n- Mitigation: express-rate-limit (100 req/min global, 5 req/min registration)\n\n#### Elevation of Privilege\n- Threat: Cross-user data access\n- Mitigation: Service-layer user_id filtering, no admin endpoints in scope`,
    cost: () =>
      `## Cost Analysis\n\n### Infrastructure (Monthly)\n| Resource | Spec | Cost |\n|----------|------|------|\n| Compute | t3.small | $15.00 |\n| Database | RDS t3.micro | $12.50 |\n| Storage | 20GB gp3 | $1.60 |\n| Network | ~10GB transfer | $0.90 |\n| Logging | 5GB CloudWatch | $2.50 |\n| Total | | $32.50 |\n\n### Growth Projections\n- 1x (1K users): $32.50/mo\n- 5x (5K users): $65.00/mo\n- 10x (10K users): $120.00/mo\n\n### Optimization\n- Reserved instances save ~30% at 1-year commitment\n- Connection pooling defers DB scaling\n- Response caching reduces DB load ~40%\n\n### Summary\nLow-cost implementation for ${feature}. Linear scaling with user growth. No external service dependencies.`,
    'requirements-lock': () =>
      overrides?.requirements ??
      `## Requirements Lock\n\n### Functional Requirements\n- FR-01: Primary Feature — Implement core ${feature} functionality with input validation and standardized responses\n- FR-02: Secondary Feature — Support pagination, filtering, and sorting on list endpoints\n- FR-03: Data Retrieval — GET endpoints with query parameter filtering and pagination metadata\n\n### Technical Constraints\n- TC-01: Input Validation — Zod schemas on all endpoints, 400 responses with field-level errors\n\n### Acceptance Criteria\n- AC-01: Write Endpoint — POST returns 201 within 500ms with resource ID\n\n### Security Controls\n- SC-01: Data Integrity — Database constraints enforce uniqueness, race conditions return appropriate errors`,
    'dev-output': () =>
      overrides?.content ??
      `## Development Output\n\n### Implementation Summary\nImplemented FR-01, FR-02, and FR-03 across controller, service, and model layers.\n\n### Files Changed\n- src/controllers/feature-controller.ts (new) — Request handling with Zod validation\n- src/services/feature-service.ts (new) — Business logic with constructor injection\n- src/models/feature.ts (new) — Prisma model with migration\n- src/routes/index.ts (modified) — Added new route registrations\n\n### Requirement Coverage\n- FR-01: Implemented in controller + service. Tests passing.\n- FR-02: Pagination with defaults (page=1, limit=20). Tests passing.\n- FR-03: GET endpoint with query filtering. Tests passing.\n- TC-01: Zod schemas validate all inputs. Error format matches spec.\n- AC-01: POST returns 201, measured p99 at 180ms.\n- SC-01: Unique constraint enforced. Concurrent test confirms one 201, one 409.\n\n### Notes\nAll tests passing. No deviations from architecture document.`,
    'qa-output': () =>
      overrides?.content ??
      `## QA Output\n\n### Test Results Summary\n- Unit tests: 24/24 passing\n- Integration tests: 12/12 passing\n- E2E tests: 6/6 passing\n- Total: 42/42 passing\n\n### Requirement Verification\n- FR-01: Verified — Registration creates user, returns 201, duplicate returns 409\n- FR-02: Verified — Pagination defaults work, limit max enforced at 100\n- FR-03: Verified — Filtering by user_id, pagination metadata accurate\n- TC-01: Verified — Invalid input returns 400 with correct error envelope\n- AC-01: Verified — p99 at 180ms (within 500ms target)\n- SC-01: Verified — Concurrent registration test confirms unique constraint\n\n### Edge Cases Tested\n- Empty request body → 400 with all required fields listed\n- Amount at boundary (0.01, 10000.00) → Accepted\n- Amount over limit (10000.01) → 400 with amount error\n- Pagination page=0 → Defaults to page=1\n\n### Issues Found\nNone. All requirements verified.`,
  };

  if (overrides?.size) {
    const base = templates[phase]?.() ?? `## ${phase}\n\nContent for ${phase}.`;
    return base + '\n' + 'x'.repeat(Math.max(0, overrides.size - base.length));
  }

  return templates[phase]?.() ?? `## ${phase}\n\nContent for ${phase} phase with sufficient detail.`;
}

/**
 * Create malformed fixture files for error path testing.
 */
export async function createMalformedFixtures(dir: string): Promise<void> {
  // Invalid agents.json
  await writeFile(join(dir, 'agents-invalid.json'), '{ this is not valid json }');

  // Malformed sprint-status.yaml (missing required fields)
  await writeFile(
    join(dir, 'sprint-status-malformed.yaml'),
    `stories:
  - name: incomplete-story
    wave: 1
waves:
  - wave: 1
    stories:
      - incomplete-story
      - nonexistent-story
`,
  );

  // Sprint status with circular dependencies
  await writeFile(
    join(dir, 'sprint-status-circular.yaml'),
    `stories:
  - name: story-a
    depends_on:
      - story-b
    wave: 1
  - name: story-b
    depends_on:
      - story-a
    wave: 1
waves:
  - wave: 1
    stories:
      - story-a
      - story-b
`,
  );

  // Empty persona file
  await writeFile(join(dir, 'empty-persona.md'), '');
}
