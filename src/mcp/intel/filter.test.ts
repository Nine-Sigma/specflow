import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { discoverFiles, SUPPORTED_EXTENSIONS } from './filter.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-filter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('discoverFiles', () => {
  it('discovers .ts, .js, and .py files', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'index.ts'), 'export const x = 1;');
    await writeFile(join(testDir, 'src', 'app.js'), 'module.exports = {};');
    await writeFile(join(testDir, 'src', 'main.py'), 'x = 1');

    const files = await discoverFiles(testDir);
    expect(files).toContain('src/index.ts');
    expect(files).toContain('src/app.js');
    expect(files).toContain('src/main.py');
  });

  it('excludes node_modules directory', async () => {
    await mkdir(join(testDir, 'node_modules', 'lodash'), { recursive: true });
    await writeFile(join(testDir, 'node_modules', 'lodash', 'index.js'), 'module.exports = {};');
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'app.ts'), 'export default 1;');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('node_modules/lodash/index.js');
    expect(files).toContain('src/app.ts');
  });

  it('excludes .d.ts files', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'types.d.ts'), 'declare const x: number;');
    await writeFile(join(testDir, 'src', 'types.ts'), 'export type X = number;');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('src/types.d.ts');
    expect(files).toContain('src/types.ts');
  });

  it('excludes non-supported extensions', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'readme.md'), '# Readme');
    await writeFile(join(testDir, 'src', 'styles.css'), 'body {}');
    await writeFile(join(testDir, 'src', 'data.json'), '{}');
    await writeFile(join(testDir, 'src', 'app.ts'), 'export const x = 1;');

    const files = await discoverFiles(testDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('src/app.ts');
  });

  it('excludes .min.js and .bundle.js files', async () => {
    await writeFile(join(testDir, 'vendor.min.js'), 'minified');
    await writeFile(join(testDir, 'app.bundle.js'), 'bundled');
    await writeFile(join(testDir, 'app.js'), 'normal');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('vendor.min.js');
    expect(files).not.toContain('app.bundle.js');
    expect(files).toContain('app.js');
  });

  it('excludes always-excluded directories', async () => {
    const excludedDirs = ['dist', 'build', '.git', '.next', '__pycache__', '.specflow'];
    for (const dir of excludedDirs) {
      await mkdir(join(testDir, dir), { recursive: true });
      await writeFile(join(testDir, dir, 'file.ts'), 'export const x = 1;');
    }
    await writeFile(join(testDir, 'src.ts'), 'export const y = 1;');

    const files = await discoverFiles(testDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('src.ts');
  });

  it('excludes __tests__ directories', async () => {
    await mkdir(join(testDir, 'src', '__tests__', 'fixtures'), { recursive: true });
    await writeFile(join(testDir, 'src', '__tests__', 'some.test.ts'), 'test("x", () => {});');
    await writeFile(join(testDir, 'src', '__tests__', 'fixtures', 'sample.ts'), 'export const x = 1;');
    await mkdir(join(testDir, 'src', 'lib'), { recursive: true });
    await writeFile(join(testDir, 'src', 'lib', 'app.ts'), 'export const y = 1;');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('src/__tests__/some.test.ts');
    expect(files).not.toContain('src/__tests__/fixtures/sample.ts');
    expect(files).toContain('src/lib/app.ts');
  });

  it('respects .gitignore patterns', async () => {
    await writeFile(join(testDir, '.gitignore'), 'ignored/\n*.generated.ts');
    await mkdir(join(testDir, 'ignored'), { recursive: true });
    await writeFile(join(testDir, 'ignored', 'file.ts'), 'export const x = 1;');
    await writeFile(join(testDir, 'auto.generated.ts'), 'export const y = 1;');
    await writeFile(join(testDir, 'app.ts'), 'export const z = 1;');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('ignored/file.ts');
    expect(files).not.toContain('auto.generated.ts');
    expect(files).toContain('app.ts');
  });

  it('handles missing .gitignore gracefully', async () => {
    await writeFile(join(testDir, 'app.ts'), 'export const x = 1;');

    const files = await discoverFiles(testDir);
    expect(files).toContain('app.ts');
  });

  it('excludes files larger than 500KB', async () => {
    const largeContent = 'x'.repeat(600 * 1024); // 600KB
    await writeFile(join(testDir, 'large.ts'), largeContent);
    await writeFile(join(testDir, 'small.ts'), 'export const x = 1;');

    const files = await discoverFiles(testDir);
    expect(files).not.toContain('large.ts');
    expect(files).toContain('small.ts');
  });

  it('discovers .tsx, .jsx, .mjs, .cjs extensions', async () => {
    await writeFile(join(testDir, 'comp.tsx'), 'export const Comp = () => null;');
    await writeFile(join(testDir, 'comp.jsx'), 'export const Comp = () => null;');
    await writeFile(join(testDir, 'util.mjs'), 'export const x = 1;');
    await writeFile(join(testDir, 'util.cjs'), 'module.exports = {};');

    const files = await discoverFiles(testDir);
    expect(files).toContain('comp.tsx');
    expect(files).toContain('comp.jsx');
    expect(files).toContain('util.mjs');
    expect(files).toContain('util.cjs');
  });
});

describe('SUPPORTED_EXTENSIONS', () => {
  it('includes all expected extensions', () => {
    expect(SUPPORTED_EXTENSIONS.has('.ts')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.tsx')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.js')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.jsx')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.mjs')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.cjs')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.py')).toBe(true);
  });

  it('does not include non-source extensions', () => {
    expect(SUPPORTED_EXTENSIONS.has('.css')).toBe(false);
    expect(SUPPORTED_EXTENSIONS.has('.md')).toBe(false);
    expect(SUPPORTED_EXTENSIONS.has('.json')).toBe(false);
  });
});
