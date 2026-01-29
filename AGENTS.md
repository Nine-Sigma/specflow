# AGENTS.md

## Project Overview

SpecFlow is a security-first, cost-aware, test-driven AI development methodology. Every feature must address Security (STRIDE threat model), Cost (cloud cost estimate), and Testing (Gherkin scenarios) before code is written.

## The Three Pillars

| Pillar | Tagline | Agent | Output |
|--------|---------|-------|--------|
| Security | "Think before you ship" | /cloud-security (Jordan) | STRIDE threat model |
| Cost | "Know before you spend" | /cloud-cost (Taylor) | Cost breakdown |
| Testing | "Prove before you merge" | Gherkin | Test scenarios |

## Commands

```bash
# Security scanning
pre-commit run --all-files     # Run all security hooks
trufflehog git file://. --since-commit HEAD --results=verified,unknown

# Spec verification (Phase 3)
./scripts/verify-spec.sh       # Validate spec completeness

# Agent invocation (in Claude Code)
#   /cloud-security - Generate STRIDE threat model
#   /cloud-cost     - Generate cost breakdown
```

## Project Structure

```
.specs/
  templates/     # Spec templates
  examples/      # Example specs (stripe-payments.md)
scripts/
  verify-spec.sh # Spec verification script
docs/
  workflow.md    # End-to-end workflow guide
  security-assessment.md  # Agent output
  cost-analysis.md        # Agent output
_bmad/
  expansion-packs/
    cloud-architecture/
      agents/
        cloud-security.md  # Jordan agent
        cloud-cost.md      # Taylor agent
```

## Code Style

- Shell scripts: Use bash, include `set -euo pipefail`
- Markdown: Use ATX headers (#), include code fence language hints
- Specs: Follow template structure exactly
- Commit format: `type(scope): description`
  - Types: feat, fix, docs, refactor, test, chore
  - Scope: Optional, e.g., `docs(security): add STRIDE example`

## Git Workflow

- Always run `pre-commit run --all-files` before committing
- Never commit with `--no-verify`
- Create PRs for all changes to main branch
- Squash commits when merging PRs

## Boundaries

### Always Do
- Run pre-commit hooks before every commit
- Include all 6 STRIDE categories in security assessments
- Include assumptions in cost estimates
- Use Gherkin format for test scenarios
- Follow the Three Pillars for every feature

### Ask First
- Creating files outside .specs/, scripts/, docs/
- Modifying pre-commit configuration
- Adding new dependencies
- Changes to _bmad/ directory structure

### Never Do
- Commit secrets or credentials
- Bypass security hooks (--no-verify)
- Create specs without all three pillars
- Modify _bmad/ expansion pack agent contents
- Skip security assessment for any feature
