import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `lint-fm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

const scriptPath = join(import.meta.dirname, 'lint-frontmatter.mjs');

function runLint(files: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [scriptPath, ...files], {
      encoding: 'utf8',
      cwd: testDir,
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: (error.stderr || error.stdout || '') as string, exitCode: error.status || 1 };
  }
}

describe('lint-frontmatter', () => {
  it('passes for valid frontmatter', () => {
    const file = join(testDir, 'valid.mdx');
    writeFileSync(file, '---\ntitle: "Hello World"\ndescription: "A valid page"\n---\n\n# Content\n');
    const { exitCode } = runLint([file]);
    expect(exitCode).toBe(0);
  });

  it('fails for unquoted colon in description', () => {
    const file = join(testDir, 'bad.mdx');
    writeFileSync(file, '---\ntitle: Hello\ndescription: This has: a colon problem: here\n---\n\n# Content\n');
    const { exitCode } = runLint([file]);
    expect(exitCode).toBe(1);
  });

  it('passes for files without frontmatter', () => {
    const file = join(testDir, 'no-fm.mdx');
    writeFileSync(file, '# Just Content\n\nNo frontmatter here.\n');
    const { exitCode } = runLint([file]);
    expect(exitCode).toBe(0);
  });
});
