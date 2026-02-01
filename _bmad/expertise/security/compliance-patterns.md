# Compliance Framework Patterns

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md -->

Key compliance requirements extracted for autonomous agent reference.

## GDPR

**General Data Protection Regulation** - EU data privacy law

### Key Requirements
- Data privacy and protection requirements
- Right to be forgotten, data portability
- Consent management, data processing agreements
- Breach notification requirements (72 hours)

### Implementation Patterns
- [ ] Privacy by design in architecture
- [ ] Data subject access request (DSAR) handling
- [ ] Consent tracking and management
- [ ] Data retention policies and deletion workflows
- [ ] Cross-border transfer safeguards (SCCs, adequacy)
- [ ] Data Processing Agreements (DPAs) with vendors
- [ ] Breach detection and notification procedures

## HIPAA

**Health Insurance Portability and Accountability Act** - US healthcare data protection

### Key Requirements
- Protected Health Information (PHI) safeguards
- Access controls and audit logs
- Encryption requirements
- Business Associate Agreements (BAA)

### Implementation Patterns
- [ ] PHI data classification and handling
- [ ] Minimum necessary access principle
- [ ] Encryption at rest and in transit for PHI
- [ ] Comprehensive audit logging
- [ ] Access control policies and procedures
- [ ] BAAs with all vendors handling PHI
- [ ] Workforce training documentation
- [ ] Incident response procedures

## PCI-DSS

**Payment Card Industry Data Security Standard** - Payment card data protection

### Key Requirements
- Cardholder data protection
- Network segmentation and access controls
- Vulnerability management
- Incident response procedures

### Implementation Patterns
- [ ] Cardholder data environment (CDE) segmentation
- [ ] No storage of sensitive authentication data
- [ ] Strong cryptography for transmission
- [ ] Access restricted on need-to-know basis
- [ ] Unique IDs for all users
- [ ] Regular vulnerability scanning
- [ ] Penetration testing annually
- [ ] Security awareness training
- [ ] Incident response plan tested annually

## SOX

**Sarbanes-Oxley Act** - Financial reporting and controls

### Key Requirements
- Financial data controls and audit trails
- Change management procedures
- Access controls for financial systems

### Implementation Patterns
- [ ] Segregation of duties for financial systems
- [ ] Change management approval workflows
- [ ] Comprehensive audit trails
- [ ] Access reviews and recertification
- [ ] IT general controls (ITGCs)
- [ ] Documentation of control procedures
- [ ] Testing of control effectiveness

## ISO 27001

**Information Security Management System** - International security standard

### Key Requirements
- Information security management system (ISMS)
- Risk assessment and treatment
- Security controls implementation
- Continuous improvement

### Implementation Patterns
- [ ] Information security policy documented
- [ ] Risk assessment methodology defined
- [ ] Asset inventory and classification
- [ ] Statement of Applicability (SoA)
- [ ] Control implementation from Annex A
- [ ] Internal audit program
- [ ] Management review process
- [ ] Corrective action procedures
- [ ] Continuous improvement (PDCA cycle)

## When to Apply

| Trigger | Framework | Scope Level |
|---------|-----------|-------------|
| PII/personal data | GDPR | large+ |
| Healthcare data | HIPAA | large+ |
| Payment processing | PCI-DSS | large+ |
| Financial reporting | SOX | large+ |
| Enterprise security | ISO 27001 | complex |
| EU users/customers | GDPR | medium+ |
| US healthcare | HIPAA | medium+ |

## Domain-Specific Triggers

When feature touches these domains, consider compliance requirements:

| Domain | Primary Framework | Secondary |
|--------|-------------------|-----------|
| Healthcare | HIPAA | SOC 2, ISO 27001 |
| Finance/Banking | SOX, PCI-DSS | SOC 2, ISO 27001 |
| E-commerce | PCI-DSS | GDPR (if EU) |
| SaaS | SOC 2 | ISO 27001, GDPR |
| Government | FedRAMP | NIST 800-53 |

## Compliance Review Output Format

```markdown
### [Framework Name] Compliance Assessment

**Applicability:** [Yes/No/Partial]
**Reason:** [Why this framework applies]

**Requirements Mapped:**
| Requirement | Control | Status | Gap |
|-------------|---------|--------|-----|
| [Req ID] | [Control description] | [Met/Partial/Not Met] | [Gap if any] |

**Remediation Required:**
1. [Specific action needed]
2. [Specific action needed]

**Evidence Needed:**
- [Documentation required]
- [Audit artifact required]
```
