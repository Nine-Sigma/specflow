import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveJsImport, resolvePyImport, resolveAllCalls, clearResolverCache } from './resolver.js';
import { buildGraph, addCallEdge } from './graph.js';
import type { ExtractionResult, CodeIndex } from './types.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-resolver-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
  clearResolverCache();
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  clearResolverCache();
});

describe('resolveJsImport', () => {
  it('resolves relative import with extension probing', async () => {
    const indexedFiles = new Set(['src/index.ts', 'src/utils.ts']);
    const result = await resolveJsImport('./utils', 'src/index.ts', testDir, indexedFiles);
    expect(result).toBe('src/utils.ts');
  });

  it('probes .tsx extension', async () => {
    const indexedFiles = new Set(['src/index.ts', 'src/App.tsx']);
    const result = await resolveJsImport('./App', 'src/index.ts', testDir, indexedFiles);
    expect(result).toBe('src/App.tsx');
  });

  it('probes index.ts for directory imports', async () => {
    const indexedFiles = new Set(['src/app.ts', 'src/utils/index.ts']);
    const result = await resolveJsImport('./utils', 'src/app.ts', testDir, indexedFiles);
    expect(result).toBe('src/utils/index.ts');
  });

  it('resolves tsconfig path aliases', async () => {
    await writeFile(
      join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: { '@/*': ['./src/*'] },
        },
      }),
    );

    const indexedFiles = new Set(['src/utils/helpers.ts']);
    const result = await resolveJsImport('@/utils/helpers', 'src/app.ts', testDir, indexedFiles);
    expect(result).toBe('src/utils/helpers.ts');
  });

  it('returns null for bare specifiers (npm packages)', async () => {
    const indexedFiles = new Set(['src/app.ts']);
    const result = await resolveJsImport('lodash', 'src/app.ts', testDir, indexedFiles);
    expect(result).toBeNull();
  });

  it('caches resolution results', async () => {
    const indexedFiles = new Set(['src/index.ts', 'src/utils.ts']);
    const result1 = await resolveJsImport('./utils', 'src/index.ts', testDir, indexedFiles);
    const result2 = await resolveJsImport('./utils', 'src/index.ts', testDir, indexedFiles);
    expect(result1).toBe(result2);
  });

  it('handles parent directory traversal', async () => {
    const indexedFiles = new Set(['src/api/handler.ts', 'src/utils.ts']);
    const result = await resolveJsImport('../utils', 'src/api/handler.ts', testDir, indexedFiles);
    expect(result).toBe('src/utils.ts');
  });
});

describe('resolvePyImport', () => {
  it('resolves absolute import from project root', () => {
    const indexedFiles = new Set(['app/models.py', 'app/views.py']);
    const result = resolvePyImport('app.models', 'app/views.py', testDir, indexedFiles);
    expect(result).toBe('app/models.py');
  });

  it('resolves relative import', () => {
    const indexedFiles = new Set(['app/utils.py', 'app/views.py']);
    const result = resolvePyImport('.utils', 'app/views.py', testDir, indexedFiles);
    expect(result).toBe('app/utils.py');
  });

  it('returns null for stdlib modules', () => {
    const indexedFiles = new Set(['app/main.py']);
    const result = resolvePyImport('os', 'app/main.py', testDir, indexedFiles);
    expect(result).toBeNull();
  });

  it('returns null for stdlib submodules', () => {
    const indexedFiles = new Set(['app/main.py']);
    const result = resolvePyImport('pathlib.Path', 'app/main.py', testDir, indexedFiles);
    expect(result).toBeNull();
  });

  it('resolves package __init__.py', () => {
    const indexedFiles = new Set(['app/__init__.py', 'main.py']);
    const result = resolvePyImport('app', 'main.py', testDir, indexedFiles);
    expect(result).toBe('app/__init__.py');
  });
});

