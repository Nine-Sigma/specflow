# SpecFlow Workflow Guide

End-to-end guide for creating feature specifications following the SpecFlow methodology.

---

## Quick Start (TL;DR)

Every feature spec needs three things before you write code:

1. **Security** - Run `/cloud-security`, copy STRIDE table
2. **Cost** - Run `/cloud-cost`, copy breakdown + assumptions
3. **Testing** - Write 6+ Gherkin scenarios

Then run:

```bash
./scripts/verify-spec.sh
```

If it passes, create your PR.

---

## The Three Pillars

SpecFlow ensures every feature addresses Security, Cost, and Testing before implementation.

| Pillar | Tagline | Agent Command | Output | Time |
|--------|---------|---------------|--------|------|
| **Security** | Think before you ship | `/cloud-security` | STRIDE threat model | ~5 min |
| **Cost** | Know before you spend | `/cloud-cost` | Cost breakdown | ~5 min |
| **Testing** | Prove before you merge | Manual | Gherkin scenarios | ~10 min |

**Total spec creation time:** 20-30 minutes for a standard feature.

---

## Why This Process?

Traditional development discovers problems late:

```
Code First:     Code -> Test -> "Wait, is this secure?" -> "How much will this cost?"
                       ^                                            ^
                       |                                            |
                  (bugs found late)                         (budget surprises)
```

SpecFlow discovers problems early:

```
Spec First:     Security -> Cost -> Test Scenarios -> Code -> Verify
                    ^          ^           ^
                    |          |           |
              (threats found) (costs known) (acceptance defined)
```

**Benefits:**
- Security vulnerabilities caught before code exists
- Cost surprises eliminated before deployment
- Test scenarios define acceptance criteria upfront
- Faster PR reviews (spec already approved)

---

## Step-by-Step Process

### Step 1: Understand the Feature

Before creating a spec, answer these questions:

1. **What problem are you solving?**
   - Who experiences this problem?
   - What happens if we don't solve it?

2. **What's your proposed solution?**
   - High-level approach (2-3 sentences)
   - Key components or services involved

3. **What's the expected scale?**
   - Users per month
   - Transactions per day
   - Data storage needs

Write 2-3 sentences capturing this. This becomes your spec's Overview section.

**Example:**

> Stripe payment integration for e-commerce checkout, enabling secure credit card
> processing with real-time authorization, refund handling, and PCI-compliant
> data handling through Stripe Elements.

---

### Step 2: Create Spec from Template

1. Copy the spec template:

```bash
cp .specs/templates/spec-template.md .specs/examples/your-feature-name.md
```

2. Fill in the Overview section:
   - Feature name
   - Author and date
   - Problem statement
   - Proposed solution

3. Set status to "Draft"

**File naming convention:** Use lowercase with hyphens: `stripe-payments.md`, `user-auth.md`, `notification-service.md`

---

### Step 3: Security Assessment

**Time:** ~5 minutes

1. In Claude Code, type: `/cloud-security`

2. When Jordan (Security Reviewer) greets you, provide:
   - Your feature description from Step 1
   - Any specific security concerns you have

3. Request a STRIDE threat model:
   > "Please provide a STRIDE threat model for this feature."

4. Copy the STRIDE table to your spec's Security section

5. Complete additional security sections:
   - Trust boundaries (where data crosses security zones)
   - Data classification (PII, sensitive, internal, public)

**Verify before moving on:**
- [ ] All 6 STRIDE categories have specific threats (not "N/A")
- [ ] Each mitigation is actionable (not "use encryption")
- [ ] Trust boundary diagram shows data flow
- [ ] Data classification table is complete

**Reference:** See `.specs/examples/stripe-payments.md` for a complete security section.

---

### Step 4: Cost Estimate

**Time:** ~5 minutes

1. In Claude Code, type: `/cloud-cost`

2. When Taylor (Cost Optimizer) greets you, provide:
   - Feature requirements from Step 1
   - Expected scale (users, transactions, storage)
   - Cloud provider (AWS, GCP, Azure)
   - Any third-party services (e.g., Stripe, Twilio)

3. Request a cost breakdown:
   > "Please estimate monthly cloud costs for this feature."

4. Copy to your spec's Cost section:
   - Cost breakdown table (all components)
   - Total monthly cost
   - Assumptions section (critical!)
   - Optimization opportunities

**Verify before moving on:**
- [ ] All major components have cost entries
- [ ] Monthly total is calculated
- [ ] Assumptions are documented (traffic, storage, users)
- [ ] At least one optimization opportunity identified

