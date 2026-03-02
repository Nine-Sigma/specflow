import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { assembleContext } from '../../context.js';
import { handleState } from '../../state.js';
import { validateArtifact } from '../../validate.js';
import { type ContextResponse, type ValidationResponse, PHASE_OUTPUT_MAP } from '../../types.js';
import { setupFullE2EProject, buildArtifact } from '../fixtures/helpers.js';
import { MetricsCollector } from '../metrics/harness.js';
import { registerCollector } from '../metrics/registry.js';

// --- 7.1: Workflow lifecycle test ---
describe('workflow lifecycle: full start-to-completion', () => {
  let testDir: string;
  const slug = 'lifecycle-test';

  beforeAll(async () => {
    testDir = await setupFullE2EProject(slug);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('executes full workflow with all state transitions', async () => {
    // Start feature
    const startResult = await handleState('start', { feature: slug, description: 'Lifecycle test' }, testDir);
    expect(startResult.feature).toBe(slug);
    expect(startResult.phase).toBe('triage');

    // Define the core workflow phases (medium scope path)
    const corePhases = [
      'triage', 'scope', 'analyst', 'codebase-analysis', 'architect',
      'security', 'tea', 'synthesis',
    ];

    for (const phase of corePhases) {
      // Update to this phase
      await handleState('update', { phase, agent: phase }, testDir);

      // Verify context loads
      const ctx = await assembleContext(phase, testDir, slug, 'medium');
      expect('persona' in ctx).toBe(true);

      // Mark complete
      await handleState('complete', { phase }, testDir);
    }

    // Verify all phases are completed
    const state = await handleState('read', undefined, testDir);
    const completed = state.completed_phases as string[];
    for (const phase of corePhases) {
      expect(completed).toContain(phase);
    }

    // Continue with dev + checkpoint
    await handleState('update', { phase: 'dev-story', agent: 'dev' }, testDir);
    await writeFile(
      join(testDir, '.specflow', 'features', slug, '6-dev-output.md'),
      buildArtifact('dev-output'),
    );
    await handleState('complete', { phase: 'dev-story' }, testDir);

    await handleState('update', { phase: 'checkpoint-dev', agent: 'pm' }, testDir);
    const devValidation = await validateArtifact('dev-story', testDir, slug);
    expect('valid' in devValidation).toBe(true);

    // Record checkpoint-dev validation metrics
    const devV = devValidation as ValidationResponse;
    const devMetrics = new MetricsCollector('checkpoint-dev', 'medium', 'workflow-lifecycle', 'workflow');
    if (devV.checks.requirement_coverage) {
      devMetrics.recordValidation({
        requirementsCovered: devV.checks.requirement_coverage.covered,
        requirementsTotal: devV.checks.requirement_coverage.total,
        coverageRate: devV.checks.requirement_coverage.total > 0
          ? devV.checks.requirement_coverage.covered / devV.checks.requirement_coverage.total
          : 0,
        unknownReferences: devV.findings
          .filter(f => f.type === 'unknown_reference')
          .map(f => f.id)
          .filter((id): id is string => id !== undefined),
      });
    }
    await registerCollector(devMetrics);

    await handleState('complete', { phase: 'checkpoint-dev' }, testDir);

    // QA phase
    await handleState('update', { phase: 'qa-verify', agent: 'qa' }, testDir);
    await writeFile(
      join(testDir, '.specflow', 'features', slug, '7-qa-output.md'),
      buildArtifact('qa-output'),
    );
    await handleState('complete', { phase: 'qa-verify' }, testDir);

    await handleState('update', { phase: 'checkpoint-qa', agent: 'pm' }, testDir);
    await handleState('complete', { phase: 'checkpoint-qa' }, testDir);

    // Review
    await handleState('update', { phase: 'review', agent: 'pm' }, testDir);
    await handleState('complete', { phase: 'review' }, testDir);

    // Complete
    await handleState('update', { phase: 'complete', agent: 'pm' }, testDir);
    await handleState('complete', { phase: 'complete' }, testDir);

    // Final state check
    const finalState = await handleState('read', undefined, testDir);
    const allCompleted = finalState.completed_phases as string[];
    expect(allCompleted).toContain('triage');
    expect(allCompleted).toContain('complete');
    expect(allCompleted.length).toBeGreaterThanOrEqual(12);
  });
});

// --- 7.8: Multi-feature context switching ---
describe('multi-feature context switching', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = await setupFullE2EProject('feature-a');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('start two features, resume second, verify correct artifacts loaded', async () => {
    // Start feature A
    await handleState('start', { feature: 'feature-a', description: 'Feature A' }, testDir);
    await handleState('update', { phase: 'triage', agent: 'pm' }, testDir);
    await handleState('complete', { phase: 'triage' }, testDir);

    // Create feature B directory and artifacts
    const { mkdir } = await import('fs/promises');
    const featureBDir = join(testDir, '.specflow', 'features', 'feature-b');
    await mkdir(join(featureBDir, 'drift'), { recursive: true });

    // Write distinct triage for feature B
    await writeFile(join(featureBDir, '0-triage.md'), '## Triage\n### Feature: feature-b\nThis is feature B with unique content for identification.');
    await writeFile(join(featureBDir, '0-scope.md'), '## Scope\n### Level: small\nFeature B scope assessment.');

    // Start feature B (creates its own workflow-state.json)
    await handleState('start', { feature: 'feature-b', description: 'Feature B' }, testDir);

    // Feature B should now be active (most recent updated_at)
    const state = await handleState('read', undefined, testDir);
    expect(state.feature).toBe('feature-b');

    // Context should load feature B artifacts
    const ctx = await assembleContext('scope', testDir, 'feature-b', null);
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['0-triage.md']).toContain('feature B');
    }

    // Feature A state should remain unchanged
    const featureAState = JSON.parse(
      await readFile(join(testDir, '.specflow', 'features', 'feature-a', 'workflow-state.json'), 'utf8'),
    );
    expect(featureAState.completed_phases).toContain('triage');
  });
});

