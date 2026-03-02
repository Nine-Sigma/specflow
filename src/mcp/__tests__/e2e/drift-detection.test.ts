import { describe, it, expect, afterAll } from 'vitest';
import { rm, writeFile, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { assembleContext } from '../../context.js';
import { handleState } from '../../state.js';
import { validateArtifact } from '../../validate.js';
import { type ContextResponse, type ValidationResponse } from '../../types.js';
import { setupFullE2EProject, buildArtifact } from '../fixtures/helpers.js';
import { MetricsCollector } from '../metrics/harness.js';
import { registerCollector } from '../metrics/registry.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map(d => rm(d, { recursive: true, force: true })));
});

// --- 7.3: Drift detection ---
describe('drift detection: checkpoint catches unknown FR IDs', () => {
  it('dev output with unknown FR IDs triggers drift', async () => {
    const dir = await setupFullE2EProject('drift-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'drift-test');

    await handleState('start', { feature: 'drift-test', description: 'Drift test' }, dir);

    // Write lock with known IDs
    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Requirements Lock\n- FR-01: Login\n- FR-02: Logout\n- TC-01: Auth tests',
    );

    // Write dev output with unknown FR-99
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 and FR-02.\nAlso added FR-99 for analytics tracking.\nTC-01 covered.',
    );

    // Validate at checkpoint-dev
    const result = await validateArtifact('dev-story', dir, 'drift-test');
    expect('valid' in result).toBe(true);
    const v = result as ValidationResponse;

    // Should detect FR-99 as unknown reference
    const unknownRefs = v.findings.filter(f => f.type === 'unknown_reference');
    expect(unknownRefs.length).toBeGreaterThan(0);
    expect(unknownRefs.some(f => f.id === 'FR-99')).toBe(true);

    // Record validation metrics
    const metrics = new MetricsCollector('checkpoint-dev', 'medium', 'drift-detection', 'drift');
    if (v.checks.requirement_coverage) {
      metrics.recordValidation({
        requirementsCovered: v.checks.requirement_coverage.covered,
        requirementsTotal: v.checks.requirement_coverage.total,
        coverageRate: v.checks.requirement_coverage.total > 0
          ? v.checks.requirement_coverage.covered / v.checks.requirement_coverage.total
          : 0,
        unknownReferences: unknownRefs.map(f => f.id).filter((id): id is string => id !== undefined),
      });
    }
    await registerCollector(metrics);
  });
});

// --- 7.4: No-drift happy path ---
describe('no-drift happy path', () => {
  it('valid dev output passes checkpoint', async () => {
    const dir = await setupFullE2EProject('no-drift-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'no-drift-test');

    await handleState('start', { feature: 'no-drift-test', description: 'Clean test' }, dir);

    // Write matching lock and dev output
    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Requirements Lock\n- FR-01: Login\n- FR-02: Logout\n- TC-01: Auth tests',
    );
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 and FR-02 completely.\nTC-01 covered with unit tests.\nAll acceptance criteria met.',
    );

    const result = await validateArtifact('dev-story', dir, 'no-drift-test');
    expect('valid' in result).toBe(true);
    const v = result as ValidationResponse;

    expect(v.valid).toBe(true);
    expect(v.checks.requirement_coverage!.covered).toBe(3);
    expect(v.checks.requirement_coverage!.total).toBe(3);
    expect(v.checks.requirement_coverage!.missing).toHaveLength(0);
    expect(v.findings.filter(f => f.type === 'unknown_reference')).toHaveLength(0);

    const metrics = new MetricsCollector('checkpoint-dev', 'medium', 'no-drift', 'drift');
    metrics.recordValidation({
      requirementsCovered: v.checks.requirement_coverage!.covered,
      requirementsTotal: v.checks.requirement_coverage!.total,
      coverageRate: 1,
      unknownReferences: [],
    });
    await registerCollector(metrics);
  });
});