**Important:** Third-party fees (like Stripe's 2.9% + $0.30) are often the largest cost. Don't forget them!

**Reference:** See `.specs/examples/stripe-payments.md` for a complete cost section.

---

### Step 5: Test Scenarios

**Time:** ~10 minutes

Write Gherkin scenarios covering all required categories:

| Category | Minimum | Purpose |
|----------|---------|---------|
| Happy Path | 2 | Primary success flows |
| Error Cases | 2 | Graceful failure handling |
| Edge Cases | 1 | Boundary conditions |
| Security | 1 | Auth/authz/validation |
| **Total** | **6** | Minimum coverage |

**Gherkin format:**

```gherkin
Feature: [Feature Name]

  Background:
    Given [common precondition]
    And [additional setup]

  Scenario: [Descriptive name - what is being tested]
    Given [initial state]
    When [user action]
    Then [expected outcome]
    And [additional verification]
```

**Good scenario characteristics:**
- Uses business language (not technical implementation)
- Tests ONE specific behavior
- Is independent (no shared state with other scenarios)
- Has a descriptive name explaining what's being tested

**Bad scenario examples to avoid:**
- Testing multiple behaviors in one scenario
- Named "Test 1", "Test 2" instead of descriptive names
- Contains API paths, SQL queries, or response formats
- Depends on another scenario's outcome

**Verify before moving on:**
- [ ] At least 6 scenarios total
- [ ] Happy path: 2+ scenarios
- [ ] Error cases: 2+ scenarios
- [ ] Edge cases: 1+ scenarios
- [ ] Security: 1+ scenarios
- [ ] All scenarios use Gherkin format

**Reference:** See `.specs/examples/stripe-payments.md` for complete test scenarios.

---

### Step 6: Validate

Run the verification script:

```bash
./scripts/verify-spec.sh
```

**What it checks:**
1. Pre-commit hooks (security scanning, formatting)
2. Test framework execution (if applicable)

**Expected output:**

```
=== SpecFlow Verification ===

1. Running pre-commit hooks...
   [PASS] Pre-commit hooks passed

2. Detecting test framework...
   [SKIP] No test framework detected (this is OK for spec-only repos)

=== Verification Summary ===
All checks passed!
```

**If verification fails:**
- Pre-commit hooks failed: Run `pre-commit run --all-files` for details
- Security scan failed: Check for secrets or sensitive data
- Review the specific error and fix before proceeding

---

### Step 7: Submit for Review

1. Update spec status to "Review"

2. Create a PR with your spec changes:
   - Title: `spec: Add [feature-name] specification`
   - Description: Brief summary of the feature

3. Request review from:
   - Security team member (for STRIDE review)
   - Tech lead (for cost and architecture review)

4. Address feedback and iterate

5. Once approved, update status to "Approved"

---

## Work Type Classification

Not every change needs full three-pillar analysis. Use this classification to determine scope:

### Classification Table

| Work Type | Examples | Security | Cost | Min Scenarios |
|-----------|----------|----------|------|---------------|
| **Quick** | Bug fix, typo, config change | Skip | Skip | 1-2 |
| **Standard** | New feature, new endpoint | Light | Optional | 6 |
| **Complex** | New service, payment integration, infrastructure | Full | Required | 10+ |

### Decision Tree

```
Is it a bug fix, typo, or cosmetic change?
  |
  +-- YES --> Quick (skip Security/Cost, 1-2 scenarios)
  |
  +-- NO --> Does it add new user-facing functionality?
              |
              +-- YES --> Does it involve new services, APIs, or infrastructure?
              |            |
              |            +-- YES --> Complex (full analysis, 10+ scenarios)
              |            |
              |            +-- NO --> Standard (light security, 6 scenarios)
              |
              +-- NO --> Quick (skip Security/Cost, 1-2 scenarios)
```

### Quick Work

For quick work (bug fixes, typos, config changes):
- Skip Security and Cost sections
- Write 1-2 test scenarios covering the fix
- Run `./scripts/verify-spec.sh`
- Create PR directly

### Standard Work

For standard features:
- Run `/cloud-security` for a light STRIDE review
- Cost section is optional (include if there are infrastructure changes)
- Write 6+ Gherkin scenarios
- Full verification and PR process

### Complex Work

For complex integrations (payments, new services, infrastructure):
- Full STRIDE threat model (12+ threats recommended)
- Full cost breakdown with assumptions
- 10+ Gherkin scenarios
- Consider security team review before implementation

---

## FAQ

### Security Questions

**Q: What if the security agent doesn't address my specific threat?**

A: Add it manually. The agent provides a starting point. If you know of a specific threat (e.g., a particular attack vector for your domain), add a row to the STRIDE table. Include:
- Threat ID following the pattern (S.1, T.1, etc.)
- Specific threat description
- Actionable mitigation

**Q: Do I need to implement all mitigations before starting code?**

A: No. The STRIDE table documents threats and mitigations for the feature. Implement mitigations as part of the development work. The spec ensures threats are identified upfront, not that they're all solved before coding.

---

### Cost Questions

**Q: What if my feature doesn't have cloud costs?**

A: Some features have minimal or no direct cloud costs. In this case:
- Include a Cost section stating "No significant infrastructure costs"
- Document any third-party service costs
- Document any operational costs (human time, maintenance)

**Q: How do I know if I need Cost review?**

A: You need Cost review if your feature:
- Adds new cloud services (Lambda, RDS, S3, etc.)
- Increases traffic to existing services significantly
- Adds third-party services with per-use pricing
- Changes data retention or storage requirements

---

### Testing Questions

**Q: Can I use fewer than 6 scenarios?**

A: For Quick work (bug fixes, typos), yes - 1-2 scenarios is fine. For Standard and Complex work, 6 is the minimum. More complex features should have 10+ scenarios.

**Q: Do I need to implement the tests before creating the spec?**

A: No. The Gherkin scenarios define acceptance criteria. They describe WHAT the feature should do, not HOW to test it. Actual test implementation happens during development.

**Q: Can I use a different testing format?**

A: Gherkin is required for spec scenarios because it's human-readable and defines behavior from a user perspective. You can use any test framework for implementation (Jest, pytest, etc.), but spec scenarios must be in Gherkin format.

---

### Process Questions

**Q: What if pre-commit hooks fail?**

A: Pre-commit hooks catch security issues and formatting problems. Common failures:
- **Gitleaks/TruffleHog:** Secret detected - remove the secret
- **Semgrep:** Security pattern violation - fix the flagged code
- **Trailing whitespace:** Run `pre-commit run --all-files` to auto-fix

**Q: Where do I save agent outputs?**

A: Agent outputs are copied directly into your spec file:
- `/cloud-security` output goes in the Security Assessment section
- `/cloud-cost` output goes in the Cost Estimate section

The `docs/security-assessment.md` and `docs/cost-analysis.md` files are examples/templates, not destinations for your output.

**Q: What if I'm not sure about the work type classification?**

A: When in doubt, go one level up. If you're unsure between Quick and Standard, do Standard. If you're unsure between Standard and Complex, do Complex. It's better to over-document than under-document.

---

## Reference Example

For a complete example of a three-pillar spec, see:

**`.specs/examples/stripe-payments.md`**

This example demonstrates:
- 12 STRIDE threats (2 per category)
- Complete trust boundary diagram
- Data classification table
- Monthly cost breakdown with Stripe fees
- 8 Gherkin scenarios across all categories
- Complete acceptance criteria checklist

Use this as your reference when creating new specs.

---

## Checklist Summary

Before submitting your spec for review:

### Security (Pillar 1)
- [ ] STRIDE table has all 6 categories with specific threats
- [ ] Each mitigation is actionable (not generic)
- [ ] Trust boundaries documented
- [ ] Data classification complete

### Cost (Pillar 2)
- [ ] Cost table includes all major components
- [ ] Monthly total calculated
- [ ] Assumptions documented (traffic, storage, users)
- [ ] At least one optimization opportunity identified

### Testing (Pillar 3)
- [ ] Happy path: 2+ scenarios
- [ ] Error cases: 2+ scenarios
- [ ] Edge cases: 1+ scenarios
- [ ] Security: 1+ scenarios
- [ ] Total: 6+ scenarios minimum

### Validation
- [ ] `./scripts/verify-spec.sh` passes
- [ ] No TBD or placeholder content
- [ ] Status set to "Review"

---

## Getting Help

- **Security questions:** Run `/cloud-security` and ask Jordan
- **Cost questions:** Run `/cloud-cost` and ask Taylor
- **Process questions:** Check this guide or ask your tech lead
- **Template issues:** See `.specs/templates/spec-template.md`

---

*SpecFlow: Security, Cost, and Testing - every feature, every time.*
