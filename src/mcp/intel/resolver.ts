/**
 * Import and call resolution.
 * Resolves import paths to source files and call sites to symbol IDs
 * using a 4-strategy priority chain.
 */

import { readFile } from 'fs/promises';
import { join, dirname, resolve, relative } from 'path';
import { existsSync } from 'fs';
import type { CodeIndex, ExtractionResult, ImportInfo, CallSite } from './types.js';
import { addCallEdge } from './graph.js';

// ============================================================
// Builtin blocklists — skip noise calls
// ============================================================

const JS_TS_BUILTINS = new Set([
  'console', 'log', 'warn', 'error', 'info', 'debug', 'trace',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'JSON', 'stringify', 'parse',
  'Array', 'from', 'isArray', 'of',
  'Object', 'keys', 'values', 'entries', 'assign', 'freeze', 'create', 'defineProperty',
  'Promise', 'all', 'race', 'allSettled', 'resolve', 'reject',
  'Math', 'floor', 'ceil', 'round', 'random', 'max', 'min', 'abs',
  'String', 'Number', 'Boolean',
  'Map', 'Set', 'WeakMap', 'WeakSet',
  'Symbol', 'BigInt',
  'Date', 'now',
  'RegExp', 'test', 'exec',
  'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'require', 'import',
  'super',
  'fetch',
  'alert', 'confirm', 'prompt',
  'atob', 'btoa',
  'queueMicrotask', 'requestAnimationFrame',
  'structuredClone',
]);

const PYTHON_BUILTINS = new Set([
  'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter',
  'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes',
  'isinstance', 'issubclass', 'type', 'id', 'hash',
  'hasattr', 'getattr', 'setattr', 'delattr',
  'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'round',
  'open', 'input',
  'repr', 'format', 'chr', 'ord',
  'iter', 'next', 'any', 'all',
  'super', '__init__',
  'staticmethod', 'classmethod', 'property',
  'ValueError', 'TypeError', 'KeyError', 'IndexError', 'AttributeError',
  'RuntimeError', 'StopIteration', 'NotImplementedError', 'FileNotFoundError',
  'Exception', 'BaseException',
  'vars', 'dir', 'globals', 'locals',
  'callable', 'eval', 'exec', 'compile',
]);

// ============================================================
// Python stdlib module list (3.10+)
// ============================================================

const PYTHON_STDLIB = new Set([
  'abc', 'aifc', 'argparse', 'array', 'ast', 'asynchat', 'asyncio', 'asyncore',
  'atexit', 'base64', 'bdb', 'binascii', 'binhex', 'bisect', 'builtins',
  'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd', 'code',
  'codecs', 'codeop', 'collections', 'colorsys', 'compileall', 'concurrent',
  'configparser', 'contextlib', 'contextvars', 'copy', 'copyreg', 'cProfile',
  'crypt', 'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm',
  'decimal', 'difflib', 'dis', 'distutils', 'doctest', 'email', 'encodings',
  'enum', 'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch',
  'fractions', 'ftplib', 'functools', 'gc', 'getopt', 'getpass', 'gettext',
  'glob', 'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac', 'html',
  'http', 'idlelib', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect',
  'io', 'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3', 'linecache',
  'locale', 'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math',
  'mimetypes', 'mmap', 'modulefinder', 'multiprocessing', 'netrc', 'nis',
  'nntplib', 'numbers', 'operator', 'optparse', 'os', 'ossaudiodev',
  'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform',
  'plistlib', 'poplib', 'posix', 'posixpath', 'pprint', 'profile', 'pstats',
  'pty', 'pwd', 'py_compile', 'pyclbr', 'pydoc', 'queue', 'quopri',
  'random', 're', 'readline', 'reprlib', 'resource', 'rlcompleter', 'runpy',
  'sched', 'secrets', 'select', 'selectors', 'shelve', 'shlex', 'shutil',
  'signal', 'site', 'smtpd', 'smtplib', 'sndhdr', 'socket', 'socketserver',
  'spwd', 'sqlite3', 'ssl', 'stat', 'statistics', 'string', 'stringprep',
  'struct', 'subprocess', 'sunau', 'symtable', 'sys', 'sysconfig', 'syslog',
  'tabnanny', 'tarfile', 'telnetlib', 'tempfile', 'termios', 'test',
  'textwrap', 'threading', 'time', 'timeit', 'tkinter', 'token', 'tokenize',
  'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle',
  'turtledemo', 'types', 'typing', 'unicodedata', 'unittest', 'urllib',
  'uu', 'uuid', 'venv', 'warnings', 'wave', 'weakref', 'webbrowser',
  'winreg', 'winsound', 'wsgiref', 'xdrlib', 'xml', 'xmlrpc', 'zipapp',
  'zipfile', 'zipimport', 'zlib', '_thread',
]);

