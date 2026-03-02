import { describe, it, expect } from 'vitest';
import { resolveSymbol, analyzeImpact } from './impact.js';
import { buildGraph, addCallEdge } from './graph.js';
import type { CodeIndex, ExtractionResult, ImportInfo } from './types.js';

function makeIndex(
  symbols: Array<{ id: string; name: string; file: string; line: number; exported?: boolean }>,
  edges: Array<[string, string]> = [],
  imports?: Map<string, ImportInfo[]>,
): CodeIndex {
  const results: Array<{ file: string; result: ExtractionResult }> = [];
  const fileMap = new Map<string, Array<typeof symbols[number]>>();

  for (const sym of symbols) {
    if (!fileMap.has(sym.file)) fileMap.set(sym.file, []);
    fileMap.get(sym.file)!.push(sym);
  }

  for (const [file, syms] of fileMap) {
    results.push({
      file,
      result: {
        symbols: syms.map(s => ({
          name: s.id.split('::')[1] || s.name,
          kind: 'function' as const,
          file: s.file,
          line: s.line,
          endLine: s.line + 5,
          exported: s.exported !== false,
        })),
        calls: [],
        imports: imports ? (imports.get(file) || []) : [],
        exports: [],
      },
    });
  }

  const graph = buildGraph(results, '/test');

  // Manually set imports on the graph if provided
  if (imports) {
    for (const [file, imps] of imports) {
      graph.imports.set(file, imps);
    }
  }

  for (const [caller, callee] of edges) {
    addCallEdge(graph, caller, callee);
  }

  return graph;
}

describe('resolveSymbol', () => {
  it('exact ID match', () => {
    const index = makeIndex([
      { id: 'src/app.ts::main', name: 'main', file: 'src/app.ts', line: 1 },
    ]);
    const result = resolveSymbol('src/app.ts::main', index);
    expect(result).toEqual(['src/app.ts::main']);
  });

  it('qualified name suffix match', () => {
    const index = makeIndex([
      { id: 'src/app.ts::main', name: 'main', file: 'src/app.ts', line: 1 },
    ]);
    const result = resolveSymbol('main', index);
    expect(result).toEqual(['src/app.ts::main']);
  });

  it('returns multiple matches for ambiguous short name', () => {
    const index = makeIndex([
      { id: 'src/a.ts::process', name: 'process', file: 'src/a.ts', line: 1 },
      { id: 'src/b.ts::process', name: 'process', file: 'src/b.ts', line: 1 },
    ]);
    const result = resolveSymbol('process', index);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for unknown symbol', () => {
    const index = makeIndex([
      { id: 'src/app.ts::main', name: 'main', file: 'src/app.ts', line: 1 },
    ]);
    const result = resolveSymbol('nonexistent', index);
    expect(result).toEqual([]);
  });
});

