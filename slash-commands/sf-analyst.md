# /sf:analyst - Requirements Analysis

Wraps BMAD `/analyst` with SpecFlow file protocol.

## Usage

```
/sf:analyst
/sf:analyst <feature-description>
```

## File Protocol

<required_reading>
Before starting work, read:

1. `.specflow/STATE.md` - Get current feature slug and context
</required_reading>

<output>
After completing analysis:

1. Write output to `.specflow/features/{slug}/1-spec.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - Analyst (/sf:analyst)

   **Work Done:**
   - [Summary of requirements analysis]

   **Output:** `1-spec.md`

   **Constraints Honored:** N/A (first agent)

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: analyst
   - next-agent: architect
   - phase: pillars
</output>

## Output Format (1-spec.md)

```markdown
---
agent: analyst
created: {iso-timestamp}
depends_on: []
status: draft
---

# {Feature Name} Spec

## Summary

{2-3 sentence summary}

## User Stories

- As a {role}, I want to {action}, so that {benefit}

## Acceptance Criteria

- [ ] AC-01: {BOSS-compliant criterion}
- [ ] AC-02: {BOSS-compliant criterion}

## Constraints for Downstream

- {Constraints architect/security/cost must honor}

## Open Questions

- {Any unresolved items for PM review}
```

## BOSS Criteria

All acceptance criteria must be:
- **B**inary: Pass/fail (no partial credit)
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values, thresholds, counts
- **S**cope-bound: This feature only

## Related

- `/analyst` - Original BMAD analyst
- `/sf:pm` - PM orchestrator (routes to analyst)
- `/sf:architect` - Next in pillar sequence
