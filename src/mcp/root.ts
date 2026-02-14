import { stat } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Walk up from cwd looking for .specflow/ directory.
 * Returns the project root directory (parent of .specflow/).
 * Returns null if no .specflow/ directory is found in any ancestor.
 */
export async function resolveProjectRoot(startDir: string = process.cwd()): Promise<string | null> {
  let current = startDir;

  while (true) {
    try {
      const specflowDir = join(current, '.specflow'); // nosemgrep: path-join-resolve-traversal
      const s = await stat(specflowDir);
      if (s.isDirectory()) {
        return current;
      }
    } catch {
      // .specflow not found at this level, continue up
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root
      return null;
    }
    current = parent;
  }
}