describe('analyzeImpact', () => {
  it('returns direct callers at depth 1', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::caller1', name: 'caller1', file: 'src/b.ts', line: 1 },
        { id: 'src/c.ts::caller2', name: 'caller2', file: 'src/c.ts', line: 1 },
      ],
      [
        ['src/b.ts::caller1', 'src/a.ts::target'],
        ['src/c.ts::caller2', 'src/a.ts::target'],
      ],
    );

    const result = analyzeImpact('src/a.ts::target', index, 2);
    expect(result.symbol).toBe('src/a.ts::target');
    expect(result.direct).toHaveLength(2);
    expect(result.direct.map(d => d.symbol)).toContain('src/b.ts::caller1');
    expect(result.direct.map(d => d.symbol)).toContain('src/c.ts::caller2');
  });

  it('returns indirect callers at depth 2', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::direct', name: 'direct', file: 'src/b.ts', line: 1 },
        { id: 'src/c.ts::indirect', name: 'indirect', file: 'src/c.ts', line: 1 },
      ],
      [
        ['src/b.ts::direct', 'src/a.ts::target'],
        ['src/c.ts::indirect', 'src/b.ts::direct'],
      ],
    );

    const result = analyzeImpact('src/a.ts::target', index, 2);
    expect(result.direct).toHaveLength(1);
    expect(result.indirect).toHaveLength(1);
    expect(result.indirect[0].symbol).toBe('src/c.ts::indirect');
  });

  it('returns transitive callers at depth 3', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::d1', name: 'd1', file: 'src/b.ts', line: 1 },
        { id: 'src/c.ts::d2', name: 'd2', file: 'src/c.ts', line: 1 },
        { id: 'src/d.ts::d3', name: 'd3', file: 'src/d.ts', line: 1 },
      ],
      [
        ['src/b.ts::d1', 'src/a.ts::target'],
        ['src/c.ts::d2', 'src/b.ts::d1'],
        ['src/d.ts::d3', 'src/c.ts::d2'],
      ],
    );

    const result = analyzeImpact('src/a.ts::target', index, 3);
    expect(result.direct).toHaveLength(1);
    expect(result.indirect).toHaveLength(1);
    expect(result.transitive).toHaveLength(1);
    expect(result.transitive[0].symbol).toBe('src/d.ts::d3');
  });

  it('detects cycles without infinite loop', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::a', name: 'a', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::b', name: 'b', file: 'src/b.ts', line: 1 },
      ],
      [
        ['src/b.ts::b', 'src/a.ts::a'],
        ['src/a.ts::a', 'src/b.ts::b'], // cycle
      ],
    );

    const result = analyzeImpact('src/a.ts::a', index, 4);
    // Should complete without hanging
    expect(result.direct).toHaveLength(1);
    expect(result.symbol).toBe('src/a.ts::a');
  });

  it('separates test files', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
        { id: 'src/a.test.ts::testCaller', name: 'testCaller', file: 'src/a.test.ts', line: 1 },
        { id: 'src/__tests__/a.ts::testCaller2', name: 'testCaller2', file: 'src/__tests__/a.ts', line: 1 },
        { id: 'src/b.ts::prodCaller', name: 'prodCaller', file: 'src/b.ts', line: 1 },
      ],
      [
        ['src/a.test.ts::testCaller', 'src/a.ts::target'],
        ['src/__tests__/a.ts::testCaller2', 'src/a.ts::target'],
        ['src/b.ts::prodCaller', 'src/a.ts::target'],
      ],
    );

    const result = analyzeImpact('src/a.ts::target', index, 2);
    expect(result.direct).toHaveLength(1); // only prod caller
    expect(result.test_files).toContain('src/a.test.ts');
    expect(result.test_files).toContain('src/__tests__/a.ts');
    expect(result.files_affected).toContain('src/b.ts');
    expect(result.files_affected).not.toContain('src/a.test.ts');
  });

  it('caps depth at 4', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::t', name: 't', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::d1', name: 'd1', file: 'src/b.ts', line: 1 },
        { id: 'src/c.ts::d2', name: 'd2', file: 'src/c.ts', line: 1 },
        { id: 'src/d.ts::d3', name: 'd3', file: 'src/d.ts', line: 1 },
        { id: 'src/e.ts::d4', name: 'd4', file: 'src/e.ts', line: 1 },
        { id: 'src/f.ts::d5', name: 'd5', file: 'src/f.ts', line: 1 },
      ],
      [
        ['src/b.ts::d1', 'src/a.ts::t'],
        ['src/c.ts::d2', 'src/b.ts::d1'],
        ['src/d.ts::d3', 'src/c.ts::d2'],
        ['src/e.ts::d4', 'src/d.ts::d3'],
        ['src/f.ts::d5', 'src/e.ts::d4'], // depth 5 — should be excluded
      ],
    );

    const result = analyzeImpact('src/a.ts::t', index, 10); // request 10 but cap at 4
    const allSymbols = [...result.direct, ...result.indirect, ...result.transitive];
    expect(allSymbols.map(s => s.symbol)).not.toContain('src/f.ts::d5');
    expect(allSymbols).toHaveLength(4); // d1,d2,d3,d4
  });

  it('includes index_stats in response', () => {
    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
      ],
    );

    const result = analyzeImpact('src/a.ts::target', index, 2);
    expect(result.index_stats).toBeDefined();
    expect(result.index_stats.total_symbols).toBeGreaterThan(0);
    expect(typeof result.index_stats.total_edges).toBe('number');
    expect(typeof result.index_stats.indexed_files).toBe('number');
  });

  it('truncates at 200 symbols', () => {
    // Create a wide fan-out: 250 callers of the target
    const syms = [{ id: 'src/t.ts::target', name: 'target', file: 'src/t.ts', line: 1 }];
    const edges: Array<[string, string]> = [];

    for (let i = 0; i < 250; i++) {
      const file = `src/c${i}.ts`;
      syms.push({ id: `${file}::fn${i}`, name: `fn${i}`, file, line: 1 });
      edges.push([`${file}::fn${i}`, 'src/t.ts::target']);
    }

    const index = makeIndex(syms, edges);
    const result = analyzeImpact('src/t.ts::target', index, 2);

    const totalReported = result.direct.length + result.indirect.length + result.transitive.length + result.test_files.length;
    expect(totalReported).toBeLessThanOrEqual(200);
    expect(result.truncated).toBe(true);
  });
});

describe('inferred edges', () => {
  it('creates inferred edge for exported symbol with zero callers but imports', () => {
    const imports = new Map<string, ImportInfo[]>([
      ['src/server.ts', [{
        source: './context',
        names: [{ imported: 'assembleContext', local: 'assembleContext' }],
        isDefault: false,
        isNamespace: false,
        file: 'src/server.ts',
      }]],
    ]);

    const index = makeIndex(
      [
        { id: 'src/context.ts::assembleContext', name: 'assembleContext', file: 'src/context.ts', line: 1 },
        { id: 'src/server.ts::startServer', name: 'startServer', file: 'src/server.ts', line: 1 },
      ],
      [], // no call edges
      imports,
    );

    const result = analyzeImpact('src/context.ts::assembleContext', index, 2);
    expect(result.files_affected).toContain('src/server.ts');
  });

  it('no inferred edges when no file imports the module', () => {
    const index = makeIndex(
      [
        { id: 'src/helper.ts::helperFunction', name: 'helperFunction', file: 'src/helper.ts', line: 1 },
      ],
      [],
    );

    const result = analyzeImpact('src/helper.ts::helperFunction', index, 2);
    expect(result.files_affected).toHaveLength(0);
    expect(result.direct).toHaveLength(0);
  });

  it('does not create inferred edges when symbol has real callers', () => {
    const imports = new Map<string, ImportInfo[]>([
      ['src/server.ts', [{
        source: './target',
        names: [{ imported: 'target', local: 'target' }],
        isDefault: false,
        isNamespace: false,
        file: 'src/server.ts',
      }]],
    ]);

    const index = makeIndex(
      [
        { id: 'src/a.ts::target', name: 'target', file: 'src/a.ts', line: 1 },
        { id: 'src/b.ts::caller', name: 'caller', file: 'src/b.ts', line: 1 },
        { id: 'src/server.ts::handler', name: 'handler', file: 'src/server.ts', line: 1 },
      ],
      [['src/b.ts::caller', 'src/a.ts::target']],
      imports,
    );

    const result = analyzeImpact('src/a.ts::target', index, 2);
    // Has real callers so no inferred edges
    expect(result.direct).toHaveLength(1);
    expect(result.direct[0].symbol).toBe('src/b.ts::caller');
  });
});
