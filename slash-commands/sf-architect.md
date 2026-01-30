# /sf:architect - Architecture Design

Wraps BMAD `/architect` with SpecFlow file protocol.

## Usage

```
/sf:architect
/sf:architect <feature-description>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Requirements to design for
</required_reading>

<constraints>
Extract from 1-spec.md and honor:
- User stories (what to design for)
- Acceptance criteria (what must be achievable)
- Constraints for downstream (previous decisions)
</constraints>

<output>
After completing design:

1. Write output to `.specflow/features/{slug}/2-architecture.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - Architect (/sf:architect)

   **Work Done:**
   - [Summary of architecture decisions]

   **Output:** `2-architecture.md`

   **Constraints Honored:**
   - [List constraints from 1-spec.md that were followed]

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: architect
   - next-agent: security
</output>

## Output Format (2-architecture.md)

```markdown
---
agent: architect
created: {iso-timestamp}
depends_on: ["1-spec.md"]
status: draft
---

# {Feature Name} Architecture

## Summary

{2-3 sentence summary of architecture decisions}

## Key Decisions

### Decision 1: {Title}
- **Context:** {Why this decision was needed}
- **Decision:** {What was decided}
- **Consequences:** {Trade-offs}

## Component Design

{Technical design details}

## Constraints for Downstream

- {Constraints security/cost/dev must honor}

## Open Questions

- {Any unresolved items for PM review}
```

## Related

- `/architect` - Original BMAD architect
- `/sf:analyst` - Prior in pillar sequence (1-spec.md)
- `/sf:security` - Next in pillar sequence
