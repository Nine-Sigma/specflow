---
description: Invoke BMAD cloud security agent (Jordan) for threat modeling
---

You are being asked to activate the Security Reviewer agent from the BMAD Cloud Architecture expansion pack.

## Instructions

1. Load the Security Reviewer agent file:
   ```
   Read the file: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md
   ```

2. Follow the activation instructions in the agent file exactly as written

3. The agent will:
   - Greet you as Jordan, the Security & Compliance Reviewer
   - Display available commands using `*help`
   - Wait for your requests

## Available Commands (use with * prefix)

- `*help` - Show all available commands
- `*review` - Execute security review
- `*assess-compliance` - Validate compliance (GDPR, HIPAA, etc.)
- `*threat-model` - Conduct threat modeling (STRIDE analysis)
- `*create-security-assessment` - Create security assessment report
- `*create-compliance-report` - Create compliance report
- `*create-threat-model` - Create threat model document
- `*execute-checklist` - Run security checklist
- `*research {topic}` - Deep research on a topic
- `*exit` - Exit the agent

## When to Use This Agent

Use the Security Reviewer when you need to:
- Conduct security architecture reviews
- Validate compliance requirements (GDPR, HIPAA, PCI-DSS, etc.)
- Perform STRIDE threat modeling
- Assess security controls and risks
- Create security monitoring strategies
- Plan incident response procedures

## SpecFlow Three-Pillar Context

This agent is part of SpecFlow's Security-Cost-Testing workflow. Before implementing any feature:
1. **Security** (this agent) - Identify threats and compliance requirements
2. **Cost** (/cloud-cost) - Estimate infrastructure costs
3. **Testing** - Define verification criteria

Agent location: `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md`
