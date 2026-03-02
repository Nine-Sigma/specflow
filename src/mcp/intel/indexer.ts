/**
 * Tree-sitter indexer.
 * Handles parser initialization, grammar loading, file parsing,
 * and orchestrates the full index build pipeline.
 */

import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { createRequire } from 'module';
import type { CodeIndex, ExtractionResult } from './types.js';
import { discoverFiles } from './filter.js';
import { walkTypescript } from './languages/typescript.js';
import { walkJavascript } from './languages/javascript.js';
import { walkPython } from './languages/python.js';
import { buildGraph } from './graph.js';
import { resolveAllCalls, clearResolverCache } from './resolver.js';

// Use createRequire for resolving node_modules paths in ESM
const require = createRequire(import.meta.url);

// Lazy parser initialization
let ParserClass: typeof import('web-tree-sitter').Parser | null = null;
let LanguageClass: typeof import('web-tree-sitter').Language | null = null;
let parserInitialized = false;

// Grammar cache
const grammars = new Map<string, unknown>();

/** Extension to grammar name and walker module mapping */
export const EXTENSION_MAP: Record<string, { grammar: string; walker: 'typescript' | 'javascript' | 'python' }> = {
  '.ts':  { grammar: 'typescript', walker: 'typescript' },
  '.tsx': { grammar: 'tsx',        walker: 'typescript' },
  '.js':  { grammar: 'javascript', walker: 'javascript' },
  '.jsx': { grammar: 'javascript', walker: 'javascript' },
  '.mjs': { grammar: 'javascript', walker: 'javascript' },
  '.cjs': { grammar: 'javascript', walker: 'javascript' },
  '.py':  { grammar: 'python',     walker: 'python' },
};

/** Walker function type */
type WalkerFn = (tree: import('web-tree-sitter').Tree, filePath: string) => ExtractionResult;

const WALKERS: Record<string, WalkerFn> = {
  typescript: walkTypescript,
  javascript: walkJavascript,
  python: walkPython,
};

/**
 * Initialize the tree-sitter parser lazily.
 */
async function initParser(): Promise<void> {
  if (parserInitialized) return;

  const mod = await import('web-tree-sitter');
  ParserClass = mod.Parser;
  LanguageClass = mod.Language;
  await ParserClass.init();
  parserInitialized = true;
}

/**
 * Load and cache a grammar by name.
 */
async function getGrammar(grammarName: string): Promise<unknown> {
  if (grammars.has(grammarName)) {
    return grammars.get(grammarName)!;
  }

  await initParser();
  const wasmPath = require.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammarName}.wasm`);
  const grammar = await LanguageClass!.load(wasmPath);
  grammars.set(grammarName, grammar);
  return grammar;
}

/**
 * Parse a single file and extract symbols, calls, imports, and exports.
 */
async function parseFile(
  filePath: string,
  projectRoot: string,
): Promise<ExtractionResult | null> {
  const ext = extname(filePath);
  const mapping = EXTENSION_MAP[ext];
  if (!mapping) return null;

  try {
    await initParser();
    const grammar = await getGrammar(mapping.grammar);
    const parser = new ParserClass!();
    parser.setLanguage(grammar as import('web-tree-sitter').Language);

    const content = await readFile(join(projectRoot, filePath), 'utf8');
    const tree = parser.parse(content);
    if (!tree) return null;

    const walker = WALKERS[mapping.walker];
    return walker(tree, filePath);
  } catch (err) {
    // Log warning but continue indexing other files
    console.error(`[specflow-intel] Failed to parse ${filePath}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Build a complete code index for a project.
 * Orchestrates file discovery, parsing, extraction, resolution, and graph construction.
 */
export async function buildIndex(projectRoot: string): Promise<CodeIndex> {
  const files = await discoverFiles(projectRoot);

  // Parse all files and collect extraction results
  const allResults: Array<{ file: string; result: ExtractionResult }> = [];

  for (const file of files) {
    const result = await parseFile(file, projectRoot);
    if (result) {
      allResults.push({ file, result });
    }
  }

  // Build the symbol graph from all extraction results
  const graph = buildGraph(allResults, projectRoot);

  // Resolve calls to symbol IDs
  resolveAllCalls(allResults, graph, projectRoot);

  return graph;
}

// Module-level singleton with promise guard for lazy indexing
let cachedIndex: CodeIndex | null = null;
let buildingPromise: Promise<CodeIndex> | null = null;

/**
 * Get or build the code index for a project.
 * Concurrent calls share the same in-flight build.
 */
export async function getIndex(
  projectRoot: string,
  options?: { fresh?: boolean },
): Promise<CodeIndex> {
  if (options?.fresh) {
    // Atomically replace the promise BEFORE awaiting — concurrent callers
    // will await the new build, not read stale data
    buildingPromise = buildIndex(projectRoot).then(index => {
      cachedIndex = index;
      buildingPromise = null;
      return index;
    }).catch(err => {
      buildingPromise = null;
      throw err;
    });
    cachedIndex = null;
    return buildingPromise;
  }

  if (cachedIndex && cachedIndex.projectRoot === projectRoot) {
    return cachedIndex;
  }

  if (buildingPromise) {
    return buildingPromise;
  }

  buildingPromise = buildIndex(projectRoot).then(index => {
    cachedIndex = index;
    buildingPromise = null;
    return index;
  }).catch(err => {
    buildingPromise = null;
    throw err;
  });

  return buildingPromise;
}

/**
 * Invalidate the cached index (used by reindex action).
 */
export function invalidateIndex(): void {
  cachedIndex = null;
  buildingPromise = null;
  clearResolverCache();
}
