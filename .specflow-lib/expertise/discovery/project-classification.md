# Project Classification

Extracted from BMAD create-prd workflow for autonomous agent use.

## Classification Dimensions

### 1. Project Type

Detect from signals in the request:

| Type | Signals | Key Questions |
|------|---------|---------------|
| **api_backend** | API, REST, GraphQL, backend, service, endpoints | Auth method? Rate limits? SDK needed? |
| **web_app** | website, webapp, browser, SPA, PWA | SPA or MPA? SEO? Real-time? |
| **mobile_app** | iOS, Android, app, mobile | Native or cross-platform? Offline? |
| **saas_b2b** | SaaS, B2B, platform, dashboard, enterprise | Multi-tenant? Permission model? |
| **cli_tool** | CLI, command, terminal, bash | Interactive or scriptable? |
| **desktop_app** | desktop, Windows, Mac, Linux | Cross-platform? Auto-update? |
| **developer_tool** | SDK, library, package, npm, pip | Language support? IDE integration? |

See `data/project-types.csv` for full list with detection signals.

### 2. Domain Complexity

| Domain | Complexity | Key Concerns |
|--------|------------|--------------|
| **healthcare** | High | FDA, HIPAA, clinical validation |
| **fintech** | High | KYC/AML, PCI-DSS, regional compliance |
| **govtech** | High | FedRAMP, 508 accessibility |
| **legaltech** | High | Ethics, privilege, bar regulations |
| **edtech** | Medium | COPPA/FERPA, accessibility |
| **general** | Low | Standard security, basic UX |

See `data/domain-complexity.csv` for full list with compliance requirements.

### 3. Project Context

| Context | Signals | Implications |
|---------|---------|--------------|
| **Greenfield** | New product, no existing code | Full freedom, full decisions |
| **Brownfield** | Existing system, add feature | Constrained by existing patterns |

## Classification Process

### Step 1: Detect Project Type
1. Scan request for type signals
2. Match against project-types.csv
3. Note key questions to explore

### Step 2: Detect Domain
1. Identify industry/domain references
2. Look up complexity in domain-complexity.csv
3. Note compliance requirements

### Step 3: Determine Context
1. Check if existing codebase
2. Identify constraints from existing patterns
3. Note integration requirements

## How This Affects Scope

| Classification | Scope Impact |
|----------------|--------------|
| High-complexity domain | Minimum medium scope |
| Brownfield with breaking changes | Increase scope |
| Greenfield with proven tech | Standard scope |
| Unknown technology | Increase scope |
| Compliance requirements | Add security pillar |

## Classification Output Format

```yaml
classification:
  project_type: {type}
  domain: {domain}
  complexity: {low|medium|high}
  context: {greenfield|brownfield}
  compliance: [{requirement1}, {requirement2}]
```

## Integration with Scope Assessment

After classification:
1. Use complexity to set minimum scope level
2. Use compliance to determine required pillars
3. Use context to adjust estimates
4. Pass classification to all downstream agents
