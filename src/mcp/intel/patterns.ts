/**
 * Pattern detection heuristics.
 * Scans the symbol index and file paths to detect recurring codebase patterns.
 */

import type { CodeIndex, PatternInfo } from './types.js';

/**
 * Detect codebase patterns from the symbol index.
 */
export function detectPatterns(index: CodeIndex, category?: string): PatternInfo[] {
  const patterns: PatternInfo[] = [];

  if (!category || category === 'api-routes') {
    patterns.push(...detectApiRoutes(index));
  }
  if (!category || category === 'components') {
    patterns.push(...detectComponents(index));
  }
  if (!category || category === 'services') {
    patterns.push(...detectServices(index));
  }
  if (!category || category === 'data-access') {
    patterns.push(...detectDataAccess(index));
  }
  if (!category || category === 'handlers') {
    patterns.push(...detectHandlers(index));
  }
  if (!category || category === 'barrel') {
    patterns.push(...detectBarrels(index));
  }

  return patterns;
}

/**
 * Detect API route patterns (Next.js App Router, NestJS, Express).
 */
function detectApiRoutes(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];

  // Next.js App Router: files matching **/route.ts containing exported GET/POST/etc
  const httpMethods = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
  const nextRouteFiles: string[] = [];

  for (const [file, symIds] of index.fileSymbols) {
    if (file.match(/\/route\.(ts|js)$/)) {
      for (const symId of symIds) {
        const sym = index.symbols.get(symId);
        if (sym && sym.exported && httpMethods.has(sym.name)) {
          if (!nextRouteFiles.includes(file)) nextRouteFiles.push(file);
        }
      }
    }
  }

  if (nextRouteFiles.length > 0) {
    patterns.push({
      type: 'api-routes',
      framework: 'nextjs-app-router',
      pattern: 'app/api/{resource}/route.ts',
      files: nextRouteFiles,
    });
  }

  // NestJS: classes with Controller in name
  const nestControllers: string[] = [];
  for (const [, sym] of index.symbols) {
    if (sym.kind === 'class' && sym.name.endsWith('Controller')) {
      if (!nestControllers.includes(sym.file)) nestControllers.push(sym.file);
    }
  }
  if (nestControllers.length > 0) {
    patterns.push({
      type: 'api-routes',
      framework: 'nestjs',
      pattern: '{name}.controller.ts',
      files: nestControllers,
    });
  }

  // Express: files with app.get/app.post/router.get/router.post patterns
  const expressFiles: string[] = [];
  for (const [file, symIds] of index.fileSymbols) {
    for (const symId of symIds) {
      const callees = index.callees.get(symId);
      if (!callees) continue;
      for (const calleeId of callees) {
        const calleeSym = index.symbols.get(calleeId);
        if (calleeSym && ['get', 'post', 'put', 'delete', 'patch'].includes(calleeSym.name)) {
          if (!expressFiles.includes(file)) expressFiles.push(file);
        }
      }
    }
  }
  // Only report if no other framework detected
  if (expressFiles.length > 0 && nextRouteFiles.length === 0 && nestControllers.length === 0) {
    patterns.push({
      type: 'api-routes',
      framework: 'express',
      files: expressFiles,
    });
  }

  return patterns;
}

/**
 * Detect component structure patterns.
 */
function detectComponents(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];

  // Find component directories
  const componentFiles = new Map<string, Set<string>>(); // dir → files

  for (const file of index.fileSymbols.keys()) {
    if (file.includes('/components/') || file.includes('/ui/')) {
      const parts = file.split('/');
      const compIdx = parts.findIndex(p => p === 'components' || p === 'ui');
      if (compIdx >= 0 && compIdx + 1 < parts.length) {
        const compDir = parts.slice(0, compIdx + 2).join('/');
        if (!componentFiles.has(compDir)) componentFiles.set(compDir, new Set());
        componentFiles.get(compDir)!.add(file);
      }
    }
  }

  if (componentFiles.size > 0) {
    // Detect co-located patterns
    const coLocated = new Set<string>();
    for (const [dir, files] of componentFiles) {
      for (const file of files) {
        if (file.match(/\.(test|spec)\./)) coLocated.add('test');
        if (file.match(/\.module\.(css|scss)/)) coLocated.add('styles');
        if (file.match(/\.stories\./)) coLocated.add('stories');
        if (file.endsWith('index.ts') || file.endsWith('index.js')) coLocated.add('barrel');
      }
    }

    patterns.push({
      type: 'components',
      files: [...componentFiles.keys()],
      details: {
        co_located: [...coLocated],
        count: componentFiles.size,
      },
    });
  }

  return patterns;
}