describe('resolveAllCalls — 4-strategy chain', () => {
  function makeGraph(
    results: Array<{ file: string; result: ExtractionResult }>,
  ): CodeIndex {
    return buildGraph(results, testDir);
  }

  it('Strategy 1: same-file exact match', () => {
    const results = [
      {
        file: 'src/app.ts',
        result: {
          symbols: [
            { name: 'helper', kind: 'function' as const, file: 'src/app.ts', line: 1, endLine: 3, exported: false },
            { name: 'main', kind: 'function' as const, file: 'src/app.ts', line: 5, endLine: 8, exported: true },
          ],
          calls: [
            { callerSymbol: 'main', targetName: 'helper', file: 'src/app.ts', line: 6, isMethodCall: false },
          ],
          imports: [],
          exports: [],
        },
      },
    ];

    const graph = makeGraph(results);
    resolveAllCalls(results, graph, testDir);

    const callers = graph.callers.get('src/app.ts::helper');
    expect(callers).toBeDefined();
    expect(callers!.has('src/app.ts::main')).toBe(true);
  });

  it('Strategy 4: global fuzzy match with single-match-only constraint', () => {
    const results = [
      {
        file: 'src/a.ts',
        result: {
          symbols: [
            { name: 'uniqueHelper', kind: 'function' as const, file: 'src/a.ts', line: 1, endLine: 3, exported: true },
          ],
          calls: [],
          imports: [],
          exports: [],
        },
      },
      {
        file: 'src/b.ts',
        result: {
          symbols: [
            { name: 'caller', kind: 'function' as const, file: 'src/b.ts', line: 1, endLine: 3, exported: true },
          ],
          calls: [
            { callerSymbol: 'caller', targetName: 'uniqueHelper', file: 'src/b.ts', line: 2, isMethodCall: false },
          ],
          imports: [],
          exports: [],
        },
      },
    ];

    const graph = makeGraph(results);
    resolveAllCalls(results, graph, testDir);

    // Should resolve via global fuzzy since uniqueHelper is the only symbol with that name
    const callers = graph.callers.get('src/a.ts::uniqueHelper');
    expect(callers).toBeDefined();
    expect(callers!.has('src/b.ts::caller')).toBe(true);
  });

  it('skips ambiguous global match', () => {
    const results = [
      {
        file: 'src/a.ts',
        result: {
          symbols: [
            { name: 'process', kind: 'function' as const, file: 'src/a.ts', line: 1, endLine: 3, exported: true },
          ],
          calls: [],
          imports: [],
          exports: [],
        },
      },
      {
        file: 'src/b.ts',
        result: {
          symbols: [
            { name: 'process', kind: 'function' as const, file: 'src/b.ts', line: 1, endLine: 3, exported: true },
          ],
          calls: [],
          imports: [],
          exports: [],
        },
      },
      {
        file: 'src/c.ts',
        result: {
          symbols: [
            { name: 'main', kind: 'function' as const, file: 'src/c.ts', line: 1, endLine: 3, exported: true },
          ],
          calls: [
            { callerSymbol: 'main', targetName: 'process', file: 'src/c.ts', line: 2, isMethodCall: false },
          ],
          imports: [],
          exports: [],
        },
      },
    ];

    const graph = makeGraph(results);
    resolveAllCalls(results, graph, testDir);

    // Should NOT resolve because 'process' exists in two files
    const callersA = graph.callers.get('src/a.ts::process');
    const callersB = graph.callers.get('src/b.ts::process');
    expect(callersA).toBeUndefined();
    expect(callersB).toBeUndefined();
  });

  it('skips builtin calls', () => {
    const results = [
      {
        file: 'src/app.ts',
        result: {
          symbols: [
            { name: 'main', kind: 'function' as const, file: 'src/app.ts', line: 1, endLine: 5, exported: true },
          ],
          calls: [
            { callerSymbol: 'main', targetName: 'log', file: 'src/app.ts', line: 2, isMethodCall: true, receiver: 'console' },
            { callerSymbol: 'main', targetName: 'setTimeout', file: 'src/app.ts', line: 3, isMethodCall: false },
          ],
          imports: [],
          exports: [],
        },
      },
    ];

    const graph = makeGraph(results);
    resolveAllCalls(results, graph, testDir);
    expect(graph.stats.total_edges).toBe(0);
  });

  it('cache is invalidated by clearResolverCache', async () => {
    const indexedFiles = new Set(['src/index.ts', 'src/utils.ts']);
    const result1 = await resolveJsImport('./utils', 'src/index.ts', testDir, indexedFiles);
    expect(result1).toBe('src/utils.ts');

    clearResolverCache();

    // After clearing, should still work (rebuilds cache)
    const result2 = await resolveJsImport('./utils', 'src/index.ts', testDir, indexedFiles);
    expect(result2).toBe('src/utils.ts');
  });
});
