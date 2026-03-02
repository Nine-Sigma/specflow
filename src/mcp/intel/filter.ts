/**
 * File filtering for the code intelligence indexer.
 * Handles directory exclusion, language extension allowlist, gitignore, and size limits.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import ignore, { type Ignore } from 'ignore';

/** Directories always excluded from indexing */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '__tests__',
  '.venv',
  'venv',
  '.env',
  '.specflow',
  '.specflow-lib',
  '.axon',
  '.codex',
  '.claude',
  '.planning',
  'openspec',
]);

/** Supported file extensions for parsing */
export const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
]);

/** Maximum file size in bytes (500KB) */
const MAX_FILE_SIZE = 500 * 1024;

/** File patterns to always exclude */
function isExcludedFilename(name: string): boolean {
  return (
    name.endsWith('.min.js') ||
    name.endsWith('.bundle.js') ||
    name.endsWith('.d.ts') ||
    name === 'package-lock.json' ||
    name === 'yarn.lock' ||
    name === 'pnpm-lock.yaml' ||
    name === 'poetry.lock'
  );
}

/**
 * Load and create a gitignore filter from the project root.
 * Returns null if no .gitignore exists.
 */
async function loadGitignore(projectRoot: string): Promise<Ignore | null> {
  try {
    const content = await readFile(join(projectRoot, '.gitignore'), 'utf8');
    return ignore().add(content);
  } catch {
    return null;
  }
}

/**
 * Discover all parseable source files in a project.
 * Applies directory exclusion, extension filtering, gitignore, and size limits.
 */
export async function discoverFiles(projectRoot: string): Promise<string[]> {
  const gitignoreFilter = await loadGitignore(projectRoot);
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      // Skip excluded directories
      if (EXCLUDED_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      const relativePath = relative(projectRoot, fullPath);

      // Apply gitignore
      if (gitignoreFilter && gitignoreFilter.ignores(relativePath)) continue;

      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!stats.isFile()) continue;

      // Check filename exclusions
      if (isExcludedFilename(entry)) continue;

      // Check extension
      const ext = extname(entry);
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      // Check size
      if (stats.size > MAX_FILE_SIZE) continue;

      files.push(relativePath);
    }
  }

  await walk(projectRoot);
  return files;
}