// --- 7.9: Deterministic feature selection ---
describe('deterministic feature selection', () => {
  it('features with close timestamps are selected consistently', async () => {
    const testDir = await setupFullE2EProject('alpha-feature');
    const { mkdir } = await import('fs/promises');

    // Create two features with very close timestamps
    const now = new Date().toISOString();

    // Feature alpha
    const alphaState = {
      feature: 'alpha-feature',
      description: 'Alpha',
      phase: 'triage',
      last_agent: null,
      scope: null,
      pillars: [],
      completed_phases: [],
      last_completed_at: null,
      created_at: now,
      updated_at: now,
    };
    await writeFile(
      join(testDir, '.specflow', 'features', 'alpha-feature', 'workflow-state.json'),
      JSON.stringify(alphaState, null, 2),
    );

    // Feature beta (same timestamp)
    await mkdir(join(testDir, '.specflow', 'features', 'beta-feature'), { recursive: true });
    const betaState = { ...alphaState, feature: 'beta-feature', description: 'Beta' };
    await writeFile(
      join(testDir, '.specflow', 'features', 'beta-feature', 'workflow-state.json'),
      JSON.stringify(betaState, null, 2),
    );

    // Read state multiple times — should be consistent
    const results = await Promise.all([
      handleState('read', undefined, testDir),
      handleState('read', undefined, testDir),
      handleState('read', undefined, testDir),
    ]);

    const selectedFeatures = results.map(r => r.feature);
    // All should select the same feature
    expect(new Set(selectedFeatures).size).toBe(1);

    await rm(testDir, { recursive: true, force: true });
  });
});

// --- 7.10: Dual state file consistency ---
describe('dual state file consistency', () => {
  it('workflow-state.json and STATE.md stay in sync', async () => {
    const testDir = await setupFullE2EProject('dual-state-test');
    await handleState('start', { feature: 'dual-state-test', description: 'Test' }, testDir);
    await handleState('update', { phase: 'analyst', agent: 'analyst', scope: 'medium' }, testDir);
    await handleState('complete', { phase: 'analyst' }, testDir);

    // Read both files
    const jsonState = JSON.parse(
      await readFile(join(testDir, '.specflow', 'features', 'dual-state-test', 'workflow-state.json'), 'utf8'),
    );
    const stateMd = await readFile(join(testDir, '.specflow', 'STATE.md'), 'utf8');

    // Feature matches
    expect(stateMd).toContain(`Feature: ${jsonState.feature}`);

    // Completed phases reflected
    for (const phase of jsonState.completed_phases) {
      expect(stateMd).toContain(`- ${phase}`);
    }

    // Scope reflected
    expect(stateMd).toContain('Scope: medium');

    await rm(testDir, { recursive: true, force: true });
  });
});

// --- 7.13: Resume after interrupted session ---
describe('resume after interrupted session', () => {
  it('detects in-progress state on resume', async () => {
    const testDir = await setupFullE2EProject('interrupted-test');

    // Start and move to dev-story without completing
    await handleState('start', { feature: 'interrupted-test', description: 'Test' }, testDir);
    await handleState('update', { phase: 'dev-story', agent: 'dev' }, testDir);
    await handleState('complete', { phase: 'triage' }, testDir);
    await handleState('complete', { phase: 'analyst' }, testDir);
    // Note: dev-story is NOT completed — simulating interruption

    // Resume
    const resumed = await handleState('resume', undefined, testDir);
    expect(resumed.feature).toBe('interrupted-test');
    expect(resumed.current_phase).toBe('dev-story');
    expect(resumed.completed_phases).not.toContain('dev-story');
    expect(resumed.last_completed_at).toBeDefined();

    await rm(testDir, { recursive: true, force: true });
  });
});

// --- 7.15: Workflow-level metrics ---
describe('workflow metrics collection', () => {
  it('captures timing for each phase transition', async () => {
    const testDir = await setupFullE2EProject('metrics-workflow');
    const metrics = new MetricsCollector('workflow', null, 'workflow-lifecycle', 'workflow');

    await handleState('start', { feature: 'metrics-workflow', description: 'Test' }, testDir);

    // Time a few phase transitions
    await metrics.time('triage-context', () =>
      assembleContext('triage', testDir, 'metrics-workflow', null),
    );

    await metrics.time('stateTransition', async () => {
      await handleState('update', { phase: 'analyst', agent: 'analyst' }, testDir);
      await handleState('complete', { phase: 'analyst' }, testDir);
    });

    await metrics.time('validation', () =>
      validateArtifact('triage', testDir, 'metrics-workflow'),
    );

    const m = metrics.getMetrics();
    expect(m.timing['triage-context']).toBeGreaterThan(0);
    expect(m.timing.stateTransition).toBeGreaterThan(0);
    expect(m.timing.validation).toBeGreaterThan(0);

    await registerCollector(metrics);
    await rm(testDir, { recursive: true, force: true });
  });
});
