# Pillar Selection Guide

Determines which pillars (Architect, Security, Cost, TEA) are relevant for a feature.

## Core Principle

**Not every feature needs every pillar.** Match pillar involvement to the actual needs of the work.

## Pillar Triggers

### Security Pillar (Jordan)

**Required when ANY of these signals present:**

| Signal | Why Security Matters |
|--------|---------------------|
| Authentication/authorization changes | Identity attack surface |
| Payment processing | PCI-DSS, financial fraud |
| PII handling (names, emails, SSN, etc.) | GDPR, privacy regulations |
| External API integration | Trust boundary crossing |
| File uploads | Injection, malware vectors |
| User input to database | SQL injection, XSS |
| Session management | Session hijacking |
| Cryptographic operations | Key management, algorithm choice |

**Domain overrides (always required):**
- Healthcare (HIPAA)
- Fintech (PCI-DSS, KYC/AML)
- Govtech (FedRAMP)

### Cost Pillar (Taylor)

**Required when ANY of these signals present:**

| Signal | Why Cost Matters |
|--------|-----------------|
| New cloud resources | Ongoing infrastructure cost |
| New 3rd party service | Subscription/usage fees |
| Database changes (new tables, scaling) | Storage and compute costs |
| New compute workloads | Processing costs |
| Data transfer between regions/services | Egress fees |
| New API with usage-based pricing | Variable costs |

**Skip when:**
- Using existing infrastructure
- Code-only changes
- Internal tooling with fixed allocation (e.g., Foundry compute)

### Architect Pillar (Winston)

**Required when ANY of these signals present:**

| Signal | Why Architecture Matters |
|--------|-------------------------|
| Multi-component coordination | Interface contracts needed |
| New service/microservice | Service boundaries, communication |
| API contract changes | Consumer impact, versioning |
| Data model changes (new entities) | Schema design, relationships |
| New integration patterns | Design decisions |
| Technology choice needed | Trade-off analysis |
| Cross-cutting concerns | Consistency across components |

**Skip when:**
- Single component change
- Following existing patterns exactly
- Data pipeline (single flow, no branching)
- UI-only changes within existing architecture

### TEA Pillar (Test Engineering)

**Required for:**
- **Any behavior change** (almost always needed)

**Skip only when:**
- Trivial scope (typo, comment, config with no behavior impact)
- Documentation-only changes

## Pillar Selection Matrix

Quick reference by feature type:

| Feature Type | Security | Cost | Architect | TEA |
|-------------|----------|------|-----------|-----|
| Fix typo/config | - | - | - | - |
| UI tweak (existing component) | - | - | - | YES |
| Add form field | Maybe* | - | - | YES |
| New API endpoint | Maybe* | - | Maybe* | YES |
| Data pipeline (internal) | - | - | - | YES |
| Data pipeline (new infra) | - | YES | - | YES |
| Payment feature | YES | YES | YES | YES |
| Auth changes | YES | - | YES | YES |
| New microservice | YES | YES | YES | YES |
| 3rd party integration | YES | YES | YES | YES |

*Maybe = Check signals above

## Domain-Based Defaults

| Domain | Default Pillars | Rationale |
|--------|-----------------|-----------|
| Healthcare | Security + TEA | HIPAA compliance |
| Fintech | Security + Cost + TEA | PCI-DSS, financial risk |
| E-commerce | Security + Cost + TEA | Payment, inventory |
| Internal tooling | TEA only | Low external risk |
| Data engineering | TEA only | Unless new infra |
| Developer tools | TEA + Architect | API contracts matter |

## Output Format

In `0-scope.md`, Analyst documents pillar selection:

```yaml
pillars:
  required:
    - tea  # Behavior change
  skipped:
    - architect  # Single component, existing patterns
    - security   # Internal data, no auth/PII
    - cost       # No new resources

pillar_rationale:
  tea: "New pipeline logic requires verification"
  architect: "Single Foundry transform, no system design"
  security: "Internal genetic data already secured by Foundry ACLs"
  cost: "Using existing Foundry compute allocation"
```

## PM Validation

PM validates pillar selection during Scope Approval:

| Check | Action if Failed |
|-------|------------------|
| Security skipped but PII/payment present | SCALE_UP |
| Cost skipped but new resources | SCALE_UP |
| Architect skipped but multi-component | SCALE_UP |
| All pillars for simple change | SCALE_DOWN |
| Domain override missed | CLARIFY |

## Examples

### Example 1: PySpark Pipeline (Internal)

Request: "New pyspark pipeline to transform genetic testing data in Palantir Foundry"

```yaml
pillars:
  required:
    - tea
  skipped:
    - architect  # Single pipeline, no system design
    - security   # Internal Foundry, existing security model
    - cost       # Existing compute allocation

pillar_rationale:
  tea: "Pipeline logic needs test scenarios"
  architect: "Single transform in existing Foundry pipeline pattern"
  security: "Genetic data secured by Foundry's existing ACL model"
  cost: "Foundry compute is pre-allocated, no incremental cost"
```

### Example 2: Payment Page Redesign

Request: "Redesign the payment page"

```yaml
pillars:
  required:
    - architect  # UI components, state, API contracts
    - security   # Payment data, PCI-DSS
    - cost       # Payment provider fees if changing
    - tea        # Critical user flow

pillar_rationale:
  architect: "Multiple components, state management, API changes"
  security: "PCI-DSS compliance, payment data handling"
  cost: "May involve payment provider changes, transaction fees"
  tea: "Payment flow is critical path, comprehensive testing required"
```

### Example 3: Add Logout Button

Request: "Add a logout button to the header"

```yaml
pillars:
  required:
    - tea
  skipped:
    - architect  # Single component addition
    - security   # Using existing auth logout endpoint
    - cost       # No new resources

pillar_rationale:
  tea: "User-facing behavior change needs verification"
  architect: "Adding to existing header, no new patterns"
  security: "Calling existing /logout endpoint"
  cost: "No infrastructure changes"
```
