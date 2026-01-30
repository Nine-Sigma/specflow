# /sf:tea - Test Architect

Wraps BMAD `/tea` (test architect) with SpecFlow test patterns.

## Usage

```
/sf:tea
/sf:tea <feature-description>
```

## SpecFlow Context

This command invokes BMAD's test architect with additional context:
- BOSS-validated acceptance criteria
- Test pyramid awareness
- Security test requirements

## When to Use

- Before QA orchestration (/sf:pm routes tea -> qa)
- When designing test strategy for features
- After architecture decisions, before implementation

## Output Format

Test architecture includes:
- Test pyramid breakdown (unit/integration/e2e)
- Critical path test scenarios
- Security test requirements
- Test data requirements

## Test Pyramid

```
        /\
       /  \     E2E (few)
      /----\
     /      \   Integration (some)
    /--------\
   /          \ Unit (many)
  /__________\_\
```

| Level | Focus | Count |
|-------|-------|-------|
| Unit | Business logic | Many |
| Integration | API contracts | Some |
| E2E | Critical paths | Few |

## Trophy Testing (SpecFlow preference)

```
   ___________
  /           \   Static (types, lint)
 /-------------\
|               | Integration (most)
|_______________|
 \             /  Unit (focused)
  \___________/   E2E (critical paths)
```

## Related

- `/tea` - Original BMAD test architect
- `/sf:qa` - QA with BOSS validation
- `/sf:pm` - PM orchestrator (routes through tea)
