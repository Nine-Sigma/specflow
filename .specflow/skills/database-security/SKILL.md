---
name: database-security
description: Database-specific security review for SQL injection, ORM safety, credentials, and configuration
review-capable: true
security-capable: true
scope-minimum: small
triggers:
  files:
    - "*.sql"
    - "*.prisma"
    - "prisma/**/*"
    - "migrations/**/*"
    - "alembic/**/*"
    - "alembic.ini"
    - "db/**/*"
    - "database/**/*"
    - "schema/**/*"
    - "models/**/*"
  patterns:
    - "SELECT.*FROM"
    - "INSERT.*INTO"
    - "UPDATE.*SET"
    - "DELETE.*FROM"
    - "CREATE TABLE"
    - "ALTER TABLE"
    - "prisma\\."
    - "sequelize"
    - "typeorm"
    - "knex"
    - "mongoose"
    - "sqlalchemy"
    - "SQLAlchemy"
    - "from sqlalchemy"
    - "Session\\("
    - "sessionmaker"
    - "create_engine"
    - "declarative_base"
    - "Column\\("
    - "relationship\\("
    - "alembic"
    - "op\\.create_table"
    - "op\\.drop_table"
    - "op\\.add_column"
    - "op\\.execute"
    - "db\\.query"
    - "connection.*string"
    - "DATABASE_URL"
---

# Database Security

Database-specific security analysis for SQL injection prevention, ORM safety, credential management, and configuration hardening.

## When to Use

Use this skill for projects with:
- Direct SQL queries (raw SQL, stored procedures)
- ORM usage (Prisma, Sequelize, TypeORM, Knex, Mongoose, SQLAlchemy)
- Database migrations (Prisma, Alembic, Sequelize, TypeORM)
- Database configuration files
- Connection string management

This skill provides more specialized database security analysis than general app-security injection checks.

## Detection Categories

### 1. SQL Injection Prevention

- Parameterized queries vs string concatenation
- Prepared statements usage
- Stored procedure safety (EXEC with user input)
- Dynamic SQL construction

### 2. ORM Safety

- Raw query methods (`.raw()`, `.$queryRaw()`)
- Mass assignment vulnerabilities
- N+1 query exposure (DoS vector)
- Unsafe filtering with user input

### 3. Credential Management

- Hardcoded credentials in connection strings
- Weak passwords in configurations
- Credential logging
- Environment variable usage

### 4. Configuration Security

- SSL/TLS for connections
- Connection pool limits
- Query timeout settings
- Default credentials

### 5. Schema Security

- Row-level security
- Audit columns (created_at, updated_at)
- Soft delete for sensitive data
- Index security (performance DoS)

## Execution Methodology

### Step 1: Load Checklist

Load `checklists/db-vulnerabilities.md` for detection patterns.

### Step 2: Scan SQL and ORM Files

Scan files matching triggers for:
- String concatenation in queries
- Raw query method usage
- Hardcoded credentials
- Disabled SSL

### Step 3: Check Migration Files

Review migration files for:
- Security regressions (removing constraints)
- Missing audit columns
- Inappropriate data exposure

### Step 4: Verify Connection Configuration

Check database configuration for:
- SSL/TLS enabled
- Connection limits set
- Appropriate timeouts
- No credential logging

### Step 5: Generate Findings

Map issues to severity levels and output findings.

## Severity Mapping

| Issue Type | Severity | Rationale |
|------------|----------|-----------|
| SQL injection (string concat) | CRITICAL | Direct attack vector |
| Hardcoded credentials | CRITICAL | Credential exposure |
| Mass assignment | CRITICAL | Data manipulation |
| Raw query without sanitization | MAJOR | Potential injection |
| SSL/TLS disabled | MAJOR | Data in transit exposure |
| N+1 queries | MAJOR | DoS vector |
| Missing audit columns | MINOR | Compliance/forensics |
| No connection limits | MINOR | Resource exhaustion |

## Output

Write findings to `8-skill-database-security.md` following the review output format.

### Output Format

```markdown
---
agent: skill-database-security
lens: security
created: {iso-timestamp}
version: v1
status: findings|clean
scope_level: {from 0-scope.md}
iteration: 1
reviewed_files:
  - {list of files reviewed}
---

# {Feature Name} - Database Security Review

## Summary

{2-3 sentence summary of database security findings}

## Findings

### CRITICAL (blocks merge)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| DBS-C-01 | file:line | {description} | AC-XX | CRITICAL |

### MAJOR (should fix)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| DBS-M-01 | file:line | {description} | AC-XX | MAJOR |

### MINOR (nice to have)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| DBS-m-01 | file:line | {description} | AC-XX | MINOR |

## Fix Instructions

### DBS-C-01: {Issue Title}

**What's wrong:** {detailed explanation}
**How to fix:** {specific instructions with code example}
**Files to change:** {file list}

## Verification

After fixes, verify:
- [ ] {verification step}
```

## Routing

All database-security findings route to **Dev**:
- Database code is Dev responsibility
- Dev fixes in existing review loop
- Re-review verifies fixes

## ID Convention

| Severity | Prefix | Example |
|----------|--------|---------|
| CRITICAL | DBS-C- | DBS-C-01, DBS-C-02 |
| MAJOR | DBS-M- | DBS-M-01, DBS-M-02 |
| MINOR | DBS-m- | DBS-m-01, DBS-m-02 |

## Integration with app-security

This skill complements app-security:
- **app-security**: Broad OWASP coverage (XSS, CSRF, auth, etc.)
- **database-security**: Deep dive on database-specific vectors

When both are enabled, database-security provides specialized analysis that app-security references but doesn't deeply cover.
