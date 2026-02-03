# Skill Detection

How SpecFlow agents discover and invoke skills dynamically.

## Overview

Skills are discovered and matched using the skill-detector agent. Any agent can spawn skill-detector to find skills matching specific capabilities, scope levels, or file patterns.

## Architecture

```
Consumer (sf-review, sf-pm, etc.)
    |
    v
Task: skill-detector
    |
    +-- Read agents.json (skill registry)
    |
    +-- Read SKILL.md frontmatter (capabilities, triggers)
    |
    +-- Match against context (scope, pillars, files)
    |
    v
Matched Skills Table (markdown)
    |
    v
Consumer spawns matched skills
```

## Skill Registration

Skills are registered in `agents.json` at project root:

```json
{
  "agents": {
    "skill-name": {
      "source": "skill",
      "invoke": ".specflow/skills/skill-name",
      "description": "What this skill does"
    }
  }
}
```

- `source: "skill"` - Identifies this as an installed skill
- `invoke` - Path to skill directory (contains SKILL.md)
- `description` - Used for discovery, not matching

## Capability System

Skills declare capabilities in SKILL.md frontmatter:

```yaml
---
name: skill-name
description: What this skill does
review-capable: true        # Can be used for code review
report-capable: false       # Can generate reports (future)
presentation-capable: false # Can generate presentations (future)
scope-minimum: small        # Minimum scope to trigger
triggers:
  files:
    - "*.ts"
    - "src/**/*"
  patterns:
    - "export\\s+function"
---
```

### Current Capabilities

| Capability | Description | Used By |
|------------|-------------|---------|
| `review-capable` | Can review code/tests | sf-review |

### Future Capabilities (Phase 27+)

| Capability | Description | Used By |
|------------|-------------|---------|
| `report-capable` | Can generate status reports | sf-pm |
| `presentation-capable` | Can create presentations | sf-pm |
| `test-capable` | Can generate test cases | sf-tea |

## Using skill-detector

### From sf-review (current pattern)

```markdown
Task: skill-detector

<detection_context>
## Input

capability_filter: review-capable
scope: medium
pillars: [security, testing]
changed_files:
  - src/auth/login.ts
  - src/api/users.ts
</detection_context>
```

### From sf-pm (future pattern)

```markdown
Task: skill-detector

<detection_context>
## Input

capability_filter: report-capable
scope: large
pillars: []
changed_files: []
</detection_context>
```

### From any agent

Any agent can spawn skill-detector with appropriate context:
1. Set `capability_filter` to desired capability
2. Provide scope, pillars, files as applicable
3. Parse returned markdown tables
4. Spawn matched skills with methodology

## Detection Algorithm

skill-detector matches skills in this order:

1. **Capability Filter** - Skip skills lacking requested capability
2. **Pillar Binding** - Include if skill's pillar is selected
3. **Scope Minimum** - Include if context scope >= skill minimum
4. **File Patterns** - Include if any file matches glob pattern
5. **Code Patterns** - Include if file content matches regex

First match wins - a skill only appears once in results.

## Trigger Patterns

### File Patterns (glob)

```yaml
triggers:
  files:
    - "*.ts"           # All TypeScript files
    - "*.tsx"          # All React TypeScript files
    - "src/**/*"       # All files in src/
    - "*.sql"          # SQL files
    - "prisma/**/*"    # Prisma files
```

### Code Patterns (regex)

```yaml
triggers:
  patterns:
    - "SELECT\\s+.*FROM"      # SQL queries
    - "export\\s+function"    # Exported functions
    - "async\\s+function"     # Async functions
    - "describe\\(|it\\("     # Test files
```

**Security:** Patterns over 200 chars or with nested quantifiers are skipped (ReDoS protection).

## Internal Skills

Pillar-bound skills (security, architecture) are handled specially:
- No SKILL.md exists
- Bound to pillar selection
- Methodology loaded from BMAD source
- Returned with `source: "internal"`

## Adding New Capabilities

To add a new capability type:

1. Add capability flag to existing SKILL.md files:
   ```yaml
   report-capable: true
   ```

2. Update consumers to request the capability:
   ```yaml
   capability_filter: report-capable
   ```

No code changes required - capability system is YAML-driven.

## Related Files

- `.specflow/agents/skill-detector.md` - Detection agent
- `agents.json` - Skill registry
- `.specflow/skills/*/SKILL.md` - Skill definitions
- `.claude/commands/sf-review.md` - Review consumer

## Deprecated

The CLI-based detection (`sf review detect`) is deprecated.
`src/review/detection.ts` is kept for testing only.

---

<!-- Extensibility verified: Added report-capable: false to integration-review/SKILL.md.
     skill-detector correctly filters it out when capability_filter: report-capable.
     No code changes required - YAML-driven capability system works. -->
