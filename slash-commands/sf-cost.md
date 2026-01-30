# /sf:cost - Cost Analysis (Taylor)

Wraps BMAD `/cloud-cost` (Taylor) with SpecFlow file protocol.

## Usage

```
/sf:cost
/sf:cost <feature-description>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Requirements context
3. `.specflow/features/{slug}/2-architecture.md` - Architecture to cost
</required_reading>

<constraints>
Extract from prior outputs and honor:
- Architecture decisions (from 2-architecture.md)
- Scale requirements (from 1-spec.md)
- Existing infrastructure (from 2-architecture.md)
</constraints>

<output>
After completing analysis:

1. Write output to `.specflow/features/{slug}/4-cost.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - Cost (/sf:cost)

   **Work Done:**
   - [Summary of cost analysis]

   **Output:** `4-cost.md`

   **Constraints Honored:**
   - [List constraints from 1-spec.md and 2-architecture.md]

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: cost
   - next-agent: tea
</output>

## Output Format (4-cost.md)

```markdown
---
agent: cost
created: {iso-timestamp}
depends_on: ["1-spec.md", "2-architecture.md"]
status: draft
---

# {Feature Name} Cost Analysis

## Summary

{2-3 sentence summary of cost impact}

## Cost Breakdown

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| {component} | {AWS/GCP/etc} | ${amount} | {notes} |

## Assumptions

- {List assumptions about usage, scale, etc.}

## Optimizations

- {Potential cost savings}

## Constraints for Downstream

- {Cost limits dev must honor}
- {Resource constraints}

## Open Questions

- {Any unresolved items for PM review}
```

## Related

- `/cloud-cost` - Original BMAD Taylor agent
- `/sf:security` - Prior in pillar sequence (3-security.md)
- `/sf:tea` - Next in pillar sequence
