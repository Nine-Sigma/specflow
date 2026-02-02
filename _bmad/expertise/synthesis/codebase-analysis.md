# Codebase Analysis Protocol

<!-- Source: SpecFlow v2.3 Requirements Synthesis Gate -->

Expertise for Analyst to derive technical constraints and integration points from project codebase.

## When to Use

Analyst executes codebase analysis after scope approval, before spec creation (Mode 1.5).
This produces `1.5-codebase-constraints.md` which informs both spec refinement and architecture.

**Workflow Position:**
```
0-scope.md (approved) --> Analyst: codebase analysis --> 1.5-codebase-constraints.md --> 1-spec.md
```

## Phase 1: Tech Stack Detection

### Primary Config Files

| File | What to Extract | Example Output |
|------|-----------------|----------------|
| `package.json` | dependencies, devDependencies, scripts | react, next.js, prisma |
| `tsconfig.json` | strict mode, paths, target | TypeScript strict: true |
| `jsconfig.json` | module resolution, paths | JavaScript with aliases |
| `requirements.txt` | Python dependencies | FastAPI, SQLAlchemy |
| `go.mod` | Go module dependencies | gin-gonic, gorm |
| `Cargo.toml` | Rust crate dependencies | actix-web, diesel |

### Framework-Specific Configs

| File | Framework | Constraint Type |
|------|-----------|-----------------|
| `next.config.js` | Next.js | App router vs pages, server components |
| `vite.config.ts` | Vite | Build configuration |
| `tailwind.config.js` | Tailwind | CSS framework conventions |
| `.eslintrc.*` | ESLint | Code style requirements |
| `.prettierrc` | Prettier | Formatting conventions |
| `docker-compose.yml` | Docker | Service dependencies |
| `.env.example` | Environment | Required env vars |

### Detection Commands

```bash
# Read package.json for primary tech stack
Read: package.json -> extract dependencies, devDependencies

# Read language config
Read: tsconfig.json OR jsconfig.json -> extract compilerOptions

# Read framework configs
Glob: *.config.{js,ts,mjs} -> extract framework settings
```

## Phase 2: Pattern Detection

### Component Patterns (Frontend)

| Pattern | Detection | Constraint |
|---------|-----------|------------|
| Functional components | Grep: `export default function` in `src/components/` | TC: Use functional components |
| Class components | Grep: `class.*extends.*Component` | TC: Follow existing class pattern |
| Hook patterns | Glob: `src/hooks/*.ts` | TC: Extract reusable logic to hooks |
| Component naming | Check: PascalCase.tsx files | TC: PascalCase component files |

### API Patterns (Backend)

| Pattern | Detection | Constraint |
|---------|-----------|------------|
| Next.js App Router | Glob: `src/app/api/**/route.ts` | TC: Use route handlers |
| Next.js Pages API | Glob: `pages/api/**/*.ts` | TC: Use pages API pattern |
| Express-style | Grep: `router.get\|router.post` | TC: Use router methods |
| tRPC | Grep: `createTRPCRouter\|procedure` | TC: Use tRPC procedures |

### Service Patterns

| Pattern | Detection | Constraint |
|---------|-----------|------------|
| Class services | Grep: `class.*Service` in `src/services/` | TC: Class-based services |
| Functional services | Grep: `export const.*=` in `src/services/` | TC: Functional services |
| Repository pattern | Glob: `src/repositories/*.ts` | TC: Use repository layer |

### Data Patterns

| Pattern | Detection | Constraint |
|---------|-----------|------------|
| Prisma | File: `prisma/schema.prisma` | TC: Use Prisma ORM |
| Drizzle | File: `drizzle.config.ts` | TC: Use Drizzle ORM |
| Raw SQL | Grep: `sql\`` or `query(` | TC: Match existing SQL patterns |

## Phase 3: Integration Point Discovery

### Finding Related Files

For the feature area (from triage), search for:

1. **Existing implementations**: Grep feature keywords across src/
2. **Type definitions**: Grep interfaces/types related to feature domain
3. **Shared utilities**: Check imports in related files -> identify shared modules
4. **Middleware**: Check `src/middleware/` for applicable middleware

### Integration Point Categories

| Category | Search Pattern | Output |
|----------|----------------|--------|
| Auth | Grep: `auth\|session\|user` in middleware | IP: Auth middleware at {path} |
| Email | Grep: `email\|mail\|send` in services | IP: Email service at {path} |
| Storage | Grep: `upload\|storage\|s3\|blob` | IP: Storage service at {path} |
| Cache | Grep: `redis\|cache\|memo` | IP: Cache layer at {path} |
| Validation | Grep: `zod\|yup\|validate` | IP: Validation library used |

### Dependency Mapping

For each integration point found:

1. Read the file to understand interface/contract
2. Note required imports
3. Note expected return types
4. Document any side effects (logging, metrics)

## Output Format: 1.5-codebase-constraints.md

```markdown
---
agent: analyst
created: {iso-timestamp}
depends_on: [0-scope.md]
analysis_type: codebase-constraints
files_analyzed: {count}
patterns_detected: {count}
---

# Codebase Constraints: {Feature Name}

## Tech Stack (TC)

| ID | Constraint | Source | Rationale |
|----|------------|--------|-----------|
| TC-01 | {constraint} | CODEBASE: {file} | {why it matters} |

## Integration Points (IP)

| ID | Integration | Related Files | Interface |
|----|-------------|---------------|-----------|
| IP-01 | {service/middleware} | {paths} | {brief interface description} |

## Detected Patterns

| Category | Pattern | Examples |
|----------|---------|----------|
| Components | {pattern name} | {2-3 files showing pattern} |
| API | {pattern name} | {2-3 files showing pattern} |
| Services | {pattern name} | {2-3 files showing pattern} |

## Notes for Downstream

### For Architect
- {Architectural constraints from codebase}

### For Dev
- {Implementation patterns to follow}

## Analysis Scope

**Files analyzed:**
- {List of primary files analyzed}

**Not analyzed (out of scope):**
- node_modules/, .git/, build outputs
```

## Quick Reference

### Minimum Analysis (trivial/small scope)

1. Read package.json -> tech stack
2. Check for TypeScript (tsconfig.json)
3. Note one obvious pattern

**Output:** 2-3 TC items, 0-1 IP items

### Standard Analysis (medium scope)

All of minimum, plus:
1. Pattern detection for 2-3 categories
2. Integration points for feature area
3. Dependency mapping for main touchpoints

**Output:** 5-8 TC items, 2-4 IP items

### Deep Analysis (large/complex scope)

All of standard, plus:
1. Full pattern inventory
2. All potential integration points
3. Interface documentation for each IP
4. Cross-cutting concerns (logging, error handling, auth)

**Output:** 10+ TC items, 5+ IP items

## Anti-Patterns

**Over-analysis**
- Do NOT catalog entire codebase
- Focus on feature area from 0-scope.md
- Stop when you have enough constraints

**Speculation**
- Only report what you find, not what might exist
- If a pattern is unclear, note it as "uncertain"
- Prefer fewer certain constraints over many uncertain ones

**Implementation Details**
- Constraints describe WHAT exists, not HOW to implement
- "Use Prisma ORM" is a constraint
- "Create a User model with id, email fields" is implementation

**Stale Detection**
- Check file timestamps if codebase is unfamiliar
- Note if patterns seem inconsistent (migration in progress)
- Flag deprecated patterns if evident
