# SpecFlow Pillar Selection Workflow

**Trigger:** Determining which pillars apply based on work context

You are assisting the PM agent (John) with pillar selection for SpecFlow's three-pillar methodology.

## Core Principle

Pillars are NOT mandatory based on type - they're contextual. Start with defaults, then adjust based on what the work actually touches.

## Security Pillar Triggers

Add security pillar when work involves:
- Authentication or authorization
- User data handling (PII, passwords, tokens)
- Payment processing
- API endpoints (especially public-facing)
- File uploads or downloads
- External service integration
- Cryptography or secrets management
- Session management
- Input from untrusted sources

## Cost Pillar Triggers

Add cost pillar when work involves:
- New cloud resources (databases, queues, storage, compute)
- Third-party API usage (Stripe, Twilio, OpenAI, SendGrid)
- Background jobs or scheduled tasks
- Data processing at scale
- Caching layers
- CDN or storage egress
- Licensing changes

## Testing Pillar Triggers

Testing pillar is almost always included. Skip only for:
- Pure documentation changes
- Config file updates with no logic
- Comment-only changes
- README or changelog updates

## Pillar Selection Examples

| Work Item | Type | Raw Pillars | Context Adjustment | Final Pillars |
|-----------|------|-------------|-------------------|---------------|
| "Fix login timeout bug" | bug | [testing] | Auth-related | [security, testing] |
| "Add dark mode" | feature | [security, cost, testing] | UI only, no new resources | [testing] |
| "Integrate Stripe payments" | feature | [security, cost, testing] | All apply - payment data, API costs | [security, cost, testing] |
| "Update README" | docs | [] | None | [] |
| "Refactor user model" | refactor | [security, testing] | User data handling | [security, testing] |
| "Add S3 file upload" | feature | [security, cost, testing] | File handling, storage costs | [security, cost, testing] |
| "Fix typo in error message" | bug | [testing] | No auth/data involved | [testing] |
| "Optimize database queries" | refactor | [security, testing] | Performance, no new costs | [testing] |
| "Add OpenAI summarization" | feature | [security, cost, testing] | API costs, user data | [security, cost, testing] |

## Domain-Specific Rules

Read PROJECT.md to understand domain context. Some domains have automatic implications:

| Domain | Always Add Pillar When... |
|--------|---------------------------|
| Fintech | Any money/payment handling -> security + cost |
| Healthcare | Any patient data -> security (HIPAA) |
| E-commerce | Checkout/cart changes -> security + cost |
| SaaS | User data changes -> security |
| Infrastructure | Resource changes -> cost |

## Output Format

Return JSON with selected pillars and reasoning:

```json
{
  "pillars": ["security", "testing"],
  "reasoning": "Auth-related bug requires security review; no new resources so cost pillar skipped"
}
```

---

*SpecFlow Extension for PM Agent (John)*
