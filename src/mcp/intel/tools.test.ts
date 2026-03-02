import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCodebase, handleImpact } from './tools.js';

// Mock all dependencies
vi.mock('./indexer.js', () => ({
  getIndex: vi.fn().mockResolvedValue({
    projectRoot: '/test',
    symbols: new Map([
      ['src/app.ts::main', {
        name: 'main', kind: 'function', file: 'src/app.ts',
        line: 1, endLine: 10, exported: true,
        signature: '() => void',
      }],
      ['src/utils.ts::helper', {
        name: 'helper', kind: 'function', file: 'src/utils.ts',
        line: 1, endLine: 5, exported: true,
        signature: '(x: number) => number',
      }],
    ]),
    callers: new Map([
      ['src/utils.ts::helper', new Set(['src/app.ts::main'])],
    ]),
    callees: new Map([
      ['src/app.ts::main', new Set(['src/utils.ts::helper'])],
    ]),
    imports: new Map([
      ['src/app.ts', [{
        source: './utils', names: [{ imported: 'helper', local: 'helper' }],
        isDefault: false, isNamespace: false, file: 'src/app.ts',
      }]],
    ]),
    fileSymbols: new Map([
      ['src/app.ts', new Set(['src/app.ts::main'])],
      ['src/utils.ts', new Set(['src/utils.ts::helper'])],
    ]),
    stats: { total_symbols: 2, total_edges: 1, indexed_files: 2 },
  }),
  invalidateIndex: vi.fn(),
}));

vi.mock('./scanner.js', () => ({
  scanProject: vi.fn().mockResolvedValue({
    tech_stack: { language: 'typescript', runtime: 'node' },
    structure: { total_files: 2, by_language: { typescript: 2 }, source_dirs: ['src/'], test_dirs: [], entry_points: [] },
    config: {},
  }),
}));

vi.mock('./patterns.js', () => ({
  detectPatterns: vi.fn().mockReturnValue([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCodebase', () => {
  it('scan action returns tech stack info', async () => {
    const result = await handleCodebase('scan', undefined, '/test');
    expect(result.tech_stack).toBeDefined();
    expect((result.tech_stack as any).language).toBe('typescript');
  });

  it('symbols action requires path parameter', async () => {
    const result = await handleCodebase('symbols', undefined, '/test');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('path');
  });

  it('symbols action filters by path', async () => {
    const result = await handleCodebase('symbols', { path: 'src/' }, '/test');
    expect(result.symbols).toBeDefined();
    expect((result.symbols as any[]).length).toBeGreaterThan(0);
  });

  it('symbols action filters by kind', async () => {
    const result = await handleCodebase('symbols', { path: 'src/', kind: 'function' }, '/test');
    expect(result.symbols).toBeDefined();
    for (const sym of result.symbols as any[]) {
      expect(sym.kind).toBe('function');
    }
  });

  it('dependencies action requires symbol parameter', async () => {
    const result = await handleCodebase('dependencies', undefined, '/test');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('symbol');
  });

  it('dependencies action returns import chain', async () => {
    const result = await handleCodebase('dependencies', { symbol: 'main' }, '/test');
    expect(result.symbol).toBeDefined();
    expect(result.imports_from).toBeDefined();
  });

  it('patterns action returns detected patterns', async () => {
    const result = await handleCodebase('patterns', undefined, '/test');
    expect(result.patterns).toBeDefined();
  });

  it('reindex action rebuilds index', async () => {
    const { invalidateIndex } = await import('./indexer.js');
    const result = await handleCodebase('reindex', undefined, '/test');
    expect(result.reindexed).toBe(true);
    expect(result.stats).toBeDefined();
    expect(invalidateIndex).toHaveBeenCalled();
  });

  it('warmup action returns stats without rebuild', async () => {
    const result = await handleCodebase('warmup', undefined, '/test');
    expect(result.warmed_up).toBe(true);
    expect(result.stats).toBeDefined();
  });

  it('unknown action returns error', async () => {
    const result = await handleCodebase('invalid', undefined, '/test');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown action');
  });
});

describe('handleImpact', () => {
  it('returns impact for a known symbol', async () => {
    const result = await handleImpact('helper', undefined, '/test');
    expect(result.symbol).toBeDefined();
    expect(result.direct).toBeDefined();
    expect(result.index_stats).toBeDefined();
  });

  it('returns error for unknown symbol', async () => {
    const result = await handleImpact('nonexistent', undefined, '/test');
    expect(result.error).toBeDefined();
    expect(result.hint).toBeDefined();
    expect(result.index_stats).toBeDefined();
  });

  it('returns ambiguous matches when multiple symbols match', async () => {
    // Override mock with two symbols sharing a name
    const { getIndex } = await import('./indexer.js');
    (getIndex as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      projectRoot: '/test',
      symbols: new Map([
        ['src/a.ts::process', { name: 'process', kind: 'function', file: 'src/a.ts', line: 1, endLine: 5, exported: true }],
        ['src/b.ts::process', { name: 'process', kind: 'function', file: 'src/b.ts', line: 1, endLine: 5, exported: true }],
      ]),
      callers: new Map(),
      callees: new Map(),
      imports: new Map(),
      fileSymbols: new Map(),
      stats: { total_symbols: 2, total_edges: 0, indexed_files: 2 },
    });

    const result = await handleImpact('process', undefined, '/test');
    expect(result.ambiguous).toBe(true);
    expect(result.matches).toBeDefined();
    expect((result.matches as any[]).length).toBe(2);
  });

  it('respects depth parameter', async () => {
    const result = await handleImpact('helper', 1, '/test');
    expect(result.symbol).toBeDefined();
    // At depth 1, only direct callers should appear
    expect(result.direct).toBeDefined();
  });
});
