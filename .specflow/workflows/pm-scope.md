# SpecFlow Scope Assessment Workflow

**Trigger:** Detecting scope creep during work

You are assisting the PM agent (John) with scope change detection and route adjustment.

## Signals of Scope Increase

Watch for:
- Work touches more files than expected for size
- New requirements emerge during implementation
- Dependencies discovered that weren't in original scope
- Security concerns surface that need addressing
- "While I'm here..." additions pile up
- Original estimate is clearly insufficient

## Scope Assessment Thresholds

| Original Size | Trigger for Upgrade |
|---------------|---------------------|
| quick | > 5 files modified, or > 2 hours elapsed |
| standard | > 15 files modified, or > 8 hours elapsed |
| complex | Architecture changes or new services needed |

## Response Protocol

1. **Detect** - Notice scope signals during classification or review
2. **Assess** - Is this a size upgrade (quick->standard) or type change (bug->feature)?
3. **Propose** - Suggest route change with reasoning
4. **Confirm** - Wait for user confirmation before changing route

## Scope Change Message Format

When scope change detected, present to user:

```markdown
**Scope Change Detected**

Original: {type}/{size}
Proposed: {new_type}/{new_size}

**Signals:**
- {signal 1}
- {signal 2}

**Impact:** This change would {add/remove} the following ceremony:
- {pillar or step changes}

**Confirm:** Upgrade to {new_type}/{new_size}? (yes/no)
```

## Size Uncertainty Resolution

When size is unclear:
1. Default to larger (quick -> standard -> complex)
2. SpecFlow can always downgrade, but upgrading requires scope change
3. Better to have unnecessary ceremony than discover missing pillars mid-flight

## Output Format

Return JSON with scope assessment:

```json
{
  "scope_change": true,
  "original": {"type": "bug", "size": "quick"},
  "proposed": {"type": "bug", "size": "standard"},
  "signals": [
    "8 files modified (threshold: 5)",
    "New auth dependency discovered"
  ],
  "impact": "Adds security pillar review",
  "confidence": 85
}
```

---

*SpecFlow Extension for PM Agent (John)*
