import { describe, it, expect } from 'vitest';
import { detectHandlers, detectBarrels } from './patterns.js';
import { buildGraph } from './graph.js';
import type { CodeIndex, ExtractionResult } from './types.js';

function makeIndex(
  fileSymbols: Array<{
    file: string;
    symbols: Array<{ name: string; kind: string; exported: boolean; parent?: string }>;
  }>,
): CodeIndex {
  const results: Array<{ file: string; result: ExtractionResult }> = fileSymbols.map(fs => ({
    file: fs.file,
    result: {
      symbols: fs.symbols.map((s, i) => ({
        name: s.name,
        kind: s.kind as any,
        file: fs.file,
        line: i + 1,
        endLine: i + 5,
        exported: s.exported,
        parent: s.parent,
      })),
      calls: [],
      imports: [],
      exports: [],
    },
  }));

  return buildGraph(results, '/test');
}

describe('detectHandlers', () => {
  it('detects files with 2+ exported handler functions', () => {
    const index = makeIndex([{
      file: 'src/server.ts',
      symbols: [
        { name: 'handleState', kind: 'function', exported: true },
        { name: 'handleContext', kind: 'function', exported: true },
        { name: 'handleValidate', kind: 'function', exported: true },
      ],
    }]);

    const patterns = detectHandlers(index);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('handlers');
    expect(patterns[0].files).toContain('src/server.ts');
  });

  it('does not match files with only 1 handler function', () => {
    const index = makeIndex([{
      file: 'src/util.ts',
      symbols: [
        { name: 'handleError', kind: 'function', exported: true },
        { name: 'formatDate', kind: 'function', exported: true },
      ],
    }]);

    const patterns = detectHandlers(index);
    expect(patterns).toHaveLength(0);
  });

  it('ignores non-exported handler functions', () => {
    const index = makeIndex([{
      file: 'src/internal.ts',
      symbols: [
        { name: 'handleInternal', kind: 'function', exported: false },
        { name: 'processData', kind: 'function', exported: false },
      ],
    }]);

    const patterns = detectHandlers(index);
    expect(patterns).toHaveLength(0);
  });

  it('matches process*, validate*, assemble* prefixes', () => {
    const index = makeIndex([{
      file: 'src/pipeline.ts',
      symbols: [
        { name: 'processInput', kind: 'function', exported: true },
        { name: 'validateOutput', kind: 'function', exported: true },
        { name: 'assembleResult', kind: 'function', exported: true },
      ],
    }]);

    const patterns = detectHandlers(index);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].files).toContain('src/pipeline.ts');
  });

  it('ignores methods (symbols with parent)', () => {
    const index = makeIndex([{
      file: 'src/service.ts',
      symbols: [
        { name: 'handleRequest', kind: 'method', exported: true, parent: 'Service' },
        { name: 'processData', kind: 'method', exported: true, parent: 'Service' },
      ],
    }]);

    const patterns = detectHandlers(index);
    expect(patterns).toHaveLength(0);
  });
});

describe('detectBarrels', () => {
  it('detects index.ts files where >50% symbols are re-exports', () => {
    const index = makeIndex([
      {
        file: 'src/intel/index.ts',
        symbols: [
          { name: 'handleCodebase', kind: 'function', exported: true },
          { name: 'handleImpact', kind: 'function', exported: true },
          { name: 'enrichContext', kind: 'function', exported: true },
        ],
      },
      {
        file: 'src/intel/tools.ts',
        symbols: [
          { name: 'handleCodebase', kind: 'function', exported: true },
          { name: 'handleImpact', kind: 'function', exported: true },
        ],
      },
      {
        file: 'src/intel/enrich.ts',
        symbols: [
          { name: 'enrichContext', kind: 'function', exported: true },
        ],
      },
    ]);

    const patterns = detectBarrels(index);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('barrel');
    expect(patterns[0].files).toContain('src/intel/index.ts');
  });

  it('does not match index.ts with mostly original code', () => {
    const index = makeIndex([
      {
        file: 'src/app/index.ts',
        symbols: [
          { name: 'main', kind: 'function', exported: true },
          { name: 'init', kind: 'function', exported: true },
          { name: 'cleanup', kind: 'function', exported: true },
        ],
      },
    ]);

    const patterns = detectBarrels(index);
    expect(patterns).toHaveLength(0);
  });

  it('only checks index.ts and index.js files', () => {
    const index = makeIndex([
      {
        file: 'src/utils.ts',
        symbols: [
          { name: 'format', kind: 'function', exported: true },
        ],
      },
    ]);

    const patterns = detectBarrels(index);
    expect(patterns).toHaveLength(0);
  });
});
