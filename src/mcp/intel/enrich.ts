/**
 * Context enrichment bridge.
 * Connects the code index to assembleContext() by extracting symbol references
 * from artifacts and computing blast radius.
 */

import { PHASE_CODEBASE_MAP } from '../types.js';
import type {
  CodebaseContext,
  ImpactSummary,
  SymbolSummary,
  TechStackSummary,
  PatternInfo,
  CodeIndex,
} from './types.js';
import { getIndex } from './indexer.js';
import { scanProject } from './scanner.js';
import { detectPatterns } from './patterns.js';
import { resolveSymbol, analyzeImpact } from './impact.js';

/** Maximum serialized size for the codebase field */
export const CODEBASE_SIZE_CAP = 10_000;

/** Enrichment warning */
export interface EnrichmentWarning {
  type: string;
  message: string;
}

/**
 * Enrich context with codebase intelligence for a given phase.
 * Returns null if phase doesn't need codebase data or indexing fails.
 */
export async function enrichContext(
  phase: string,
  artifacts: Record<string, string>,
  projectRoot: string,
): Promise<{ context: CodebaseContext; truncated: boolean; warnings?: EnrichmentWarning[] } | null> {
  const phaseConfig = PHASE_CODEBASE_MAP[phase];
  if (!phaseConfig) return null;

  try {
    // Auto-reindex for checkpoint phases
    const index = await getIndex(projectRoot, phaseConfig.autoReindex ? { fresh: true } : undefined);
    const context: CodebaseContext = {};
    let truncated = false;
    const warnings: EnrichmentWarning[] = [];

    for (const field of phaseConfig.fields) {
      switch (field) {
        case 'scan': {
          context.scan = await scanProject(projectRoot);
          break;
        }

        case 'symbols': {
          context.symbols = extractTopLevelSymbols(index);
          break;
        }

        case 'impact': {
          if (phaseConfig.artifactSource) {
            const artifactContent = artifacts[phaseConfig.artifactSource];
            if (artifactContent) {
              const symbolRefs = extractSymbolReferences(artifactContent);
              context.impact = computeImpactSummaries(symbolRefs, index);
            } else {
              context.impact = [];
              warnings.push({
                type: 'enrichment_source_missing',
                message: `Artifact "${phaseConfig.artifactSource}" not found in artifacts map — impact analysis skipped`,
              });
            }
          }
          break;
        }

        case 'patterns': {
          context.patterns = detectPatterns(index);
          break;
        }
      }
    }

    // Enforce size cap
    const result = enforceCapWithTruncation(context);
    return {
      context: result.context,
      truncated: result.truncated,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (err) {
    console.error(`[specflow-intel] Enrichment failed for phase "${phase}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Extract top-level symbols for the codebase-analysis phase.
 */
function extractTopLevelSymbols(index: CodeIndex): SymbolSummary[] {
  const summaries: SymbolSummary[] = [];

  for (const [symId, sym] of index.symbols) {
    // Only include exported, non-method symbols
    if (!sym.exported || sym.parent) continue;

    summaries.push({
      symbol: symId,
      name: sym.name,
      kind: sym.kind,
      file: sym.file,
      line: sym.line,
      exported: sym.exported,
      signature: sym.signature,
    });
  }

  return summaries;
}

/**
 * Extract symbol references from artifact content using structured extraction.
 * Only extracts from code spans, code blocks, tables, and TC/IP entries.
 * Does NOT scan bare prose words.
 */
export function extractSymbolReferences(content: string): string[] {
  const refs = new Set<string>();

  // 1. Inline code spans: `SymbolName`
  const codeSpanRegex = /`([^`]+)`/g;
  let match;
  while ((match = codeSpanRegex.exec(content)) !== null) {
    const text = match[1].trim();
    // Skip if it looks like a command, path with spaces, or markdown
    if (text.includes(' ') && !text.includes('.')) continue;
    // Extract function/class names
    if (/^[A-Za-z_][\w.]*$/.test(text)) {
      refs.add(text);
    }
    // Extract file paths with symbol references
    if (text.includes('::')) {
      refs.add(text);
    }
  }

  // 2. Fenced code blocks — extract identifiers from code
  const codeBlockRegex = /```[\s\S]*?```/g;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const block = match[0];
    // Extract file paths from code blocks
    const filePathRegex = /(?:src|lib|app)\/[\w/.-]+\.\w+/g;
    let pathMatch;
    while ((pathMatch = filePathRegex.exec(block)) !== null) {
      refs.add(pathMatch[0]);
    }
  }

  // 3. Structured tables — extract from "Modified Files", "Changed Files", "Affected Files"
  const tableRowRegex = /\|[^|]*\|/g;
  while ((match = tableRowRegex.exec(content)) !== null) {
    const cell = match[0].replace(/^\||\|$/g, '').trim();
    // Extract file paths from table cells
    const pathInCell = cell.match(/(?:src|lib|app)\/[\w/.-]+\.\w+/);
    if (pathInCell) refs.add(pathInCell[0]);
    // Extract symbol names from table cells (e.g., backtick-wrapped)
    const symInCell = cell.match(/`([A-Za-z_][\w.]*)`/);
    if (symInCell) refs.add(symInCell[1]);
  }

  // 4. TC-XX / IP-XX entries — extract symbol/file references from descriptions
  const tcIpRegex = /(?:TC|IP)-\d+[^|\n]*?`([A-Za-z_][\w.]*)`/g;
  while ((match = tcIpRegex.exec(content)) !== null) {
    refs.add(match[1]);
  }

  // 5. File path patterns in prose
  const prosePathRegex = /(?:^|[\s(])((src|lib|app)\/[\w/.-]+\.\w+)/gm;
  while ((match = prosePathRegex.exec(content)) !== null) {
    refs.add(match[1]);
  }

  return [...refs];
}

/**
 * Compute impact summaries for a set of symbol references.
 */
function computeImpactSummaries(
  symbolRefs: string[],
  index: CodeIndex,
): ImpactSummary[] {
  const summaries: ImpactSummary[] = [];

  for (const ref of symbolRefs) {
    // Try to resolve each reference
    const resolved = resolveSymbolRef(ref, index);
    if (!resolved) continue;

    const sym = index.symbols.get(resolved);
    if (!sym) continue;

    // Compute blast radius at depth 2
    const impact = analyzeImpact(resolved, index, 2);

    summaries.push({
      symbol: resolved,
      signature: sym.signature,
      direct_callers: impact.direct.map(d => ({
        symbol: d.symbol.split('::').pop() || d.symbol,
        file: d.file,
        line: d.line,
      })),
      files_affected: impact.files_affected.length,
      test_files: impact.test_files,
    });
  }

  return summaries;
}

/**
 * Try to resolve a reference string to a symbol ID.
 */
function resolveSymbolRef(ref: string, index: CodeIndex): string | null {
  // If it's a file path, look for symbols in that file
  if (ref.includes('/') && !ref.includes('::')) {
    const fileSyms = index.fileSymbols.get(ref);
    if (fileSyms) {
      // Return the first exported symbol in the file
      for (const symId of fileSyms) {
        const sym = index.symbols.get(symId);
        if (sym?.exported) return symId;
      }
    }
    return null;
  }

  // Use the standard symbol resolution
  const resolved = resolveSymbol(ref, index);
  return resolved.length === 1 ? resolved[0] : null;
}

/**
 * Enforce the 10,000 char size cap with priority-ordered truncation.
 */
function enforceCapWithTruncation(
  context: CodebaseContext,
): { context: CodebaseContext; truncated: boolean } {
  let serialized = JSON.stringify(context);
  if (serialized.length <= CODEBASE_SIZE_CAP) {
    return { context, truncated: false };
  }

  // Step 1: Strip test_files arrays
  if (context.impact) {
    for (const entry of context.impact) {
      entry.test_files = [];
    }
    serialized = JSON.stringify(context);
    if (serialized.length <= CODEBASE_SIZE_CAP) {
      return { context, truncated: true };
    }
  }

  // Step 2: Drop transitive callers (already not included in impact summaries)
  // Step 3: Drop indirect callers (already not included - summaries only have direct_callers)

  // Step 4: Within direct callers, drop entries with fewest callers first
  if (context.impact) {
    context.impact.sort((a, b) => b.direct_callers.length - a.direct_callers.length);

    while (JSON.stringify(context).length > CODEBASE_SIZE_CAP && context.impact.length > 0) {
      context.impact.pop(); // Remove least-connected
    }

    serialized = JSON.stringify(context);
    if (serialized.length <= CODEBASE_SIZE_CAP) {
      return { context, truncated: true };
    }
  }

  // Step 5: Truncate direct caller detail lists (keep counts)
  if (context.impact) {
    for (const entry of context.impact) {
      const count = entry.direct_callers.length;
      entry.direct_callers = [];
      entry.files_affected = count;
    }
  }

  // Also truncate symbols if present
  if (context.symbols) {
    while (JSON.stringify(context).length > CODEBASE_SIZE_CAP && context.symbols.length > 0) {
      context.symbols.pop();
    }
  }

  return { context, truncated: true };
}
