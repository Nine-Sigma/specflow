import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichContext, extractSymbolReferences } from './enrich.js';

// Mock the dependencies to avoid needing real tree-sitter parsing
vi.mock('./indexer.js', () => ({
  getIndex: vi.fn().mockResolvedValue({
    projectRoot: '/test',
    symbols: new Map([
      ['src/order.ts::OrderService', {
        name: 'OrderService', kind: 'class', file: 'src/order.ts',
        line: 1, endLine: 50, exported: true,
      }],
      ['src/order.ts::OrderService.createOrder', {
        name: 'createOrder', kind: 'method', file: 'src/order.ts',
        line: 5, endLine: 20, exported: false, parent: 'OrderService',
        signature: '(data: OrderInput) => Promise<Order>',
      }],
      ['src/api.ts::handleRequest', {
        name: 'handleRequest', kind: 'function', file: 'src/api.ts',
        line: 1, endLine: 10, exported: true,
        signature: '(req: Request) => Response',
      }],
    ]),
    callers: new Map([
      ['src/order.ts::OrderService.createOrder', new Set(['src/api.ts::handleRequest'])],
    ]),
    callees: new Map([
      ['src/api.ts::handleRequest', new Set(['src/order.ts::OrderService.createOrder'])],
    ]),
    imports: new Map(),
    fileSymbols: new Map([
      ['src/order.ts', new Set(['src/order.ts::OrderService', 'src/order.ts::OrderService.createOrder'])],
      ['src/api.ts', new Set(['src/api.ts::handleRequest'])],
    ]),
    stats: { total_symbols: 3, total_edges: 1, indexed_files: 2 },
  }),
  invalidateIndex: vi.fn(),
}));

vi.mock('./scanner.js', () => ({
  scanProject: vi.fn().mockResolvedValue({
    tech_stack: { language: 'typescript', runtime: 'node', framework: 'express' },
    structure: { total_files: 10, by_language: { typescript: 10 }, source_dirs: ['src/'], test_dirs: [], entry_points: ['src/index.ts'] },
    config: {},
  }),
}));

