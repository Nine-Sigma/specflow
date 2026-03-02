# Code Intelligence

SpecFlow's code intelligence engine provides structural codebase understanding via tree-sitter parsing and in-memory call graph analysis. It integrates at two levels:

1. **Automatic enrichment** — `assembleContext()` adds a `codebase` field to phase responses
2. **Standalone tools** — `specflow_codebase` and `specflow_impact` for direct queries

## Standalone Tools

### specflow_codebase

Query codebase structure with these actions:

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `scan` | Detect tech stack, frameworks, entry points | Early analysis (codebase-analysis phase) |
| `symbols` | List symbols filtered by path/kind/depth | Exploring unfamiliar code areas |
| `dependencies` | Import chain for a symbol | Understanding coupling before changes |
| `patterns` | Detect API routes, services, components | Architecture and pattern analysis |
| `warmup` | Pre-load index (returns cached stats if exists) | Start of a phase to avoid cold-start |
| `reindex` | Force rebuild the code index | After making code changes mid-phase |

**Example calls:**
```
specflow_codebase("scan")
specflow_codebase("symbols", { path: "src/api/", kind: "function" })
specflow_codebase("dependencies", { symbol: "OrderService.createOrder" })
specflow_codebase("patterns", { category: "api-routes" })
specflow_codebase("reindex")
```

### specflow_impact

Analyze blast radius — find all code affected by changing a symbol.

```
specflow_impact("createOrder")
specflow_impact("OrderService.createOrder", 3)
```

Returns depth-tiered callers (direct/indirect/transitive), separated test files, and index stats.

## Automatic Context Enrichment

The `codebase` field on `ContextResponse` is **optional** and may be absent. Agents must handle this gracefully — never assume the field exists.

Phases that receive automatic enrichment:

| Phase | Fields | Source Artifact |
|-------|--------|-----------------|
| codebase-analysis | scan, symbols, patterns | — |
| architect | impact | 1.5-codebase-constraints.md |
| tea | impact | 2-architecture.md |
| dev-story | impact | 2-architecture.md |
| checkpoint-dev | impact (auto-reindex) | 6-dev-output.md |

## Index Lifecycle

The code index is built lazily on first access and cached in memory.

### Staleness Between Parallel Waves

When multiple dev-story agents run in parallel waves, they share a cached index. The index may become stale as stories modify code. This is expected — the checkpoint-dev phase automatically triggers a fresh reindex (`autoReindex: true`) to catch up.

### When to Explicitly Reindex

Call `specflow_codebase("reindex")` when:
- You've made significant code changes and need accurate impact analysis immediately
- You're investigating a discrepancy between expected and actual dependencies
- The index stats look wrong for the current codebase state

### When NOT to Reindex

Do NOT call reindex when:
- You're in a parallel dev-story wave (checkpoint handles it)
- You only need scan/patterns data (these don't depend on the call graph)
- The index was just built (warmup returns stats without rebuilding)

## Supported Languages

- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx, .mjs, .cjs)
- Python (.py)

## Limitations (v1)

- Gitignore: root-level `.gitignore` only (no subdirectory `.gitignore` files)
- tsconfig paths: root `tsconfig.json` only (no `extends` resolution)
- Python stdlib: static list targeting Python 3.10+ (no runtime detection)
- Max file size: 500KB per file
- Impact depth cap: 4 levels
- Impact result cap: 200 symbols