// --- 7.5: Checkpoint coverage validation ---
describe('checkpoint-dev coverage validation', () => {
  it('checks requirement coverage against lock', async () => {
    const dir = await setupFullE2EProject('coverage-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'coverage-test');

    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Lock\n- FR-01: Login\n- FR-02: Logout\n- FR-03: Profile\n- TC-01: Tests',
    );
    // Dev output only covers FR-01 and FR-02 (missing FR-03 and TC-01)
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 login flow.\nImplemented FR-02 logout flow.',
    );

    const result = await validateArtifact('dev-story', dir, 'coverage-test');
    expect('valid' in result).toBe(true);
    const v = result as ValidationResponse;

    expect(v.checks.requirement_coverage!.total).toBe(4);
    expect(v.checks.requirement_coverage!.covered).toBe(2);
    expect(v.checks.requirement_coverage!.missing).toContain('FR-03');
    expect(v.checks.requirement_coverage!.missing).toContain('TC-01');

    const metrics = new MetricsCollector('checkpoint-dev', 'medium', 'coverage-validation', 'drift');
    metrics.recordValidation({
      requirementsCovered: v.checks.requirement_coverage!.covered,
      requirementsTotal: v.checks.requirement_coverage!.total,
      coverageRate: v.checks.requirement_coverage!.covered / v.checks.requirement_coverage!.total,
      unknownReferences: [],
    });
    await registerCollector(metrics);
  });
});

// --- 7.6: Drift-fix invented ID test ---
describe('drift-fix does not introduce new IDs', () => {
  it('corrected artifact only uses IDs from the lock', async () => {
    const dir = await setupFullE2EProject('drift-fix-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'drift-fix-test');

    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Lock\n- FR-01: Login\n- FR-02: Logout',
    );

    // Write a "corrected" dev output that only uses lock IDs
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output (Fixed)\nImplemented FR-01 and FR-02.\nNo additional requirements introduced.',
    );

    const result = await validateArtifact('dev-story', dir, 'drift-fix-test');
    expect('valid' in result).toBe(true);
    const v = result as ValidationResponse;

    // No unknown references
    const unknownRefs = v.findings.filter(f => f.type === 'unknown_reference');
    expect(unknownRefs).toHaveLength(0);

    // All lock IDs covered
    expect(v.checks.requirement_coverage!.covered).toBe(2);
    expect(v.checks.requirement_coverage!.total).toBe(2);
  });
});

// --- 7.7: Review loop test ---
describe('review loop: findings → dev → checkpoint → re-review', () => {
  it('routes back through dev and re-validates', async () => {
    const dir = await setupFullE2EProject('review-loop-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'review-loop-test');

    await handleState('start', { feature: 'review-loop-test', description: 'Review loop' }, dir);

    // Set up lock
    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Lock\n- FR-01: Login\n- FR-02: Logout',
    );

    // First dev output — missing FR-02 (do not mention the ID at all)
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output v1\nImplemented FR-01 only. Logout feature not yet started.',
    );

    // First checkpoint — should detect missing coverage
    const firstCheck = await validateArtifact('dev-story', dir, 'review-loop-test');
    const v1 = firstCheck as ValidationResponse;
    expect(v1.checks.requirement_coverage!.missing).toContain('FR-02');

    // Route back to dev — write corrected output
    await handleState('update', { phase: 'dev-story', agent: 'dev' }, dir);
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output v2\nImplemented FR-01 login flow with session management and input validation.\nImplemented FR-02 logout flow with token revocation and session cleanup.',
    );
    await handleState('complete', { phase: 'dev-story' }, dir);

    // Re-checkpoint — should now pass
    const secondCheck = await validateArtifact('dev-story', dir, 'review-loop-test');
    const v2 = secondCheck as ValidationResponse;
    expect(v2.valid).toBe(true);
    expect(v2.checks.requirement_coverage!.covered).toBe(2);
    expect(v2.checks.requirement_coverage!.missing).toHaveLength(0);

    const metrics = new MetricsCollector('checkpoint-dev', 'medium', 'review-loop', 'drift');
    metrics.recordValidation({
      requirementsCovered: v2.checks.requirement_coverage!.covered,
      requirementsTotal: v2.checks.requirement_coverage!.total,
      coverageRate: 1,
      unknownReferences: [],
    });
    await registerCollector(metrics);
  });
});