// ============================================================
// Import resolution cache
// ============================================================

const importResolutionCache = new Map<string, Map<string, string | null>>();

export function clearResolverCache(): void {
  importResolutionCache.clear();
  tsconfigCache.clear();
}

// ============================================================
// Import resolution
// ============================================================

/** tsconfig.json path aliases cache */
const tsconfigCache = new Map<string, Record<string, string[]> | null>();

async function loadTsconfigPaths(projectRoot: string): Promise<Record<string, string[]> | null> {
  if (tsconfigCache.has(projectRoot)) {
    return tsconfigCache.get(projectRoot)!;
  }

  try {
    const content = await readFile(join(projectRoot, 'tsconfig.json'), 'utf8');
    const tsconfig = JSON.parse(content);

    if (tsconfig.extends) {
      console.error('[specflow-intel] Warning: tsconfig.json uses `extends` — path aliases in base configs will not be resolved for v1');
    }

    const paths = tsconfig.compilerOptions?.paths as Record<string, string[]> | undefined;
    tsconfigCache.set(projectRoot, paths || null);
    return paths || null;
  } catch {
    tsconfigCache.set(projectRoot, null);
    return null;
  }
}

/**
 * Resolve a TypeScript/JavaScript import specifier to a source file path.
 * Returns relative path from project root, or null if unresolvable.
 */
export async function resolveJsImport(
  source: string,
  importingFile: string,
  projectRoot: string,
  indexedFiles: Set<string>,
): Promise<string | null> {
  // Check cache
  const fileCache = importResolutionCache.get(importingFile);
  if (fileCache?.has(source)) {
    return fileCache.get(source)!;
  }

  let resolved: string | null = null;

  if (source.startsWith('./') || source.startsWith('../')) {
    // Relative import
    const dir = dirname(join(projectRoot, importingFile));
    const base = resolve(dir, source);
    resolved = tryExtensions(base, projectRoot, indexedFiles);
  } else {
    // Path alias or bare specifier
    const paths = await loadTsconfigPaths(projectRoot);
    if (paths) {
      for (const [pattern, targets] of Object.entries(paths)) {
        const prefix = pattern.replace(/\*$/, '');
        if (source.startsWith(prefix)) {
          const suffix = source.slice(prefix.length);
          for (const target of targets) {
            const resolved_target = target.replace(/\*$/, suffix);
            const fullPath = resolve(projectRoot, resolved_target);
            const result = tryExtensions(fullPath, projectRoot, indexedFiles);
            if (result) {
              resolved = result;
              break;
            }
          }
          if (resolved) break;
        }
      }
    }

    // Check if bare specifier matches a project source file
    if (!resolved) {
      const fullPath = resolve(projectRoot, source);
      resolved = tryExtensions(fullPath, projectRoot, indexedFiles);
    }
  }

  // Cache the result
  if (!importResolutionCache.has(importingFile)) {
    importResolutionCache.set(importingFile, new Map());
  }
  importResolutionCache.get(importingFile)!.set(source, resolved);

  return resolved;
}

/**
 * Try a base path with various extensions to find a source file.
 */
