import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { assembleContext } from './context.js';
import type { WorkflowState } from './types.js';

// Mock intel enrichment to avoid tree-sitter dependency
vi.mock('./intel/index.js', () => ({
  enrichContext: vi.fn().mockResolvedValue(null),
}));

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-context-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(testDir, '.specflow', 'features', 'test-feat'), { recursive: true });
  await mkdir(join(testDir, '.specflow-lib', 'personas'), { recursive: true });
  await mkdir(join(testDir, '.specflow-lib', 'expertise', 'requirements'), { recursive: true });
  await mkdir(join(testDir, '.specflow-lib', 'methodology'), { recursive: true });

  // Write minimal persona
  await writeFile(join(testDir, '.specflow-lib', 'personas', 'analyst.md'), '# Analyst\nYou are an analyst.');
  await writeFile(join(testDir, '.specflow-lib', 'personas', 'pm.md'), '# PM\nYou are the PM.');
  await writeFile(join(testDir, '.specflow-lib', 'personas', 'architect.md'), '# Architect\nYou are an architect.');

  // Write methodology for scope-assessment
  await writeFile(join(testDir, '.specflow-lib', 'methodology', 'scope-assessment.md'), '# Scope Assessment\nScope framework.');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('secondary outputs in context response', () => {
  it('analyst context includes secondary_outputs', async () => {
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '0-triage.md'), '# Triage\nTriage output.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '0-scope.md'), '# Scope\nScope output.');

    const result = await assembleContext('analyst', testDir, 'test-feat', 'medium');
    if ('error' in result) throw new Error(result.error);

    expect(result.secondary_outputs).toBeDefined();
    expect(result.secondary_outputs).toContain('1.5-codebase-constraints.md');
  });

  it('architect context does not include secondary_outputs', async () => {
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '1-spec.md'), '# Spec\nSpec output.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '1.5-codebase-constraints.md'), '# Constraints\nConstraints output.');

    const result = await assembleContext('architect', testDir, 'test-feat', 'medium');
    if ('error' in result) throw new Error(result.error);

    expect(result.secondary_outputs).toBeUndefined();
  });

  it('secondary_outputs does not replace output_path', async () => {
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '0-triage.md'), '# Triage\nTriage output.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '0-scope.md'), '# Scope\nScope output.');

    const result = await assembleContext('analyst', testDir, 'test-feat', 'medium');
    if ('error' in result) throw new Error(result.error);

    expect(typeof result.output_path).toBe('string');
    expect(result.output_path).toContain('1-spec.md');
  });
});

describe('strict mode: required artifact enforcement', () => {
  it('blocks dev-story context when requirements lock is missing in strict mode', async () => {
    await writeFile(join(testDir, '.specflow-lib', 'personas', 'dev.md'), '# Dev\nYou are a developer.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '2-architecture.md'), '# Architecture\nArch output.');

    const result = await assembleContext('dev-story', testDir, 'test-feat', 'medium', { strict: true });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('required_artifact_missing');
      expect(result.missing).toContain('5-requirements-lock.md');
    }
  });

  it('allows dev-story context when required artifacts are present in strict mode', async () => {
    await writeFile(join(testDir, '.specflow-lib', 'personas', 'dev.md'), '# Dev\nYou are a developer.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '5-requirements-lock.md'), '# Requirements Lock\nFR-001: Test requirement.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '2-architecture.md'), '# Architecture\nArch output.');

    const result = await assembleContext('dev-story', testDir, 'test-feat', 'medium', { strict: true });
    expect('error' in result).toBe(false);
  });

  it('default (no strict) returns context even when required artifacts missing', async () => {
    await writeFile(join(testDir, '.specflow-lib', 'personas', 'dev.md'), '# Dev\nYou are a developer.');
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '2-architecture.md'), '# Architecture\nArch output.');

    const result = await assembleContext('dev-story', testDir, 'test-feat', 'medium');
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.warnings?.some(w => w.type === 'artifact_missing')).toBe(true);
    }
  });
});

describe('methodology loading for triage/scope', () => {
  it('triage phase loads scope-assessment methodology', async () => {
    const result = await assembleContext('triage', testDir, 'test-feat', null);
    if ('error' in result) throw new Error(result.error);

    expect(result.methodology.length).toBeGreaterThan(0);
    expect(result.methodology.some(m => m.includes('Scope Assessment'))).toBe(true);
  });

  it('scope phase loads scope-assessment methodology', async () => {
    await writeFile(join(testDir, '.specflow', 'features', 'test-feat', '0-triage.md'), '# Triage\nTriage output.');

    const result = await assembleContext('scope', testDir, 'test-feat', null);
    if ('error' in result) throw new Error(result.error);

    expect(result.methodology.length).toBeGreaterThan(0);
    expect(result.methodology.some(m => m.includes('Scope Assessment'))).toBe(true);
  });
});
