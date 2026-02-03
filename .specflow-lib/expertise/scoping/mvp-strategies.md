# MVP Strategy Framework

Extracted from BMAD step-08-scoping.md for autonomous agent use.

## MVP Philosophy Options

When scoping a feature, consider which MVP approach fits:

### 1. Problem-Solving MVP
**Goal:** Prove the core problem can be solved

**Characteristics:**
- Minimal UI, maximum functionality
- "Does it work?" over "Is it pretty?"
- Single user flow, no edge cases initially

**Best for:** Technical innovations, algorithm-based features, automation

**Example:** Password reset that works via CLI before adding UI

### 2. Experience MVP
**Goal:** Validate the user experience is valuable

**Characteristics:**
- Beautiful UI, limited functionality
- "Does it feel right?" over "Does it scale?"
- Focus on primary happy path

**Best for:** Consumer apps, UX-critical features, design-led products

**Example:** Password reset with polished UI but only email method

### 3. Platform MVP
**Goal:** Establish foundation for future features

**Characteristics:**
- Architecture over features
- "Can we build on this?" over "Is it complete?"
- Infrastructure and patterns first

**Best for:** Platform products, extensible systems, API-first products

**Example:** Password reset as first auth flow establishing patterns for all future auth

### 4. Revenue MVP
**Goal:** Validate willingness to pay

**Characteristics:**
- Payment integration early
- "Will they pay?" over "Will they use?"
- Monetization mechanism included

**Best for:** SaaS products, paid features, premium tiers

**Example:** Password reset as part of paid account recovery service

## Must-Have vs Nice-to-Have Analysis

For each feature, categorize requirements:

### Must-Have Criteria
Ask these questions:
- Without this, does the feature fail its core purpose?
- Would early adopters reject the feature without this?
- Is this a deal-breaker for the primary user journey?
- Can this NOT be done manually as a workaround?

If YES to any → Must-Have

### Nice-to-Have Criteria
These can wait:
- Enhancements that aren't essential to core value
- Secondary user types or personas
- Edge case handling beyond critical errors
- Performance optimizations beyond "acceptable"
- Additional methods/options (e.g., SMS reset when email works)

### Deferred Criteria
Explicitly out of scope for this version:
- Features that require other features first
- Scale optimizations for traffic we don't have
- Enterprise features before SMB validation
- Integrations before core product works

## Progressive Feature Roadmap

Structure scope across phases:

### Phase 1: MVP
- Core user value delivery
- Essential user journey (one path)
- Basic functionality that works reliably
- Minimum viable security/compliance

### Phase 2: Growth
- Additional user types/personas
- Enhanced features (more options, methods)
- Scale improvements
- Secondary journeys

### Phase 3: Expansion
- Advanced capabilities
- Platform features (API, integrations)
- New markets or use cases
- Enterprise features

## Scope Boundaries Template

For medium+ scope features, document:

```markdown
## MVP Boundaries

### In Scope (Phase 1)
- {Essential capability 1}
- {Essential capability 2}
- {Minimum viable version of X}

### Out of Scope (Phase 2+)
- {Enhancement for later}
- {Additional method/option}
- {Scale optimization}

### Explicitly NOT Building
- {Feature creep item 1}
- {Related but separate feature}
```

## Red Flags: Over-Scoping

Watch for these signals that scope is too ambitious:

1. **"While we're at it..."** - Scope creep phrase
2. **Multiple user types in MVP** - Pick one first
3. **Multiple methods/options** - Start with one that works
4. **"Future-proofing"** - YAGNI (You Aren't Gonna Need It)
5. **Enterprise features early** - Validate with SMB first
6. **Perfect error handling** - Handle critical errors, log others

## Red Flags: Under-Scoping

Watch for these signals that scope is too minimal:

1. **Security shortcuts** - Auth is never "trivial"
2. **No error handling** - At least handle critical failures
3. **Assuming happy path only** - Include 1-2 key error cases
4. **Ignoring compliance** - Know your regulatory requirements
5. **"We'll add tests later"** - Basic testing is always in scope