function tryExtensions(basePath: string, projectRoot: string, indexedFiles: Set<string>): string | null {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];

  // First check exact path (may already have extension)
  const exactRel = relative(projectRoot, basePath);
  if (indexedFiles.has(exactRel)) return exactRel;

  for (const ext of extensions) {
    const rel = relative(projectRoot, basePath + ext);
    if (indexedFiles.has(rel)) return rel;
  }

  return null;
}

/**
 * Resolve a Python import to a source file path.
 */
export function resolvePyImport(
  source: string,
  importingFile: string,
  projectRoot: string,
  indexedFiles: Set<string>,
): string | null {
  // Check cache
  const fileCache = importResolutionCache.get(importingFile);
  if (fileCache?.has(source)) {
    return fileCache.get(source)!;
  }

  // Check stdlib
  const topModule = source.split('.')[0].replace(/^\.+/, '');
  if (PYTHON_STDLIB.has(topModule)) {
    cacheResult(importingFile, source, null);
    return null;
  }

  let resolved: string | null = null;

  if (source.startsWith('.')) {
    // Relative import
    const dir = dirname(join(projectRoot, importingFile));
    const modulePath = source.replace(/^\.+/, '').replace(/\./g, '/');
    const basePath = join(dir, modulePath);
    resolved = tryPythonPath(basePath, projectRoot, indexedFiles);
  } else {
    // Absolute import from project root
    const modulePath = source.replace(/\./g, '/');
    const basePath = join(projectRoot, modulePath);
    resolved = tryPythonPath(basePath, projectRoot, indexedFiles);
  }

  cacheResult(importingFile, source, resolved);
  return resolved;
}

function tryPythonPath(basePath: string, projectRoot: string, indexedFiles: Set<string>): string | null {
  const pyPath = relative(projectRoot, basePath + '.py');
  if (indexedFiles.has(pyPath)) return pyPath;

  const initPath = relative(projectRoot, join(basePath, '__init__.py'));
  if (indexedFiles.has(initPath)) return initPath;

  return null;
}

function cacheResult(importingFile: string, source: string, result: string | null): void {
  if (!importResolutionCache.has(importingFile)) {
    importResolutionCache.set(importingFile, new Map());
  }
  importResolutionCache.get(importingFile)!.set(source, result);
}

// ============================================================
// Call resolution — 4-strategy priority chain
// ============================================================

/**
 * Resolve all call sites in all files to symbol IDs and add edges to the graph.
 */
