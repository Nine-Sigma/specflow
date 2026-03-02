/**
 * Code intelligence type definitions.
 * All interfaces for the tree-sitter parsing, call graph, and impact analysis engine.
 */

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'method' | 'type' | 'interface' | 'constant' | 'variable';
  file: string;          // relative path from project root
  line: number;
  endLine: number;
  exported: boolean;
  parent?: string;       // class/interface name for methods
  signature?: string;    // parameter types + return type if available
}

export interface ImportInfo {
  source: string;        // import specifier: './order', 'lodash'
  names: Array<{
    imported: string;    // original name
    local: string;       // local alias (same if no alias)
  }>;
  isDefault: boolean;
  isNamespace: boolean;  // import * as X
  file: string;          // file containing the import
}

export interface CallSite {
  callerSymbol: string;  // qualified name of the containing function
  targetName: string;    // raw call target text
  file: string;
  line: number;
  isMethodCall: boolean; // this.x() or obj.x()
  receiver?: string;     // "this", "self", or variable name
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  file: string;
}

export interface ExtractionResult {
  symbols: SymbolInfo[];
  calls: CallSite[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export interface CallEdge {
  caller: string;   // symbolId
  callee: string;   // symbolId
  confidence: number;
}

export interface PatternInfo {
  type: string;          // 'api-routes' | 'components' | 'services' | 'data-access'
  framework?: string;
  pattern?: string;
  files: string[];
  details?: Record<string, unknown>;
}

export interface CodeIndex {
  projectRoot: string;
  symbols: Map<string, SymbolInfo>;
  callers: Map<string, Set<string>>;
  callees: Map<string, Set<string>>;
  imports: Map<string, ImportInfo[]>;
  fileSymbols: Map<string, Set<string>>;
  stats: {
    total_symbols: number;
    total_edges: number;
    indexed_files: number;
  };
}

export interface TechStackSummary {
  tech_stack: {
    language?: string;
    runtime?: string;
    framework?: string;
    bundler?: string;
    test_framework?: string;
    orm?: string;
  };
  structure: {
    total_files: number;
    by_language: Record<string, number>;
    source_dirs: string[];
    test_dirs: string[];
    entry_points: string[];
  };
  config: {
    typescript_strict?: boolean;
    path_aliases?: Record<string, string>;
    monorepo?: boolean;
  };
  warnings?: string[];
}

export interface ScanResponse extends TechStackSummary {}

export interface SymbolSummary {
  symbol: string;        // symbolId
  name: string;
  kind: string;
  file: string;
  line: number;
  exported: boolean;
  signature?: string;
  parent?: string;
}

export interface ImpactSummary {
  symbol: string;        // symbolId
  signature?: string;
  direct_callers: Array<{
    symbol: string;
    file: string;
    line: number;
  }>;
  files_affected: number;
  test_files: string[];
}

export interface ImpactResponse {
  symbol: string;
  direct: Array<{ symbol: string; file: string; line: number }>;
  indirect: Array<{ symbol: string; file: string; line: number }>;
  transitive: Array<{ symbol: string; file: string; line: number }>;
  files_affected: string[];
  test_files: string[];
  truncated?: boolean;
  total_count?: number;
  index_stats: {
    total_symbols: number;
    total_edges: number;
    indexed_files: number;
  };
}

export interface CodebaseContext {
  scan?: TechStackSummary;
  symbols?: SymbolSummary[];
  impact?: ImpactSummary[];
  patterns?: PatternInfo[];
}
