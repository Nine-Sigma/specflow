import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveProjectRoot } from './root.js';
import { assembleContext } from './context.js';
import { handleState } from './state.js';
import { validateArtifact } from './validate.js';

// Create a temp project directory for each test
let testDir: string;

async function setupTestProject(): Promise<string> {
  const dir = join(tmpdir(), `specflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(dir, '.specflow', 'features'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'personas'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'scoping'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'requirements'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'testing'), { recursive: true });

  // Write persona files
  await writeFile(join(dir, '.specflow-lib', 'personas', 'pm.md'), '# John — PM\nOrchestrator persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'analyst.md'), '# Mary — Analyst\nRequirements persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'architect.md'), '# Winston — Architect\nArchitecture persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'security.md'), '# Jordan — Security\nSecurity persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'cost.md'), '# Taylor — Cost\nCost persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'dev.md'), '# Amelia — Dev\nDev persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'qa.md'), '# Quinn — QA\nQA persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'ux-designer.md'), '# Sally — UX\nUX persona');

  // Write expertise files
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'scoping', 'scope-levels.md'), '## Scope Levels\nscoping content');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'requirements', 'boss-criteria.md'), '## BOSS Criteria\nrequirements content');

  // Write STATE.md
  await writeFile(join(dir, '.specflow', 'STATE.md'), '# Project State\n\nNot started');

  return dir;
}

beforeEach(async () => {
  testDir = await setupTestProject();
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// --- Project Root Resolution ---

describe('resolveProjectRoot', () => {
  it('finds project root from exact directory', async () => {
    const root = await resolveProjectRoot(testDir);
    expect(root).toBe(testDir);
  });

  it('finds project root from subdirectory', async () => {
    const subDir = join(testDir, 'src', 'components');
    await mkdir(subDir, { recursive: true });
    const root = await resolveProjectRoot(subDir);
    expect(root).toBe(testDir);
  });

  it('returns null when no .specflow found', async () => {
    const noSpecDir = join(tmpdir(), `no-specflow-${Date.now()}`);
    await mkdir(noSpecDir, { recursive: true });
    const root = await resolveProjectRoot(noSpecDir);
    expect(root).toBeNull();
    await rm(noSpecDir, { recursive: true, force: true });
  });
});

// --- Context Assembly ---

describe('assembleContext', () => {
  it('returns error for unknown phase', async () => {
    const result = await assembleContext('nonexistent', testDir, 'test-feature', null);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Unknown phase');
    }
  });

  it('returns error with available features when no active feature', async () => {
    // Create a feature directory
    await mkdir(join(testDir, '.specflow', 'features', 'auth-login'), { recursive: true });

    const result = await assembleContext('analyst', testDir, null, null);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('no_active_feature');
      expect(result.available_features).toContain('auth-login');
    }
  });

  it('loads correct persona for security phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    expect('persona' in result).toBe(true);
    if ('persona' in result) {
      expect(result.persona).toContain('Jordan');
    }
  });

  it('loads ux-designer persona for ux phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('ux', testDir, featureSlug, null);
    if ('persona' in result) {
      expect(result.persona).toContain('Sally');
    }
  });

  it('loads PM persona for tea phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('tea', testDir, featureSlug, null);
    if ('persona' in result) {
      expect(result.persona).toContain('John');
    }
  });

  it('includes scope in response', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    if ('scope' in result && !('error' in result)) {
      expect(result.scope).toBe('medium');
    }
  });

  it('loads scoped expertise for analyst phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('analyst', testDir, featureSlug, null);
    if ('expertise' in result) {
      expect(result.expertise.length).toBeGreaterThan(0);
      expect(result.expertise.some(e => e.includes('BOSS'))).toBe(true);
    }
  });

  it('returns no expertise for dev-story phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('dev-story', testDir, featureSlug, null);
    if ('expertise' in result) {
      expect(result.expertise).toHaveLength(0);
    }
  });

  it('loads artifacts for architect phase', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '1-spec.md'), '## Requirements\nThe system shall...');
    await writeFile(join(featureDir, '1.5-codebase-constraints.md'), '## Codebase\nTypeScript project');

    const result = await assembleContext('architect', testDir, featureSlug, null);
    if ('artifacts' in result) {
      expect(result.artifacts['1-spec.md']).toContain('Requirements');
      expect(result.artifacts['1.5-codebase-constraints.md']).toContain('Codebase');
      expect(result.artifacts['0-triage.md']).toBeUndefined(); // Not needed by architect
    }
  });

  it('warns about missing artifacts', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });
    // Don't create 1-spec.md — it should be missing

    const result = await assembleContext('architect', testDir, featureSlug, null);
    if ('warnings' in result) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.type === 'artifact_missing')).toBe(true);
    }
  });

  it('truncates oversized artifacts', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    // Write a very large artifact
    const largeContent = 'x'.repeat(40_000);
    await writeFile(join(featureDir, '1-spec.md'), largeContent);

    const result = await assembleContext('architect', testDir, featureSlug, null);
    if ('artifacts' in result) {
      expect(result.artifacts['1-spec.md'].length).toBe(30_000);
      expect(result.truncated).toBe(true);
    }
  });

  it('resolves output path for security phase', async () => {
    const featureSlug = 'auth-login';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('security', testDir, featureSlug, null);
    if ('output_path' in result) {
      expect(result.output_path).toBe('.specflow/features/auth-login/3-security.md');
    }
  });
});

// --- State Management ---

describe('handleState', () => {
  it('returns null state when no active workflow', async () => {
    const result = await handleState('read', undefined, testDir);
    expect(result.feature).toBeNull();
    expect(result.phase).toBeNull();
  });

  it('starts a new feature workflow', async () => {
    const result = await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    expect(result.feature).toBe('auth-login');
    expect(result.phase).toBe('triage');
    expect(result.completed_phases).toEqual([]);
  });

  it('returns error when starting duplicate feature', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    const result = await handleState('start', { feature: 'auth-login', description: 'Duplicate' }, testDir);
    expect(result.error).toBeDefined();
  });

  it('reads state after starting', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    const result = await handleState('read', undefined, testDir);
    expect(result.feature).toBe('auth-login');
  });

  it('updates state fields partially', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    const result = await handleState('update', { phase: 'architect', agent: 'architect' }, testDir);
    expect(result.phase).toBe('architect');
    expect(result.last_agent).toBe('architect');
    expect(result.feature).toBe('auth-login'); // Preserved
  });

  it('updates scope and pillars', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    const result = await handleState('update', {
      scope: 'medium',
      pillars: ['security', 'cost', 'testing'],
    }, testDir);
    expect(result.scope).toBe('medium');
    expect(result.pillars).toEqual(['security', 'cost', 'testing']);
  });

  it('completes a phase', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    const result = await handleState('complete', { phase: 'analyst' }, testDir);
    expect((result.completed_phases as string[]).includes('analyst')).toBe(true);
    expect(result.last_completed_at).toBeDefined();
  });

  it('completes phase idempotently', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    await handleState('complete', { phase: 'analyst' }, testDir);
    const result = await handleState('complete', { phase: 'analyst' }, testDir);
    const completed = result.completed_phases as string[];
    expect(completed.filter(p => p === 'analyst')).toHaveLength(1);
  });

  it('resumes state with snapshot', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    await handleState('update', { scope: 'medium', pillars: ['security'] }, testDir);
    await handleState('complete', { phase: 'triage' }, testDir);

    const result = await handleState('resume', undefined, testDir);
    expect(result.feature).toBe('auth-login');
    expect(result.scope).toBe('medium');
    expect(result.pillars).toEqual(['security']);
    expect((result.completed_phases as string[])).toContain('triage');
    expect(result.sprint_status).toBeNull(); // No sprint status yet
  });

  it('updates STATE.md on state changes', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);
    await handleState('update', { phase: 'security', agent: 'security' }, testDir);

    const stateMd = await readFile(join(testDir, '.specflow', 'STATE.md'), 'utf8');
    expect(stateMd).toContain('Feature: auth-login');
    expect(stateMd).toContain('Phase: security');
  });

  it('handles concurrent phase completions safely', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Add login' }, testDir);

    // Simulate concurrent completions
    const results = await Promise.all([
      handleState('complete', { phase: 'security' }, testDir),
      handleState('complete', { phase: 'cost' }, testDir),
    ]);

    // Read final state
    const finalState = await handleState('read', undefined, testDir);
    const completed = finalState.completed_phases as string[];
    expect(completed).toContain('security');
    expect(completed).toContain('cost');
  });

  it('returns error for unknown action', async () => {
    const result = await handleState('invalid', undefined, testDir);
    expect(result.error).toBeDefined();
  });
});

// --- Artifact Validation ---

describe('validateArtifact', () => {
  it('returns error for unknown phase', async () => {
    const result = await validateArtifact('nonexistent', testDir, 'test');
    expect('error' in result).toBe(true);
  });

  it('returns valid for phases with no output', async () => {
    const result = await validateArtifact('execution-routing', testDir, 'test');
    if (!('error' in result)) {
      expect(result.valid).toBe(true);
    }
  });

  it('detects missing artifact', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await validateArtifact('security', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.valid).toBe(false);
      expect(result.checks.artifact_exists).toBe(false);
    }
  });

  it('validates content quality (substantive)', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '3-security.md'), '## Security Analysis\n\nThe system has several threat vectors including SQL injection, XSS, and CSRF attacks.');

    const result = await validateArtifact('security', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.checks.artifact_exists).toBe(true);
      expect(result.checks.content_quality).toBe(true);
    }
  });

  it('flags empty template as low quality', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '3-security.md'), '## Security Analysis\n\n## Threats\n\n');

    const result = await validateArtifact('security', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.checks.content_quality).toBe(false);
      expect(result.valid).toBe(false);
    }
  });

  it('checks requirement coverage for dev-story phase', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '5-requirements-lock.md'), 'FR-01 Login\nFR-02 Logout\nFR-03 Session\nAC-01 Accept\nTC-01 Test');
    await writeFile(join(featureDir, '6-dev-output.md'), 'Implemented FR-01 and FR-02.\nAlso covered AC-01 and TC-01.');

    const result = await validateArtifact('dev-story', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.checks.requirement_coverage).toBeDefined();
      expect(result.checks.requirement_coverage!.total).toBe(5);
      expect(result.checks.requirement_coverage!.covered).toBe(4);
      expect(result.checks.requirement_coverage!.missing).toContain('FR-03');
    }
  });

  it('normalizes requirement IDs (FR-1 matches FR-01)', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '5-requirements-lock.md'), 'FR-01 Login\nFR-02 Logout');
    await writeFile(join(featureDir, '6-dev-output.md'), 'Implemented FR-1 and FR-2 successfully.');

    const result = await validateArtifact('dev-story', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.checks.requirement_coverage!.covered).toBe(2);
      expect(result.checks.requirement_coverage!.total).toBe(2);
    }
  });

  it('flags invented identifiers', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '5-requirements-lock.md'), 'FR-01 Login');
    await writeFile(join(featureDir, '6-dev-output.md'), 'Implemented FR-01 and also FR-99 and AC-42.');

    const result = await validateArtifact('dev-story', testDir, featureSlug);
    if (!('error' in result)) {
      const unknownRefs = result.findings.filter(f => f.type === 'unknown_reference');
      expect(unknownRefs.length).toBeGreaterThan(0);
      expect(unknownRefs.some(f => f.id === 'FR-99')).toBe(true);
    }
  });

  it('skips requirement coverage for non-applicable phases', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '2-architecture.md'), '## Architecture\nThis is the architecture document with sufficient content.');

    const result = await validateArtifact('architect', testDir, featureSlug);
    if (!('error' in result)) {
      expect(result.checks.requirement_coverage).toBeUndefined();
    }
  });

  it('warns when requirements-lock is missing', async () => {
    const featureSlug = 'test-feature';
    const featureDir = join(testDir, '.specflow', 'features', featureSlug);
    await mkdir(featureDir, { recursive: true });

    await writeFile(join(featureDir, '6-dev-output.md'), 'Implemented everything successfully with plenty of content here.');

    const result = await validateArtifact('dev-story', testDir, featureSlug);
    if (!('error' in result)) {
      const warning = result.findings.find(f => f.type === 'missing_requirements_lock');
      expect(warning).toBeDefined();
    }
  });
});