export function resolveAllCalls(
  results: Array<{ file: string; result: ExtractionResult }>,
  graph: CodeIndex,
  projectRoot: string,
): void {
  const indexedFiles = new Set(results.map(r => r.file));

  // Build import resolution map: file → { localName → symbolId }
  const importMaps = new Map<string, Map<string, string>>();

  for (const { file, result } of results) {
    const localMap = new Map<string, string>();

    for (const imp of result.imports) {
      const ext = file.endsWith('.py') ? 'py' : 'js';

      let resolvedFile: string | null = null;
      if (ext === 'py') {
        resolvedFile = resolvePyImport(imp.source, file, projectRoot, indexedFiles);
      } else {
        // Use sync cache check since we can't await in this function
        const cached = importResolutionCache.get(file)?.get(imp.source);
        if (cached !== undefined) {
          resolvedFile = cached;
        } else {
          // For JS/TS, we need to try extension probing synchronously
          if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
            const dir = dirname(join(projectRoot, file));
            const base = resolve(dir, imp.source);
            resolvedFile = tryExtensions(base, projectRoot, indexedFiles);
          }
        }
      }

      if (!resolvedFile) continue;

      for (const name of imp.names) {
        // Find the symbol in the resolved file
        const fileSyms = graph.fileSymbols.get(resolvedFile);
        if (!fileSyms) continue;

        // For default imports, find the symbol marked as the default export
        if (name.imported === 'default') {
          const fileExports = results.find(r => r.file === resolvedFile)?.result.exports;
          const defaultExport = fileExports?.find(e => e.isDefault);
          if (defaultExport) {
            for (const symId of fileSyms) {
              const sym = graph.symbols.get(symId);
              if (sym && sym.name === defaultExport.name) {
                localMap.set(name.local, symId);
                break;
              }
            }
          }
        } else {
          for (const symId of fileSyms) {
            const sym = graph.symbols.get(symId);
            if (sym && sym.name === name.imported) {
              localMap.set(name.local, symId);
              break;
            }
          }
        }
      }

      // Namespace imports
      if (imp.isNamespace && imp.names.length > 0) {
        const nsLocal = imp.names[0].local;
        const fileSyms = graph.fileSymbols.get(resolvedFile);
        if (fileSyms) {
          for (const symId of fileSyms) {
            const sym = graph.symbols.get(symId);
            if (sym) {
              localMap.set(`${nsLocal}.${sym.name}`, symId);
            }
          }
        }
      }
    }

    importMaps.set(file, localMap);
  }

  // Now resolve each call site
  for (const { file, result } of results) {
    const callerFile = file;
    const localImports = importMaps.get(callerFile) || new Map();
    const fileSyms = graph.fileSymbols.get(callerFile) || new Set();
    const isPython = callerFile.endsWith('.py');
    const builtins = isPython ? PYTHON_BUILTINS : JS_TS_BUILTINS;

    for (const call of result.calls) {
      // Skip builtins
      if (builtins.has(call.targetName)) continue;
      if (call.receiver && builtins.has(call.receiver)) continue;

      // Build caller's symbol ID
      const callerId = `${callerFile}::${call.callerSymbol}`;
      if (!graph.symbols.has(callerId)) continue;

      // Strategy 1: Same-file exact match (confidence 1.0)
      let resolved = findSameFileMatch(call, callerFile, fileSyms, graph);

      // Strategy 2: Import-resolved match (confidence 0.9)
      if (!resolved) {
        const targetKey = call.isMethodCall && call.receiver
          ? `${call.receiver}.${call.targetName}`
          : call.targetName;
        const importResolved = localImports.get(targetKey) || localImports.get(call.targetName);
        if (importResolved) resolved = importResolved;
      }

      // Strategy 3: Receiver method resolution (confidence 0.8)
      if (!resolved && call.isMethodCall && call.receiver) {
        resolved = resolveReceiverMethod(call, callerFile, graph);
      }

      // Strategy 4: Global fuzzy match (confidence 0.5)
      if (!resolved) {
        resolved = globalFuzzyMatch(call.targetName, graph);
      }

      if (resolved && resolved !== callerId) {
        addCallEdge(graph, callerId, resolved);
      }
    }
  }
}

function findSameFileMatch(
  call: CallSite,
  callerFile: string,
  fileSyms: Set<string>,
  graph: CodeIndex,
): string | null {
  for (const symId of fileSyms) {
    const sym = graph.symbols.get(symId);
    if (!sym) continue;
    if (sym.name === call.targetName) return symId;
    // Check qualified name for method calls (e.g., this.validate → Class.validate)
    if (call.isMethodCall && call.receiver === 'this' && sym.parent && sym.name === call.targetName) {
      return symId;
    }
  }
  return null;
}

function resolveReceiverMethod(
  call: CallSite,
  callerFile: string,
  graph: CodeIndex,
): string | null {
  // For 'this' or 'self', resolve to method on the same class
  if (call.receiver === 'this' || call.receiver === 'self') {
    const callerSymId = `${callerFile}::${call.callerSymbol}`;
    const callerSym = graph.symbols.get(callerSymId);
    if (callerSym?.parent) {
      const targetId = `${callerFile}::${callerSym.parent}.${call.targetName}`;
      if (graph.symbols.has(targetId)) return targetId;
    }
  }
  return null;
}

function globalFuzzyMatch(targetName: string, graph: CodeIndex): string | null {
  const matches: string[] = [];
  for (const [symId, sym] of graph.symbols) {
    if (sym.name === targetName) {
      matches.push(symId);
    }
  }
  // Only use global match if exactly one symbol matches
  return matches.length === 1 ? matches[0] : null;
}