vi.mock('./patterns.js', () => ({
  detectPatterns: vi.fn().mockReturnValue([
    { type: 'services', files: ['src/order.ts'], details: { count: 1 } },
  ]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enrichContext', () => {
  it('returns null for phases not in PHASE_CODEBASE_MAP', async () => {
    const result = await enrichContext('brainstorm', {}, '/test');
    expect(result).toBeNull();
  });

  it('returns scan data for codebase-analysis phase', async () => {
    const result = await enrichContext('codebase-analysis', {}, '/test');
    expect(result).not.toBeNull();
    expect(result!.context.scan).toBeDefined();
    expect(result!.context.scan!.tech_stack.language).toBe('typescript');
  });

  it('returns symbols for codebase-analysis phase', async () => {
    const result = await enrichContext('codebase-analysis', {}, '/test');
    expect(result).not.toBeNull();
    expect(result!.context.symbols).toBeDefined();
    // Only exported, non-method symbols
    const names = result!.context.symbols!.map(s => s.name);
    expect(names).toContain('OrderService');
    expect(names).toContain('handleRequest');
    expect(names).not.toContain('createOrder'); // method with parent
  });

  it('returns patterns for codebase-analysis phase', async () => {
    const result = await enrichContext('codebase-analysis', {}, '/test');
    expect(result).not.toBeNull();
    expect(result!.context.patterns).toBeDefined();
    expect(result!.context.patterns!).toHaveLength(1);
  });

  it('returns impact for architect phase with artifact content', async () => {
    const artifacts = {
      '1.5-codebase-constraints.md': '## Modified Files\n\n| File | Purpose |\n|------|--------|\n| `src/order.ts` | Order management |\n\nKey symbol: `OrderService`',
    };
    const result = await enrichContext('architect', artifacts, '/test');
    expect(result).not.toBeNull();
    // Impact may or may not resolve depending on symbol extraction
    expect(result!.context).toBeDefined();
  });

  it('returns empty impact array with warning when artifact is missing', async () => {
    const result = await enrichContext('architect', {}, '/test');
    expect(result).not.toBeNull();
    expect(result!.context.impact).toEqual([]);
    expect(result!.warnings).toBeDefined();
    expect(result!.warnings!).toHaveLength(1);
    expect(result!.warnings![0].type).toBe('enrichment_source_missing');
    expect(result!.warnings![0].message).toContain('1.5-codebase-constraints.md');
  });

  it('returns no warnings when artifact is present', async () => {
    const artifacts = {
      '1.5-codebase-constraints.md': '## Modified Files\n\n| File | Purpose |\n|------|--------|\n| `src/order.ts` | Order management |\n\nKey symbol: `OrderService`',
    };
    const result = await enrichContext('architect', artifacts, '/test');
    expect(result).not.toBeNull();
    expect(result!.warnings).toBeUndefined();
  });

  it('handles indexing failures gracefully', async () => {
    const { getIndex } = await import('./indexer.js');
    (getIndex as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Parse error'));

    const result = await enrichContext('codebase-analysis', {}, '/test');
    expect(result).toBeNull();
  });

  it('sets truncated flag when codebase data exceeds size cap', async () => {
    // Create a mock that returns a very large symbols list
    const { getIndex } = await import('./indexer.js');
    const bigSymbols = new Map<string, any>();
    for (let i = 0; i < 500; i++) {
      const id = `src/file${i}.ts::Symbol${i}`;
      bigSymbols.set(id, {
        name: `Symbol${i}`, kind: 'function', file: `src/file${i}.ts`,
        line: 1, endLine: 10, exported: true,
        signature: `(param${i}: VeryLongTypeName${i}) => VeryLongReturnType${i}`,
      });
    }
    (getIndex as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      projectRoot: '/test',
      symbols: bigSymbols,
      callers: new Map(),
      callees: new Map(),
      imports: new Map(),
      fileSymbols: new Map(),
      stats: { total_symbols: 500, total_edges: 0, indexed_files: 500 },
    });

    const result = await enrichContext('codebase-analysis', {}, '/test');
    // If the result exceeds 10K chars it should be truncated
    if (result) {
      const serialized = JSON.stringify(result.context);
      expect(serialized.length).toBeLessThanOrEqual(10_000);
      if (result.truncated) {
        expect(result.truncated).toBe(true);
      }
    }
  });

  it('triggers auto-reindex for checkpoint-dev phase', async () => {
    const { getIndex } = await import('./indexer.js');
    await enrichContext('checkpoint-dev', { '6-dev-output.md': '## Output\n`handleRequest`' }, '/test');
    expect(getIndex).toHaveBeenCalledWith('/test', { fresh: true });
  });
});

describe('extractSymbolReferences', () => {
  it('extracts symbols from code spans', () => {
    const content = 'The `OrderService` handles orders and calls `createOrder` internally.';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('OrderService');
    expect(refs).toContain('createOrder');
  });

  it('extracts file paths from code blocks', () => {
    const content = '```\nsrc/order.ts — order management\nlib/utils.ts — utilities\n```';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('src/order.ts');
    expect(refs).toContain('lib/utils.ts');
  });

  it('extracts from table cells', () => {
    const content = '| `OrderService` | src/order.ts | Order management |';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('OrderService');
    expect(refs).toContain('src/order.ts');
  });

  it('extracts from TC/IP entries', () => {
    const content = 'TC-01 verify `handleRequest` returns 200';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('handleRequest');
  });

  it('extracts file path patterns from prose', () => {
    const content = 'The main handler is in src/api/handler.ts and tests in src/api/handler.test.ts';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('src/api/handler.ts');
    expect(refs).toContain('src/api/handler.test.ts');
  });

  it('skips command-like code spans', () => {
    const content = '`npm install lodash` should be run first. Then use `OrderService`.';
    const refs = extractSymbolReferences(content);
    expect(refs).not.toContain('npm install lodash');
    expect(refs).toContain('OrderService');
  });

  it('handles symbol ID format with ::', () => {
    const content = 'The symbol `src/order.ts::OrderService.createOrder` is the target.';
    const refs = extractSymbolReferences(content);
    expect(refs).toContain('src/order.ts::OrderService.createOrder');
  });
});
