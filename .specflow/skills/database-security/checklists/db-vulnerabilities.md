# Database Vulnerability Checklist

This checklist provides detection patterns for database-specific security vulnerabilities. Use with the database-security skill.

## 1. SQL Injection Prevention

SQL injection remains a critical attack vector. Verify all database queries use proper parameterization.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| Parameterized queries | String concatenation in SQL | CRITICAL |
| Prepared statements | Dynamic SQL without binding | CRITICAL |
| Stored procedure safety | EXEC with user input | CRITICAL |

### Anti-patterns

```typescript
// BAD: String concatenation - SQL injection vulnerability
await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// BAD: Template literal without parameterization
const query = `SELECT * FROM orders WHERE user_id = ${userId}`;
await db.query(query);

// BAD: String building
let sql = "SELECT * FROM products WHERE ";
sql += "category = '" + userInput + "'";
```

### Correct Patterns

```typescript
// GOOD: Parameterized query (PostgreSQL style)
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// GOOD: Named parameters
await db.query('SELECT * FROM orders WHERE user_id = :userId', { userId });

// GOOD: Prepared statement
const stmt = db.prepare('SELECT * FROM products WHERE category = ?');
await stmt.run(category);
```

## 2. ORM Security

ORMs provide safety but can be bypassed. Verify ORM usage follows security best practices.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| Raw query usage | `.raw()`, `.$queryRaw()`, `.$executeRaw()` | MAJOR |
| Mass assignment | `update(req.body)` without allow-list | CRITICAL |
| N+1 query exposure | Loop with individual queries | MAJOR |
| Unsafe where clauses | User input in where objects | MAJOR |

### Anti-patterns

```typescript
// BAD: Mass assignment - user could set isAdmin, role, etc.
await prisma.user.update({
  where: { id },
  data: req.body
});

// BAD: Raw query with string interpolation
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// BAD: Sequelize raw query
await sequelize.query(`SELECT * FROM users WHERE id = ${userId}`);

// BAD: N+1 queries in loop
const users = await prisma.user.findMany();
for (const user of users) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } });
}
```

### Correct Patterns

```typescript
// GOOD: Explicit field allowlist
await prisma.user.update({
  where: { id },
  data: {
    name: req.body.name,
    email: req.body.email,
    // isAdmin intentionally not included
  }
});

// GOOD: Parameterized raw query
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${Prisma.sql`${email}`}`;

// GOOD: Sequelize with bind parameters
await sequelize.query('SELECT * FROM users WHERE id = $1', {
  bind: [userId],
  type: QueryTypes.SELECT
});

// GOOD: Eager loading instead of N+1
const users = await prisma.user.findMany({
  include: { orders: true }
});
```

## 3. Credential Management

Database credentials must never be hardcoded or logged.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| Hardcoded credentials | Password in connection string | CRITICAL |
| Weak passwords | `password`, `admin`, `root`, `123456` | CRITICAL |
| Credential logging | Logging connection string | MAJOR |
| Plain text config | Credentials in .json/.yaml without encryption | MAJOR |

### Anti-patterns

```typescript
// BAD: Hardcoded credentials
const db = new Database('postgres://admin:password123@localhost/app');

// BAD: Credentials in code
const config = {
  user: 'admin',
  password: 'secretpassword',
  host: 'db.example.com'
};

// BAD: Logging connection string
console.log('Connecting to:', process.env.DATABASE_URL);
logger.info(`DB config: ${JSON.stringify(dbConfig)}`);

// BAD: Weak password patterns
const password = 'password';
const password = 'admin';
const password = 'root';
const password = '123456';
```

### Correct Patterns

```typescript
// GOOD: Environment variable
const db = new Database(process.env.DATABASE_URL);

// GOOD: Secret manager
const password = await secretManager.getSecret('db-password');
const db = new Database({
  user: process.env.DB_USER,
  password,
  host: process.env.DB_HOST
});

// GOOD: Redacted logging
logger.info('Connecting to database', { host: dbConfig.host, database: dbConfig.database });
// Password NOT logged

