# Risk-Based Scoping

Extracted from BMAD methodology for autonomous agent use.

## Risk Categories

### Technical Risks

**Questions to assess:**
- What's the most technically challenging aspect?
- Are we using proven technology or experimenting?
- What's the riskiest assumption about feasibility?
- Do we have expertise in this tech stack?
- Are there known performance concerns?

**Risk Signals:**
| Signal | Risk Level | Scope Impact |
|--------|------------|--------------|
| Proven tech, team has experience | Low | Can use smaller scope |
| Proven tech, team learning | Medium | Add buffer |
| New tech, documented patterns | Medium | Standard scope |
| New tech, experimental | High | Increase scope |
| Research required | Very High | Complex scope |

### Market Risks

**Questions to assess:**
- What's the biggest assumption about user need?
- How does MVP address/validate this?
- What learning do we need to de-risk?
- Do we have user feedback supporting this?

**Risk Signals:**
| Signal | Risk Level | Scope Impact |
|--------|------------|--------------|
| Validated user request | Low | Proceed normally |
| User research supports | Medium | Include validation |
| Assumption-based | High | Smaller MVP, validate |
| Speculative | Very High | Spike first |

### Resource Risks

**Questions to assess:**
- What if we have fewer resources than planned?
- What's the absolute minimum team needed?
- Can we launch with smaller feature set?
- What's the fallback if timeline slips?

**Risk Signals:**
| Signal | Risk Level | Scope Impact |
|--------|------------|--------------|
| Dedicated team, clear timeline | Low | Full scope OK |
| Shared resources | Medium | Buffer scope |
| Uncertain availability | High | Minimize scope |
| Critical deadline | Very High | Ruthless MVP |

### Security/Compliance Risks

**Automatic scope escalation triggers:**

| Trigger | Minimum Scope |
|---------|---------------|
| Handles authentication | medium+ |
| Handles authorization | medium+ |
| Processes payments | large+ |
| Stores PII | medium+ |
| Healthcare data (HIPAA) | large+ |
| Financial data | large+ |
| Children's data (COPPA) | large+ |
| EU users (GDPR) | medium+ |

## Risk-Adjusted Scope Matrix

Combine technical + market + resource risks:

| Combined Risk | Scope Adjustment |
|---------------|------------------|
| All Low | Use assessed scope |
| Any Medium | Add one scope level buffer |
| Any High | Requires explicit user approval |
| Multiple High | Consider phased approach |

## Pre-Mortem Technique

For large+ scope, apply pre-mortem thinking:

> "Imagine it's 3 months from now and this feature failed. What went wrong?"

Common failure modes to consider:
1. **Technical**: Performance didn't scale, integration failed
2. **User**: Users didn't adopt, wrong problem solved
3. **Resource**: Team couldn't deliver, dependencies blocked
4. **Security**: Vulnerability discovered, compliance issue
5. **Scope**: Creep made it undeliverable

For each failure mode identified, add mitigation to scope.

## Domain-Specific Risk Factors

From BMAD domain-complexity.csv:

### High-Complexity Domains (Always medium+ scope)
- **Healthcare**: FDA, HIPAA, clinical validation
- **Fintech**: KYC/AML, PCI-DSS, regional compliance
- **GovTech**: FedRAMP, 508 accessibility, procurement
- **Aerospace**: DO-178C, safety certification
- **Automotive**: ISO 26262, functional safety
- **LegalTech**: Ethics, privilege, bar regulations
- **InsureTech**: Actuarial standards, state compliance
- **Energy**: NERC standards, grid compliance

### Medium-Complexity Domains
- **EdTech**: COPPA/FERPA, accessibility, content moderation
- **Scientific**: Reproducibility, validation methodology

### Low-Complexity Domains
- **General**: Standard security, basic UX

## Risk Documentation Template

For medium+ scope, document risks:

```markdown
## Risk Assessment

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk} | {L/M/H} | {L/M/H} | {approach} |

### Market Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk} | {L/M/H} | {L/M/H} | {approach} |

### Resource Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk} | {L/M/H} | {L/M/H} | {approach} |

### Security/Compliance
| Requirement | Status | Notes |
|-------------|--------|-------|
| {requirement} | {addressed/deferred/N/A} | {notes} |
```