// --- 7.11: Sprint status circular dependency ---
describe('sprint status circular dependency', () => {
  it('circular deps result in no ready stories from next-wave', async () => {
    const dir = await setupFullE2EProject('circular-deps-test');
    dirs.push(dir);

    await handleState('start', { feature: 'circular-deps-test', description: 'Test' }, dir);

    // Write sprint status with circular deps
    const sprintStatus = {
      stories: [
        { id: 'story-a', status: 'pending', wave: 1, dependencies: ['story-b'] },
        { id: 'story-b', status: 'pending', wave: 1, dependencies: ['story-a'] },
      ],
      waves: [{ number: 1 }],
    };
    await writeFile(
      join(dir, '.specflow', 'features', 'circular-deps-test', 'sprint-status.yaml'),
      stringifyYaml(sprintStatus),
    );

    // next-wave should return no ready stories (both are blocked by each other)
    const result = await handleState('next-wave', undefined, dir);
    expect(result.stories).toEqual([]);
  });
});

// --- 7.12: Sprint status malformed YAML ---
describe('sprint status malformed YAML', () => {
  it('handles missing fields gracefully', async () => {
    const dir = await setupFullE2EProject('malformed-yaml-test');
    dirs.push(dir);

    await handleState('start', { feature: 'malformed-yaml-test', description: 'Test' }, dir);

    // Write YAML with missing stories field
    await writeFile(
      join(dir, '.specflow', 'features', 'malformed-yaml-test', 'sprint-status.yaml'),
      'waves:\n  - number: 1\n',
    );

    // Should not throw — should handle gracefully
    const result = await handleState('next-wave', undefined, dir);
    expect(result).toBeDefined();
    // When stories is undefined, next-wave returns empty
    expect(result.stories).toEqual([]);
  });

  it('handles completely empty YAML gracefully', async () => {
    const dir = await setupFullE2EProject('empty-yaml-test');
    dirs.push(dir);

    await handleState('start', { feature: 'empty-yaml-test', description: 'Test' }, dir);

    await writeFile(
      join(dir, '.specflow', 'features', 'empty-yaml-test', 'sprint-status.yaml'),
      '',
    );

    const result = await handleState('next-wave', undefined, dir);
    expect(result).toBeDefined();
  });
});

// --- 7.14: Artifact version alignment ---
describe('artifact version alignment', () => {
  it('can detect stale dev output via file timestamps', async () => {
    const dir = await setupFullE2EProject('version-align-test');
    dirs.push(dir);
    const featureDir = join(dir, '.specflow', 'features', 'version-align-test');

    // Write dev output first (older)
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 and FR-02.',
    );

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 50));

    // Regenerate requirements-lock (newer)
    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Lock v2\n- FR-01: Login (updated)\n- FR-02: Logout (updated)\n- FR-03: New Requirement',
    );

    // Check timestamps
    const devStat = await stat(join(featureDir, '6-dev-output.md'));
    const lockStat = await stat(join(featureDir, '5-requirements-lock.md'));

    // Lock is newer than dev output
    expect(lockStat.mtimeMs).toBeGreaterThan(devStat.mtimeMs);

    // Validation should still detect missing coverage for FR-03
    const result = await validateArtifact('dev-story', dir, 'version-align-test');
    if ('valid' in result) {
      const v = result as ValidationResponse;
      expect(v.checks.requirement_coverage!.missing).toContain('FR-03');
    }
  });
});
