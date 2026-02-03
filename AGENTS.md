# SpecFlow

## Project Overview

SpecFlow is a **PM-orchestrated, BMAD-powered** AI development methodology. The PM agent orchestrates automated workflows while leveraging BMAD's expertise (methodology, frameworks, elicitation techniques) for high-quality outputs.

**Core Architecture:**
```
User → PM (orchestrator) → Agents (automated) → PM (review) → User (big decisions only)
```

## Key Concepts

### PM as Brain
- PM (`/sf:pm`) orchestrates all workflows
- PM decides when to engage user (big decisions only)
- PM routes work to agents automatically
- PM reviews outputs before routing forward

### Expertise Layer
- SpecFlow provides methodology via `.specflow-lib/`
- Agents read `.specflow-lib/expertise/` for frameworks and checklists
- Agents adopt `.specflow-lib/personas/` for communication style
- PM uses elicitation techniques when engaging users

### Proportional Ceremony
- Scope level (trivial → complex) determines depth of work
- Small features skip security/cost analysis
- Large features get full pillar coverage
- PM confirms scope with user for medium+ features

## The Pillars (Scope-Dependent)

| Pillar | Agent | When Applied |
|--------|-------|--------------|
| Security | `/sf:security` (Jordan) | medium+ scope |
| Cost | `/sf:cost` (Taylor) | medium+ scope |
| Testing | `/sf:tea` | All scopes (depth varies) |

## Project Structure

```
.specflow/                    # SpecFlow state and features
├── STATE.md                  # Current session state
├── config.json               # Configuration
├── features/{slug}/          # Feature working directory
│   ├── 0-triage.md           # PM triage output
│   ├── 0-scope.md            # Scope assessment
│   ├── 1-spec.md             # Analyst requirements
│   ├── 1.5-codebase-constraints.md  # Analyst codebase analysis (TC, IP)
│   ├── 2-architecture.md     # Architect design (reads 1.5)
│   ├── 3-security.md         # Security analysis (if applicable)
│   ├── 4-cost.md             # Cost analysis (if applicable)
│   ├── 5-test-plan.md        # Test scenarios
│   ├── 5-requirements-lock.md  # PM synthesized requirements (frozen)
│   ├── 6-dev-output.md       # Dev implementation output
│   ├── 7-qa-output.md        # QA test output
│   ├── drift/                # Drift detection files (v2.3)
│   ├── PROGRESS.md           # Work log
│   └── STATUS.md             # Approval status

.specflow-lib/                # SpecFlow methodology (immutable library)
├── personas/                 # Agent personas (name, role, style, principles)
├── methodology/              # Framework methodology (STRIDE, BOSS, etc.)
└── expertise/                # Extracted methodology for agents
    ├── agent-pattern.md      # Standard agent architecture
    ├── scoping/              # Scope assessment methodology
    ├── requirements/         # Requirements writing (BOSS criteria)
    ├── elicitation/          # PM's toolkit for user engagement
    ├── discovery/            # Project classification
    └── synthesis/            # Requirements synthesis (v2.3)
        ├── codebase-analysis.md   # Tech stack, patterns, integration points
        └── requirements-lock.md   # Lock format (FR/TC/SC/AC/IP)

.claude/commands/             # Slash commands
├── sf-pm.md                  # PM orchestrator
├── sf-analyst.md             # Requirements (Mary)
├── sf-architect.md           # Architecture (Winston)
├── sf-security.md            # Security (Jordan)
├── sf-cost.md                # Cost (Taylor)
├── sf-dev.md                 # Development (Amelia)
├── sf-qa.md                  # Quality (Quinn)
└── sf-tea.md                 # Test Engineering

.planning/                    # GSD planning phases
├── PROJECT.md                # Project definition
├── ROADMAP.md                # Phase roadmap
├── STATE.md                  # GSD state
└── phases/                   # Phase plans and summaries
```

## Commands

### Primary Commands
```bash
/sf:pm              # Start PM orchestrator (main entry point)
/sf:pm "feature"    # Start new feature workflow
```

### Agent Commands (PM routes to these)
```bash
/sf:analyst         # Requirements analysis
/sf:architect       # Architecture design
/sf:security        # Security analysis (STRIDE)
/sf:cost            # Cost analysis
/sf:tea             # Test engineering
/sf:dev             # Development
/sf:qa              # Quality assurance
```

### Utility Commands
```bash
/sf:agents          # List available agents
/sf:sync            # Sync state with tracker
```

## Scope Levels

| Level | Files | Pillars | Example |
|-------|-------|---------|---------|
| trivial | 1 | None | Fix typo |
| small | 1-3 | Testing | Logout button |
| medium | 3-10 | Security + Testing | New endpoint |
| large | 10+ | All | Payment integration |
| complex | Many | All + Research | New service |

## Agent Pattern

All agents follow the same pattern (see `.specflow-lib/expertise/agent-pattern.md`):

1. **Load Context**: STATE.md, 0-triage.md, 0-scope.md
2. **Load Persona**: From `.specflow-lib/personas/`
3. **Load Expertise**: From `.specflow-lib/expertise/`
4. **Execute Autonomously**: Apply methodology, match depth to scope
5. **Write Output**: To `.specflow/features/{slug}/`
6. **Return to PM**: PM reviews and routes

### v2.3 Agent Enhancements

- **Analyst**: Does codebase analysis (tech stack, patterns, integration points), writes `1.5-codebase-constraints.md`
- **Architect**: Reads `1.5-codebase-constraints.md` as input, designs aligned with codebase reality
- **PM**: Synthesizes all outputs into `5-requirements-lock.md`, runs drift checkpoints after Dev and QA
- **Dev/QA**: Return to PM (not route directly) to enable drift detection

## Code Style

- Markdown: ATX headers (#), code fence language hints
- Specs: Follow BOSS criteria (Binary, Observable, Specific, Scope-bound)
- Commit format: `type(scope): description`
  - Types: feat, fix, docs, refactor, test, chore

## Git Workflow

- Run `pre-commit run --all-files` before committing
- Never commit with `--no-verify`
- Create PRs for all changes to main branch

## Boundaries

### Always Do
- Use PM as entry point for features (`/sf:pm`)
- Match ceremony depth to scope level
- Return agent outputs to PM for review
- Use BOSS criteria for acceptance criteria
- Apply STRIDE for security analysis (medium+ scope)

### Ask First
- Modifying `.specflow-lib/` content
- Adding new agents
- Changing scope level definitions
- Modifying PM routing logic

### Never Do
- Bypass PM orchestration (agents route back to PM)
- Skip scope assessment for features
- Over-engineer trivial/small scope features
- Commit secrets or credentials
- Bypass security hooks
