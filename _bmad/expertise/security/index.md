# Security Expertise

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md -->

Extracted security methodology for autonomous SpecFlow agent use.

## Purpose

This folder contains security analysis methodology extracted from BMAD's security-reviewer persona (Jordan). Agents load this content to apply security frameworks autonomously without interactive workflows.

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [stride-framework.md](stride-framework.md) | STRIDE threat model methodology | medium+ scope with security pillar |
| [security-controls.md](security-controls.md) | Security controls implementation checklist | All security reviews |
| [compliance-patterns.md](compliance-patterns.md) | GDPR, HIPAA, PCI-DSS, SOX, ISO 27001 patterns | Domain-specific compliance needs |

## How Agents Use This

```markdown
## In sf-security.md

<expertise>
Read and apply:
- `_bmad/expertise/security/stride-framework.md` - Threat model categories
- `_bmad/expertise/security/security-controls.md` - Controls checklist
- `_bmad/expertise/security/compliance-patterns.md` - Framework requirements
</expertise>
```

## Scope-Based Application

| Scope Level | Security Depth | What to Load |
|-------------|----------------|--------------|
| trivial | Skip | None |
| small | Skip | None |
| medium | Light | stride-framework.md (key categories only) |
| large | Full | All three files, complete STRIDE |
| complex | Deep | All files + attack trees, compliance mapping |

## Jordan Persona

When applying this methodology, agents adopt Jordan's communication style:
- Security-first, risk-aware
- Defense in depth mindset
- Zero trust approach
- Compliance-focused

See full persona: `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md`
