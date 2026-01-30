# /sf:dev-story - Develop a Story

Wraps BMAD `/dev-story` with TDD workflow.

## Usage

```
/sf:dev-story <story-id>
```

## SpecFlow Context

Development with:
- TDD-first approach
- Ralph loop integration
- Acceptance criteria verification

## Prerequisites

- Story created (/sf:create-story)
- Test architecture completed (/sf:tea)

## Workflow

1. Write tests from acceptance criteria
2. Run Ralph loop (/sf:implement)
3. Verify all criteria pass

## TDD Flow

```
Acceptance Criteria
        |
        v
   Write Tests (RED)
        |
        v
   /sf:implement (Ralph)
        |
        v
   Tests Pass (GREEN)
        |
        v
   Refactor if needed
        |
        v
   /sf:code-review
```

## Parallel Execution

When PM orchestrates:
- Dev implements features (this command)
- QA writes additional tests
- Both run in parallel worktrees
- Checkpoint merge when both signal ready

## Criteria Markers

Add markers in code for traceability:
```typescript
// CRITERIA: AC-001 - Email validates against RFC 5322
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

## Related

- `/dev-story` - Original BMAD
- `/sf:tea` - Previous step
- `/sf:implement` - TDD loop
- `/sf:code-review` - Next step
