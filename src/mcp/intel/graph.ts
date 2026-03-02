/**
 * In-memory call graph data structures.
 * Symbols Map, callers/callees adjacency Maps, imports Map, fileSymbols reverse lookup.
 */

import type { CodeIndex, ExtractionResult, SymbolInfo, ImportInfo } from './types.js';

/**
 * Build the code graph from parsed extraction results.
 * Populates symbols, imports, fileSymbols, and empty adjacency maps.
 * Call edges are populated later by the resolver.
 */
export function buildGraph(
  results: Array<{ file: string; result: ExtractionResult }>,
  projectRoot: string,
): CodeIndex {
  const symbols = new Map<string, SymbolInfo>();
  const callers = new Map<string, Set<string>>();
  const callees = new Map<string, Set<string>>();
  const imports = new Map<string, ImportInfo[]>();
  const fileSymbols = new Map<string, Set<string>>();

  for (const { file, result } of results) {
    // Register symbols
    for (const sym of result.symbols) {
      const qualifiedName = sym.parent ? `${sym.parent}.${sym.name}` : sym.name;
      const symbolId = `${file}::${qualifiedName}`;
      symbols.set(symbolId, sym);

      // File → symbols reverse lookup
      if (!fileSymbols.has(file)) {
        fileSymbols.set(file, new Set());
      }
      fileSymbols.get(file)!.add(symbolId);
    }

    // Register imports
    if (result.imports.length > 0) {
      imports.set(file, result.imports);
    }
  }

  return {
    projectRoot,
    symbols,
    callers,
    callees,
    imports,
    fileSymbols,
    stats: {
      total_symbols: symbols.size,
      total_edges: 0,
      indexed_files: results.length,
    },
  };
}

/**
 * Add a call edge to the graph.
 */
export function addCallEdge(
  graph: CodeIndex,
  callerId: string,
  calleeId: string,
): void {
  // callees: what does the caller call?
  if (!graph.callees.has(callerId)) {
    graph.callees.set(callerId, new Set());
  }
  graph.callees.get(callerId)!.add(calleeId);

  // callers: what calls the callee?
  if (!graph.callers.has(calleeId)) {
    graph.callers.set(calleeId, new Set());
  }
  graph.callers.get(calleeId)!.add(callerId);

  // Update edge count
  graph.stats.total_edges++;
}
