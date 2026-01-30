# /sf:security - Security Analysis (Jordan)

Wraps BMAD `/cloud-security` (Jordan) with SpecFlow file protocol.

## Usage

```
/sf:security
/sf:security <feature-description>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Requirements context
3. `.specflow/features/{slug}/2-architecture.md` - Architecture to secure
</required_reading>

<constraints>
Extract from prior outputs and honor:
- Architecture patterns (from 2-architecture.md)
- Acceptance criteria requiring security (from 1-spec.md)
- Existing security decisions (from 2-architecture.md)
</constraints>

<output>
After completing analysis:

1. Write output to `.specflow/features/{slug}/3-security.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - Security (/sf:security)

   **Work Done:**
   - [Summary of security analysis]

   **Output:** `3-security.md`

   **Constraints Honored:**
   - [List constraints from 1-spec.md and 2-architecture.md]

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: security
   - next-agent: cost
</output>

## Output Format (3-security.md)

```markdown
---
agent: security
created: {iso-timestamp}
depends_on: ["1-spec.md", "2-architecture.md"]
status: draft
---

# {Feature Name} Security Assessment

## Summary

{2-3 sentence summary of security posture}

## STRIDE Analysis

| Category | Threat | Mitigation | Priority |
|----------|--------|------------|----------|
| Spoofing | {threat} | {mitigation} | {H/M/L} |
| Tampering | {threat} | {mitigation} | {H/M/L} |
| Repudiation | {threat} | {mitigation} | {H/M/L} |
| Info Disclosure | {threat} | {mitigation} | {H/M/L} |
| Denial of Service | {threat} | {mitigation} | {H/M/L} |
| Elevation of Privilege | {threat} | {mitigation} | {H/M/L} |

## Trust Boundaries

{ASCII diagram of trust boundaries}

## Constraints for Downstream

- {Security requirements dev must implement}
- {Logging/audit requirements}

## Open Questions

- {Any unresolved items for PM review}
```

## Related

- `/cloud-security` - Original BMAD Jordan agent
- `/sf:architect` - Prior in pillar sequence (2-architecture.md)
- `/sf:cost` - Next in pillar sequence
