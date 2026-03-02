/**
 * Tool handlers for specflow_codebase and specflow_impact.
 * Dispatches actions to the appropriate modules.
 */

import type { CodeIndex, ImpactResponse, SymbolSummary } from './types.js';
import { getIndex, invalidateIndex } from './indexer.js';
import { scanProject } from './scanner.js';
import { detectPatterns } from './patterns.js';
import { resolveSymbol, analyzeImpact } from './impact.js';
import { resolveJsImport, resolvePyImport } from './resolver.js';

/** Max response size for truncation */
const MAX_RESPONSE_SIZE = 50_000;

/**
 * Handle specflow_codebase tool calls.
 * Dispatches: scan → scanner, symbols → graph, dependencies → resolver,
 * patterns → patterns, reindex → indexer, warmup → indexer.
 */
export async function handleCodebase(
  action: string,
  params: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<Record<string, unknown>> {
  switch (action) {
    case 'scan':
      return handleScan(projectRoot);

    case 'symbols':
      return handleSymbols(params, projectRoot);

    case 'dependencies':
      return handleDependencies(params, projectRoot);

    case 'patterns':
      return handlePatterns(params, projectRoot);

    case 'reindex':
      return handleReindex(projectRoot);

    case 'warmup':
      return handleWarmup(projectRoot);

    default:
      return { error: `Unknown action: "${action}". Valid actions: scan, symbols, dependencies, patterns, reindex, warmup` };
  }
}

/**
 * Handle specflow_impact tool calls.
 */
export async function handleImpact(
  symbol: string,
  depth: number | undefined,
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const index = await getIndex(projectRoot);
  const resolved = resolveSymbol(symbol, index);

  if (resolved.length === 0) {
    return {
      error: `Symbol "${symbol}" not found in the index`,
      hint: 'Use specflow_codebase("symbols", { path: "src/" }) to discover available symbols',
      index_stats: index.stats,
    };
  }

  if (resolved.length > 1) {
    // Multiple matches — return all with hint
    const matches = resolved.map(id => {
      const sym = index.symbols.get(id);
      return {
        symbol: id,
        file: sym?.file,
        line: sym?.line,
        kind: sym?.kind,
      };
    });
    return {
      ambiguous: true,
      matches,
      hint: 'Multiple symbols match. Use the full symbol ID for precise results.',
      index_stats: index.stats,
    };
  }

  const result = analyzeImpact(resolved[0], index, depth ?? 2);
  return result as unknown as Record<string, unknown>;
}

// ============================================================
// Action handlers
// ============================================================

async function handleScan(projectRoot: string): Promise<Record<string, unknown>> {
  const result = await scanProject(projectRoot);
  return result as unknown as Record<string, unknown>;
}

async function handleSymbols(
  params: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const path = params?.path as string | undefined;
  if (!path) {
    return { error: 'The "path" parameter is required for the symbols action' };
  }

  const kind = params?.kind as string | undefined;
  const depth = params?.depth as number | undefined;

  const index = await getIndex(projectRoot);
  const results: SymbolSummary[] = [];

  for (const [symId, sym] of index.symbols) {
    // Filter by path
    if (!sym.file.startsWith(path)) continue;

    // Filter by depth
    if (depth !== undefined) {
      const relPath = sym.file.slice(path.length);
      const slashes = (relPath.match(/\//g) || []).length;
      if (slashes > depth) continue;
    }

    // Filter by kind
    if (kind && sym.kind !== kind) continue;

    results.push({
      symbol: symId,
      name: sym.name,
      kind: sym.kind,
      file: sym.file,
      line: sym.line,
      exported: sym.exported,
      signature: sym.signature,
      parent: sym.parent,
    });
  }

  // Truncate if response too large
  const serialized = JSON.stringify(results);
  if (serialized.length > MAX_RESPONSE_SIZE) {
    const truncatedResults = truncateArray(results, MAX_RESPONSE_SIZE);
    return {
      symbols: truncatedResults,
      truncated: true,
      total: results.length,
      returned: truncatedResults.length,
    };
  }

  return { symbols: results, total: results.length };
}

async function handleDependencies(
  params: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const symbolParam = params?.symbol as string | undefined;
  if (!symbolParam) {
    return { error: 'The "symbol" parameter is required for the dependencies action' };
  }

  const index = await getIndex(projectRoot);
  const resolved = resolveSymbol(symbolParam, index);

  if (resolved.length === 0) {
    return { error: `Symbol "${symbolParam}" not found in the index` };
  }

  const symbolId = resolved[0];
  const sym = index.symbols.get(symbolId);
  if (!sym) {
    return { error: 'Symbol not found' };
  }

  // What does this file import?
  const fileImports = index.imports.get(sym.file) || [];
  const imports_from = fileImports.map(imp => ({
    source: imp.source,
    names: imp.names.map(n => n.local),
  }));

  // What files import this symbol from its file?
  const imported_by: Array<{ file: string; names: string[] }> = [];
  const indexedFiles = new Set(index.fileSymbols.keys());
  for (const [file, fileImps] of index.imports) {
    for (const imp of fileImps) {
      // Resolve the import source to verify it actually points to the target symbol's file
      const isPython = file.endsWith('.py');
      const resolvedFile = isPython
        ? resolvePyImport(imp.source, file, projectRoot, indexedFiles)
        : await resolveJsImport(imp.source, file, projectRoot, indexedFiles);
      if (resolvedFile !== sym.file) continue;

      for (const name of imp.names) {
        if (name.imported === sym.name || name.local === sym.name) {
          imported_by.push({
            file,
            names: [name.local],
          });
        }
      }
    }
  }

  return {
    symbol: symbolId,
    file: sym.file,
    imports_from,
    imported_by,
  };
}

async function handlePatterns(
  params: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const category = params?.category as string | undefined;
  const index = await getIndex(projectRoot);
  const patterns = detectPatterns(index, category);
  return { patterns };
}

async function handleReindex(projectRoot: string): Promise<Record<string, unknown>> {
  invalidateIndex();
  const index = await getIndex(projectRoot, { fresh: true });
  return {
    reindexed: true,
    stats: index.stats,
  };
}

async function handleWarmup(projectRoot: string): Promise<Record<string, unknown>> {
  const index = await getIndex(projectRoot);
  return {
    warmed_up: true,
    stats: index.stats,
  };
}

// ============================================================
// Helpers
// ============================================================

function truncateArray<T>(arr: T[], maxChars: number): T[] {
  let result: T[] = [];
  let currentSize = 2; // for "[]"

  for (const item of arr) {
    const itemStr = JSON.stringify(item);
    if (currentSize + itemStr.length + 1 > maxChars) break;
    result.push(item);
    currentSize += itemStr.length + 1;
  }

  return result;
}
