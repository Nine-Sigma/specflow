# SpecFlow

## What This Is

SpecFlow is a security-first, cost-aware, test-driven AI development methodology. It's an orchestration layer that wires together existing tools (BMAD, MCP servers, security scanners) to enforce quality gates before code reaches production. Total custom code: ~120 lines of configs, templates, and one shell script.

## Core Value

Every feature addresses three pillars before code is written: Security (threat model), Cost (estimate), Testing (Gherkin scenarios). If any pillar is missing, the spec is incomplete.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Foundation
- [ ] BMAD installed with Creative Intelligence Suite
- [ ] Architecture expansion pack installed (`/cloud-security`, `/cloud-cost`)
- [ ] Directory structure created (`.specs/`, `.claude/skills/`, `scripts/`, `docs/`)
- [ ] `AGENTS.md` created with SpecFlow methodology instructions
- [ ] Symlinks for tool compatibility (`CLAUDE.md` → `AGENTS.md`)

#### Security Framework (Jordan)
- [ ] Pre-commit hooks configured (TruffleHog, Gitleaks)
- [ ] `/cloud-security` verified working
- [ ] Security section added to spec template (STRIDE threat model format)

#### Cost Framework (Taylor)
- [ ] `/cloud-cost` verified working
- [ ] Cost estimation cheat sheet created (reference doc)
- [ ] Cost section added to spec template

#### Testing Framework (QA)
- [ ] `scripts/verify-spec.sh` created (runs tests + security scan)
- [ ] Test section added to spec template (Gherkin format)
- [ ] Playwright MCP configured (optional — for E2E test generation)

#### Skills System
- [ ] `.claude/skills/` directory structure created
- [ ] Skills index file (`_index.md`) created
- [ ] At least one skill downloaded and working

#### Documentation
- [ ] Spec template finalized with all three pillars
- [ ] `docs/workflow.md` explaining end-to-end process
- [ ] `docs/commands.md` listing which BMAD commands to use when

### Out of Scope

- Custom agents — use BMAD's existing agents
- Custom slash commands — use BMAD's existing commands
- Custom MCP servers — configure existing servers only
- NPX distribution package — deferred to after core methodology works
- LLM-agnostic mode — v2 feature, design for it but don't implement

## Context

### Philosophy: "Glue, Don't Build"

Every component is an existing, maintained open-source project. Our contribution is intelligent orchestration through agent prompts, configuration files, and minimal shell scripts. We don't reinvent—we integrate.

| What Already Exists | What We Add |
|---------------------|-------------|
| BMAD agents (analyst, pm, architect, dev, qa) | Configuration |
| Architecture agents (security, cost) | Custom prompts |
| GitHub MCP, Slack MCP, Playwright MCP | Configuration |
| Semgrep, Bandit, TruffleHog, Gitleaks | Pre-commit config |

### The Three Pillars

| Pillar | Tagline | Agent | Gate |
|--------|---------|-------|------|
| Security | "Think before you ship" | Jordan (`/cloud-security`) | Threat model |
| Cost | "Know before you spend" | Taylor (`/cloud-cost`) | Cost estimate |
| Testing | "Prove before you merge" | QA + Gherkin | Tests pass |

### Agent Usage by Work Type

Not every change needs full review. Work is classified:

| Work Type | Security | Cost | E2E Tests | Example |
|-----------|----------|------|-----------|---------|
| Quick (bug fix) | None | No | Unit only | Fix typo |
| Standard (feature) | Light | No | Yes | Add filter |
| Complex (new service) | Full | Yes | Yes | New API |

Optional agents: `/cloud-architect` — skip for edits, debug, simple changes.

### The Workflow

```
Issue → /analyst → /cloud-security → /cloud-cost → Compile Spec → /dev → verify-spec.sh → Ship
```

Steps 3-5 are manual glue: copy agent outputs into spec template sections.

### LLM-Agnostic Design (v2 Prep)

The industry is converging on `AGENTS.md` as the universal instruction file format (20,000+ GitHub repos). Design for portability:

```bash
# One source of truth
AGENTS.md                    # Primary instruction file

# Symlinks for tool compatibility
ln -sf AGENTS.md CLAUDE.md
ln -sf AGENTS.md .cursorrules
```

Core SpecFlow is already portable:
- Spec template = just markdown
- Pre-commit hooks = no LLM needed
- verify-spec.sh = just shell
- AGENTS.md = industry standard

## Constraints

- **Code budget**: ~120 lines total (configs, one shell script, templates)
- **No custom agents**: Use BMAD's existing agents only
- **No custom commands**: Use BMAD's existing slash commands only
- **Portability**: Use AGENTS.md as primary instruction file, symlink for Claude

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use BMAD expansion pack for security/cost agents | Existing maintained tools vs. building custom | — Pending |
| Skills System required | Provides domain-specific knowledge without custom agents | — Pending |
| AGENTS.md as primary instruction file | Industry standard, enables v2 LLM-agnostic support | — Pending |
| Symlink CLAUDE.md → AGENTS.md | Backward compatibility while using universal format | — Pending |

---
*Last updated: 2026-01-26 after initialization*
