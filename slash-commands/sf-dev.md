# /sf:dev - Development Tasks

Wraps BMAD `/dev` with SpecFlow file protocol and constraint enforcement.

## Usage

```
/sf:dev
/sf:dev <task-description>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Acceptance criteria to implement
3. `.specflow/features/{slug}/2-architecture.md` - Architecture decisions to follow
4. `.specflow/features/{slug}/3-security.md` - Security constraints to honor
5. `.specflow/features/{slug}/4-cost.md` - Cost/resource constraints (if exists)

Replace {slug} with the feature slug from STATE.md.
</required_reading>

<constraints>
Extract from required reading and list explicitly before coding:

**Architecture Constraints (from 2-architecture.md):**
- [List key architecture decisions that must be followed]
- [API patterns, data models, component boundaries]

**Security Constraints (from 3-security.md):**
- [List required mitigations from STRIDE table]
- [Trust boundaries that must be enforced]
- [Logging/audit requirements]

**Cost Constraints (from 4-cost.md):**
- [Resource limits]
- [Performance bounds]
- [Infrastructure restrictions]

You MUST list these constraints in your output before showing any code.
</constraints>

<output>
After completing implementation:

1. Write summary to `.specflow/features/{slug}/6-dev-output.md` (optional, for complex work)
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - Dev (/sf:dev)

   **Work Done:**
   - [Summary of implementation]
   - [Files created/modified]

   **Output:** `6-dev-output.md` (or "inline - see code changes")

   **Constraints Honored:**
   - [Architecture]: {how you followed 2-architecture.md}
   - [Security]: {how you implemented 3-security.md mitigations}
   - [Cost]: {how you stayed within 4-cost.md limits}

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: dev
   - next-agent: qa
   - phase: execution
</output>

## TDD Workflow

```
1. Write test (RED) - based on acceptance criteria from 1-spec.md
2. Run test - fails
3. Write minimal code (GREEN) - following constraints
4. Run test - passes
5. Refactor if needed - maintaining constraints
```

## Output Format (6-dev-output.md)

For complex implementations, create:

```markdown
---
agent: dev
created: {iso-timestamp}
depends_on: ["2-architecture.md", "3-security.md", "4-cost.md"]
status: draft
---

# {Feature Name} Implementation

## Summary

{2-3 sentence summary of what was built}

## Constraints Honored

### Architecture (from 2-architecture.md)
- {constraint}: {how honored}

### Security (from 3-security.md)
- {mitigation}: {how implemented}

### Cost (from 4-cost.md)
- {limit}: {how stayed within}

## Files Modified

| File | Change |
|------|--------|
| {path} | {description} |

## Testing Notes

- {How to test the implementation}
- {Edge cases to verify}

## Open Questions

- {Any issues for QA or PM}
```

## Parallel Execution

When invoked by PM orchestrator:
- Dev and QA may work in parallel
- Dev implements features following constraints
- QA writes tests from 5-test-plan.md
- Checkpoint merge when both complete

## Related

- `/dev` - Original BMAD dev
- `/sf:implement` - Ralph TDD loop
- `/sf:qa` - Quality assurance (may run in parallel)
- `/sf:pm` - PM orchestrator
