/**
 * Impact analysis — BFS upstream traversal through the call graph.
 * Provides depth-tiered blast radius grouping with cycle detection.
 */

import type { CodeIndex, ImpactResponse } from './types.js';

/** Hard depth cap */
const MAX_DEPTH = 4;

/** Maximum symbols in result */
const MAX_SYMBOLS = 200;

/** Test file patterns */
function isTestFile(file: string): boolean {
  return /\.(test|spec)\.[^/]+$/.test(file) ||
         file.includes('__tests__/');
}

/**
 * Resolve a symbol parameter to one or more symbol IDs.
 * Priority: exact ID match → qualified name suffix → short name match.
 */
export function resolveSymbol(
  symbol: string,
  index: CodeIndex,
): string[] {
  // Strategy 1: Exact ID match
  if (index.symbols.has(symbol)) {
    return [symbol];
  }

  // Strategy 2: Qualified name suffix match (after :: split)
  const suffixMatches: string[] = [];
  for (const symId of index.symbols.keys()) {
    const parts = symId.split('::');
    if (parts.length >= 2 && parts[1] === symbol) {
      suffixMatches.push(symId);
    }
  }
  if (suffixMatches.length > 0) return suffixMatches;

  // Strategy 3: Short name match
  const nameMatches: string[] = [];
  for (const [symId, sym] of index.symbols) {
    if (sym.name === symbol) {
      nameMatches.push(symId);
    }
  }
  return nameMatches;
}

/**
 * Perform BFS upstream traversal to find all callers of a symbol.
 */
export function analyzeImpact(
  symbolId: string,
  index: CodeIndex,
  maxDepth: number = 2,
): ImpactResponse {
  const effectiveDepth = Math.min(maxDepth, MAX_DEPTH);
  const sym = index.symbols.get(symbolId);

  const direct: Array<{ symbol: string; file: string; line: number }> = [];
  const indirect: Array<{ symbol: string; file: string; line: number }> = [];
  const transitive: Array<{ symbol: string; file: string; line: number }> = [];
  const filesAffectedSet = new Set<string>();
  const testFilesSet = new Set<string>();

  // BFS
  const visited = new Set<string>();
  visited.add(symbolId);

  let currentLevel = new Set<string>([symbolId]);
  let totalSymbols = 0;
  let truncated = false;

  for (let depth = 1; depth <= effectiveDepth; depth++) {
    const nextLevel = new Set<string>();

    for (const current of currentLevel) {
      const callers = index.callers.get(current);
      if (!callers) continue;

      for (const callerId of callers) {
        if (visited.has(callerId)) continue;
        visited.add(callerId);

        const callerSym = index.symbols.get(callerId);
        if (!callerSym) continue;

        totalSymbols++;
        if (totalSymbols > MAX_SYMBOLS) {
          truncated = true;
          break;
        }

        const entry = {
          symbol: callerId,
          file: callerSym.file,
          line: callerSym.line,
        };

        // Separate test files
        if (isTestFile(callerSym.file)) {
          testFilesSet.add(callerSym.file);
        } else {
          filesAffectedSet.add(callerSym.file);

          if (depth === 1) direct.push(entry);
          else if (depth === 2) indirect.push(entry);
          else transitive.push(entry);
        }

        nextLevel.add(callerId);
      }

      if (truncated) break;
    }

    if (truncated) break;
    currentLevel = nextLevel;
  }

  // Inferred edges: for exported symbols with zero callers, check import-based connections
  if (direct.length === 0 && sym?.exported) {
    const symFile = sym.file;
    for (const [file, fileImports] of index.imports) {
      if (file === symFile) continue;
      for (const imp of fileImports) {
        // Check if import source resolves to the symbol's file
        // Use a simple heuristic: source ends with the file basename (without extension)
        const fileBase = symFile.replace(/\.[^/.]+$/, '').replace(/.*\//, '');
        const sourceBase = imp.source.replace(/\.[^/.]+$/, '').replace(/.*\//, '');
        if (sourceBase === fileBase || imp.source.endsWith('/' + fileBase)) {
          // Check if this import specifically imports the symbol's name
          const importsSymbol = imp.names.some(n => n.imported === sym.name || n.imported === 'default');
          if (importsSymbol || imp.isNamespace) {
            if (!filesAffectedSet.has(file) && !testFilesSet.has(file)) {
              if (isTestFile(file)) {
                testFilesSet.add(file);
              } else {
                filesAffectedSet.add(file);
                direct.push({
                  symbol: `${file}::inferred`,
                  file,
                  line: 0,
                });
              }
            }
          }
        }
      }
    }
  }

  return {
    symbol: symbolId,
    direct,
    indirect,
    transitive,
    files_affected: [...filesAffectedSet],
    test_files: [...testFilesSet],
    truncated: truncated || undefined,
    total_count: truncated ? totalSymbols : undefined,
    index_stats: {
      total_symbols: index.stats.total_symbols,
      total_edges: index.stats.total_edges,
      indexed_files: index.stats.indexed_files,
    },
  };
}
