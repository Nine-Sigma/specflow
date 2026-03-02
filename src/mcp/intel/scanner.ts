/**
 * Project scanner — tech stack detection from config files.
 * Reads package.json, tsconfig.json, framework configs, etc.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import type { TechStackSummary } from './types.js';
import { SUPPORTED_EXTENSIONS } from './filter.js';

/**
 * Scan a project to detect tech stack, structure, and configuration.
 */
export async function scanProject(projectRoot: string): Promise<TechStackSummary> {
  const techStack: TechStackSummary['tech_stack'] = {};
  const structure: TechStackSummary['structure'] = {
    total_files: 0,
    by_language: {},
    source_dirs: [],
    test_dirs: [],
    entry_points: [],
  };
  const config: TechStackSummary['config'] = {};
  const warnings: string[] = [];

  // Detect from package.json
  const pkg = await readJsonSafe(join(projectRoot, 'package.json'));
  if (pkg) {
    techStack.runtime = 'node';

    const allDeps: Record<string, unknown> = {
      ...((pkg.dependencies as Record<string, unknown>) || {}),
      ...((pkg.devDependencies as Record<string, unknown>) || {}),
    };

    // Language detection
    if (allDeps.typescript || await fileExists(join(projectRoot, 'tsconfig.json'))) {
      techStack.language = 'typescript';
    } else {
      techStack.language = 'javascript';
    }

    // Framework detection
    if (allDeps.next) techStack.framework = 'nextjs';
    else if (allDeps.nuxt) techStack.framework = 'nuxt';
    else if (allDeps['@angular/core']) techStack.framework = 'angular';
    else if (allDeps.svelte || allDeps['@sveltejs/kit']) techStack.framework = 'svelte';
    else if (allDeps.vue) techStack.framework = 'vue';
    else if (allDeps.express) techStack.framework = 'express';
    else if (allDeps['@nestjs/core']) techStack.framework = 'nestjs';
    else if (allDeps.fastify) techStack.framework = 'fastify';
    else if (allDeps.hono) techStack.framework = 'hono';
    else if (allDeps.react) techStack.framework = 'react';

    // Bundler detection
    if (allDeps.vite) techStack.bundler = 'vite';
    else if (allDeps.webpack) techStack.bundler = 'webpack';
    else if (allDeps.esbuild) techStack.bundler = 'esbuild';
    else if (allDeps.rollup) techStack.bundler = 'rollup';
    else if (allDeps.turbo || allDeps.turbopack) techStack.bundler = 'turbopack';

    // Test framework detection
    if (allDeps.vitest) techStack.test_framework = 'vitest';
    else if (allDeps.jest) techStack.test_framework = 'jest';
    else if (allDeps.mocha) techStack.test_framework = 'mocha';
    else if (allDeps['@playwright/test']) techStack.test_framework = 'playwright';
    else if (allDeps.cypress) techStack.test_framework = 'cypress';

    // ORM detection
    if (allDeps['@prisma/client'] || allDeps.prisma) techStack.orm = 'prisma';
    else if (allDeps.typeorm) techStack.orm = 'typeorm';
    else if (allDeps.drizzle) techStack.orm = 'drizzle';
    else if (allDeps.sequelize) techStack.orm = 'sequelize';
    else if (allDeps.knex) techStack.orm = 'knex';

    // Monorepo detection
    config.monorepo = !!(pkg.workspaces || await fileExists(join(projectRoot, 'lerna.json')));
  }

  // Detect from pyproject.toml
  if (!pkg && await fileExists(join(projectRoot, 'pyproject.toml'))) {
    techStack.language = 'python';
    techStack.runtime = 'python';
  }
  if (!pkg && await fileExists(join(projectRoot, 'requirements.txt'))) {
    techStack.language = 'python';
    techStack.runtime = 'python';
  }

  // Detect from tsconfig.json
  const tsconfig = await readJsonSafe(join(projectRoot, 'tsconfig.json'));
  if (tsconfig) {
    const compilerOptions = tsconfig.compilerOptions as Record<string, unknown> | undefined;
    config.typescript_strict = compilerOptions?.strict === true;
    if (compilerOptions?.paths) {
      config.path_aliases = {};
      for (const [key, value] of Object.entries(compilerOptions.paths as Record<string, unknown>)) {
        config.path_aliases[key] = Array.isArray(value) ? value[0] : String(value);
      }
    }
    if (tsconfig.extends) {
      warnings.push('tsconfig.json uses `extends` — path aliases in base configs will not be resolved for v1');
    }
  }

  // Framework config file detection
  const frameworkConfigs = [
    'next.config.js', 'next.config.mjs', 'next.config.ts',
    'vite.config.ts', 'vite.config.js',
    'nuxt.config.ts', 'nuxt.config.js',
    'angular.json',
  ];
  for (const cfg of frameworkConfigs) {
    if (await fileExists(join(projectRoot, cfg))) {
      if (cfg.startsWith('next.config') && !techStack.framework) techStack.framework = 'nextjs';
      if (cfg.startsWith('vite.config') && !techStack.bundler) techStack.bundler = 'vite';
      if (cfg.startsWith('nuxt.config') && !techStack.framework) techStack.framework = 'nuxt';
    }
  }

  // Scan directory structure
  await scanStructure(projectRoot, structure);

  const result: TechStackSummary = { tech_stack: techStack, structure, config };
  if (warnings.length > 0) result.warnings = warnings;
  return result;
}