// GOOD: Strong password via secret management
const password = await vault.read('database/creds/readonly');
```

## 4. Configuration Security

Database connections must be properly secured and configured.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| SSL/TLS disabled | `ssl: false`, `sslmode=disable` | MAJOR |
| No connection limits | Missing pool config | MINOR |
| Long timeouts | Timeout > 30s without justification | MINOR |
| Excessive permissions | Using root/admin for app connections | MAJOR |

### Anti-patterns

```typescript
// BAD: SSL explicitly disabled
const db = new Pool({
  ssl: false,
  connectionString: process.env.DATABASE_URL
});

// BAD: sslmode=disable in connection string
DATABASE_URL=postgres://user:pass@host/db?sslmode=disable

// BAD: No connection pool limits
const pool = new Pool({ connectionString: DATABASE_URL });
// No max, min, idle timeout specified

// BAD: Very long query timeout
const client = new Client({
  query_timeout: 300000 // 5 minutes
});
```

### Correct Patterns

```typescript
// GOOD: SSL enabled with certificate verification
const db = new Pool({
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem')
  },
  connectionString: process.env.DATABASE_URL
});

// GOOD: SSL in connection string
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

// GOOD: Connection pool limits
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// GOOD: Reasonable query timeout
const client = new Client({
  query_timeout: 30000, // 30 seconds
  statement_timeout: 30000
});
```

## 5. Schema Security

Database schema should support security auditing and prevent data loss.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| Missing audit columns | No created_at/updated_at | MINOR |
| No soft delete | Hard delete on sensitive data | MAJOR |
| Missing indexes on lookups | Query performance DoS | MINOR |
| Excessive privileges | GRANT ALL on sensitive tables | MAJOR |

### Anti-patterns

```sql
-- BAD: Table without audit columns
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255)
);

-- BAD: Hard delete of sensitive data
DELETE FROM users WHERE id = 123;

-- BAD: No index on frequently queried column
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,  -- No index, causes slow queries
  total DECIMAL
);

-- BAD: Excessive privileges
GRANT ALL PRIVILEGES ON users TO app_user;
```

### Correct Patterns

```sql
-- GOOD: Table with audit columns
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);

-- GOOD: Soft delete
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- GOOD: Index on lookup columns
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- GOOD: Minimal privileges
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- No DELETE, no TRUNCATE, no DROP
```

## 6. Migration Security

Database migrations should not introduce security regressions.

| Check | What to Look For | Severity |
|-------|------------------|----------|
| Removing constraints | DROP CONSTRAINT without replacement | MAJOR |
| Removing indexes | DROP INDEX on security-relevant columns | MINOR |
| Adding nullable sensitive columns | Nullable without default | MINOR |
| Changing column types unsafely | Reducing precision, truncation | MAJOR |

### Migration Review Checklist

- [ ] No constraints removed without replacement
- [ ] No indexes dropped on frequently queried columns
- [ ] New columns have appropriate defaults
- [ ] Column type changes don't truncate data
- [ ] Audit columns preserved through migrations
- [ ] Row-level security policies maintained
- [ ] Foreign key constraints preserved

## Quick Reference

### Severity Summary

| Severity | Action | Examples |
|----------|--------|----------|
| CRITICAL | Block merge, fix immediately | SQL injection, hardcoded creds, mass assignment |
| MAJOR | Should fix before merge | Raw queries, disabled SSL, N+1 queries, hard delete |
| MINOR | Nice to have | Missing audit columns, no pool limits |

### Common Vulnerability Patterns

| Pattern | Detection Regex | Severity |
|---------|-----------------|----------|
| String concat in SQL | `\$\{.*\}` in query | CRITICAL |
| Hardcoded password | `password.*=.*['"][^$]` | CRITICAL |
| Mass assignment | `update\(.*req\.body` | CRITICAL |
| Raw query | `\.\$?queryRaw\|\.raw\(` | MAJOR |
| SSL disabled | `ssl.*false\|sslmode.*disable` | MAJOR |
| No parameterization | `query\s*\(\s*[`'"].*\+` | CRITICAL |