/**
 * Detect service/repository patterns.
 */
function detectServices(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];
  const serviceFiles: string[] = [];

  for (const [, sym] of index.symbols) {
    if (sym.kind === 'class' && (sym.name.endsWith('Service') || sym.name.endsWith('Repository'))) {
      if (!serviceFiles.includes(sym.file)) serviceFiles.push(sym.file);
    }
  }

  if (serviceFiles.length > 0) {
    patterns.push({
      type: 'services',
      files: serviceFiles,
      details: {
        count: serviceFiles.length,
      },
    });
  }

  return patterns;
}

/**
 * Detect data access patterns (ORMs, raw SQL).
 */
function detectDataAccess(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];

  // Look for ORM-related imports
  const ormFiles = new Map<string, Set<string>>(); // orm → files

  for (const [file, fileImports] of index.imports) {
    for (const imp of fileImports) {
      if (imp.source.includes('@prisma')) {
        if (!ormFiles.has('prisma')) ormFiles.set('prisma', new Set());
        ormFiles.get('prisma')!.add(file);
      } else if (imp.source.includes('typeorm')) {
        if (!ormFiles.has('typeorm')) ormFiles.set('typeorm', new Set());
        ormFiles.get('typeorm')!.add(file);
      } else if (imp.source.includes('drizzle')) {
        if (!ormFiles.has('drizzle')) ormFiles.set('drizzle', new Set());
        ormFiles.get('drizzle')!.add(file);
      } else if (imp.source.includes('sqlalchemy')) {
        if (!ormFiles.has('sqlalchemy')) ormFiles.set('sqlalchemy', new Set());
        ormFiles.get('sqlalchemy')!.add(file);
      }
    }
  }

  for (const [orm, files] of ormFiles) {
    patterns.push({
      type: 'data-access',
      framework: orm,
      files: [...files],
    });
  }

  return patterns;
}

/** Handler function naming conventions */
const HANDLER_PREFIXES = ['handle', 'process', 'validate', 'assemble'];

function isHandlerName(name: string): boolean {
  return HANDLER_PREFIXES.some(prefix =>
    name.startsWith(prefix) && name.length > prefix.length && name[prefix.length] === name[prefix.length].toUpperCase(),
  );
}

/**
 * Detect functional handler patterns — files exporting 2+ handler-named functions.
 */
export function detectHandlers(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];
  const handlerFiles: string[] = [];

  for (const [file, symIds] of index.fileSymbols) {
    let handlerCount = 0;
    for (const symId of symIds) {
      const sym = index.symbols.get(symId);
      if (sym && sym.exported && !sym.parent &&
          (sym.kind === 'function' || sym.kind === 'variable') &&
          isHandlerName(sym.name)) {
        handlerCount++;
      }
    }
    if (handlerCount >= 2) {
      handlerFiles.push(file);
    }
  }

  if (handlerFiles.length > 0) {
    patterns.push({
      type: 'handlers',
      files: handlerFiles,
      details: { count: handlerFiles.length },
    });
  }

  return patterns;
}

/**
 * Detect barrel/module index patterns — index.ts files where >50% of symbols are re-exports.
 */
export function detectBarrels(index: CodeIndex): PatternInfo[] {
  const patterns: PatternInfo[] = [];
  const barrelFiles: string[] = [];

  for (const [file, symIds] of index.fileSymbols) {
    if (!file.endsWith('/index.ts') && !file.endsWith('/index.js') && file !== 'index.ts' && file !== 'index.js') continue;

    const totalSymbols = symIds.size;
    if (totalSymbols === 0) continue;

    // Check how many symbols in this file are also defined in other files
    // (indicating re-exports)
    let reExportCount = 0;
    for (const symId of symIds) {
      const sym = index.symbols.get(symId);
      if (!sym || !sym.exported) continue;

      // A re-export is a symbol that shares a name with an exported symbol in another file
      for (const [otherSymId, otherSym] of index.symbols) {
        if (otherSymId === symId) continue;
        if (otherSym.file === file) continue;
        if (otherSym.name === sym.name && otherSym.exported) {
          reExportCount++;
          break;
        }
      }
    }

    if (reExportCount > 0 && reExportCount / totalSymbols > 0.5) {
      barrelFiles.push(file);
    }
  }

  if (barrelFiles.length > 0) {
    patterns.push({
      type: 'barrel',
      files: barrelFiles,
      details: { count: barrelFiles.length },
    });
  }

  return patterns;
}
