import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanProject } from './scanner.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-scanner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('scanProject', () => {
  it('detects TypeScript + Node from package.json', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      dependencies: { express: '^4.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({}));

    const result = await scanProject(testDir);
    expect(result.tech_stack.language).toBe('typescript');
    expect(result.tech_stack.runtime).toBe('node');
    expect(result.tech_stack.framework).toBe('express');
  });

  it('detects Next.js framework', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));

    const result = await scanProject(testDir);
    expect(result.tech_stack.framework).toBe('nextjs');
  });

  it('detects bundler (Vite)', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      devDependencies: { vite: '^5.0.0', vitest: '^1.0.0' },
    }));

    const result = await scanProject(testDir);
    expect(result.tech_stack.bundler).toBe('vite');
    expect(result.tech_stack.test_framework).toBe('vitest');
  });

  it('detects test framework (Jest)', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      devDependencies: { jest: '^29.0.0' },
    }));

    const result = await scanProject(testDir);
    expect(result.tech_stack.test_framework).toBe('jest');
  });

  it('detects ORM (Prisma)', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      dependencies: { '@prisma/client': '^5.0.0' },
      devDependencies: { prisma: '^5.0.0' },
    }));

    const result = await scanProject(testDir);
    expect(result.tech_stack.orm).toBe('prisma');
  });

  it('detects Python from pyproject.toml', async () => {
    await writeFile(join(testDir, 'pyproject.toml'), '[tool.poetry]\nname = "myapp"');

    const result = await scanProject(testDir);
    expect(result.tech_stack.language).toBe('python');
    expect(result.tech_stack.runtime).toBe('python');
  });

  it('detects tsconfig path aliases', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' },
    }));
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true,
        paths: { '@/*': ['./src/*'] },
      },
    }));

    const result = await scanProject(testDir);
    expect(result.config.typescript_strict).toBe(true);
    expect(result.config.path_aliases).toEqual({ '@/*': './src/*' });
  });

  it('warns when tsconfig uses extends', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' },
    }));
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: {},
    }));

    const result = await scanProject(testDir);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes('extends'))).toBe(true);
  });

  it('detects source and test directories', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({}));
    await mkdir(join(testDir, 'src'), { recursive: true });
    await mkdir(join(testDir, 'tests'), { recursive: true });

    const result = await scanProject(testDir);
    expect(result.structure.source_dirs).toContain('src/');
    expect(result.structure.test_dirs).toContain('tests/');
  });

  it('detects entry points', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({}));
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'index.ts'), 'export const main = true;');

    const result = await scanProject(testDir);
    expect(result.structure.entry_points).toContain('src/index.ts');
  });

  it('counts files by language', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({}));
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'a.ts'), 'const a = 1;');
    await writeFile(join(testDir, 'src', 'b.ts'), 'const b = 1;');
    await writeFile(join(testDir, 'src', 'c.js'), 'const c = 1;');

    const result = await scanProject(testDir);
    expect(result.structure.total_files).toBe(3);
    expect(result.structure.by_language.typescript).toBe(2);
    expect(result.structure.by_language.javascript).toBe(1);
  });

  it('detects monorepo from workspaces', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      workspaces: ['packages/*'],
    }));

    const result = await scanProject(testDir);
    expect(result.config.monorepo).toBe(true);
  });

  it('handles missing config files gracefully', async () => {
    // Empty directory — no package.json, no tsconfig, no pyproject.toml
    const result = await scanProject(testDir);
    expect(result.tech_stack).toBeDefined();
    expect(result.structure.total_files).toBe(0);
  });
});
