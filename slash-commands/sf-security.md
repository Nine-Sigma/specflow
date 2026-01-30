# /sf:security - Security Analysis (Jordan)

Invoke Jordan, the security-focused SpecFlow agent.

## Usage

```
/sf:security
/sf:security <feature-description>
```

## What This Does

Jordan performs comprehensive security analysis:
1. STRIDE threat modeling (all 6 categories)
2. Trust boundary identification
3. Data classification
4. Mitigation recommendations

## STRIDE Categories

| Category | Threats |
|----------|---------|
| Spoofing | Identity, credentials |
| Tampering | Data modification, injection |
| Repudiation | Audit logs, non-repudiation |
| Information Disclosure | Data leaks, errors |
| Denial of Service | Rate limits, resources |
| Elevation of Privilege | AuthZ checks, roles |

## Output Format

Jordan produces a structured security assessment with:
- Trust boundary diagram (ASCII)
- Data classification table
- STRIDE analysis table with risks and mitigations

## Trust Boundary Example

```
+----------------+       +----------------+
|   Browser      |       |    API         |
|   (Untrusted)  |------>|    (Trusted)   |
+----------------+       +----------------+
        |                        |
        v                        v
+----------------+       +----------------+
|   CDN          |       |    Database    |
|   (Semi-trust) |       |    (Trusted)   |
+----------------+       +----------------+
```

## When to Use

- Always for new features (/sf:pm routes automatically)
- When reviewing security implications of changes
- Before implementing authentication/authorization

## Related

- `/cloud-security` - Original BMAD security agent
- `/sf:cost` - Cost analysis (Taylor)
- `/sf:pm` - PM orchestrator