/**
 * Scan the project directory structure for source/test dirs and entry points.
 */
async function scanStructure(
  projectRoot: string,
  structure: TechStackSummary['structure'],
): Promise<void> {
  const sourceDirsSet = new Set<string>();
  const testDirsSet = new Set<string>();
  const entryPoints: string[] = [];

  // Check common source directories
  const commonDirs = ['src', 'lib', 'app', 'pages', 'components', 'api'];
  for (const dir of commonDirs) {
    if (await fileExists(join(projectRoot, dir))) {
      sourceDirsSet.add(dir + '/');
    }
  }

  // Check common test directories
  const testDirPatterns = ['test', 'tests', '__tests__', 'spec', 'specs'];
  for (const dir of testDirPatterns) {
    if (await fileExists(join(projectRoot, dir))) {
      testDirsSet.add(dir + '/');
    }
  }

  // Also check src/__tests__
  if (await fileExists(join(projectRoot, 'src', '__tests__'))) {
    testDirsSet.add('src/__tests__/');
  }

  // Count files by language
  const byLanguage: Record<string, number> = {};
  let totalFiles = 0;

  async function countFiles(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__', '.venv', 'venv']);

    for (const entry of entries) {
      if (skipDirs.has(entry)) continue;

      const fullPath = join(dir, entry);
      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        await countFiles(fullPath);
      } else if (stats.isFile()) {
        const ext = extname(entry);
        if (SUPPORTED_EXTENSIONS.has(ext) && !entry.endsWith('.d.ts')) {
          totalFiles++;
          const lang = ext === '.py' ? 'python'
            : (ext === '.ts' || ext === '.tsx') ? 'typescript'
            : 'javascript';
          byLanguage[lang] = (byLanguage[lang] || 0) + 1;
        }
      }
    }
  }

  await countFiles(projectRoot);

  // Detect entry points
  const entryPointCandidates = [
    'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
    'src/app.ts', 'src/app.js',
    'src/app/layout.tsx', 'src/app/page.tsx',
    'src/pages/index.tsx', 'src/pages/index.js',
    'src/pages/_app.tsx', 'src/pages/_app.js',
    'index.ts', 'index.js', 'main.ts', 'main.js',
    'app.py', 'main.py', 'manage.py',
  ];
  for (const ep of entryPointCandidates) {
    if (await fileExists(join(projectRoot, ep))) {
      entryPoints.push(ep);
    }
  }

  structure.total_files = totalFiles;
  structure.by_language = byLanguage;
  structure.source_dirs = [...sourceDirsSet];
  structure.test_dirs = [...testDirsSet];
  structure.entry_points = entryPoints;
}

// ============================================================
// Helpers
// ============================================================

async function readJsonSafe(path: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(path, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
