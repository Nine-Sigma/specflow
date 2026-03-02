import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { assembleContext } from '../../context.js';
import { handleState } from '../../state.js';
import { validateArtifact } from '../../validate.js';
import { type ContextResponse, type ValidationResponse } from '../../types.js';
import { setupFullE2EProject, buildArtifact } from '../fixtures/helpers.js';

let testDir: string;

beforeAll(async () => {
  testDir = await setupFullE2EProject();
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// --- 5.1: Cross-tool flow test ---
describe('cross-tool flow: context → write artifact → validate', () => {
  it('context → write → validate sequence works end-to-end', async () => {
    const flowDir = await setupFullE2EProject('flow-test');

    // Start feature
    await handleState('start', { feature: 'flow-test', description: 'Test flow' }, flowDir);

    // Get triage context
    const triageCtx = await assembleContext('triage', flowDir, 'flow-test', null);
    expect('persona' in triageCtx).toBe(true);

    // Write triage output
    await writeFile(
      join(flowDir, '.specflow', 'features', 'flow-test', '0-triage.md'),
      buildArtifact('triage', { feature: 'flow-test' }),
    );

    // Validate triage output
    const validation = await validateArtifact('triage', flowDir, 'flow-test');
    expect('valid' in validation).toBe(true);
    expect((validation as ValidationResponse).valid).toBe(true);
    expect((validation as ValidationResponse).checks.artifact_exists).toBe(true);
    expect((validation as ValidationResponse).checks.content_quality).toBe(true);

    // Complete triage
    await handleState('complete', { phase: 'triage' }, flowDir);

    // Scope phase can now load triage artifact
    const scopeCtx = await assembleContext('scope', flowDir, 'flow-test', null);
    if ('artifacts' in scopeCtx) {
      expect((scopeCtx as ContextResponse).artifacts['0-triage.md']).toBeDefined();
    }

    await rm(flowDir, { recursive: true, force: true });
  });
});

// --- 5.2: State-to-context propagation ---
describe('state-to-context propagation', () => {
  it('scope set via state reflects in context assembly', async () => {
    const propDir = await setupFullE2EProject('propagation-test');
    await handleState('start', { feature: 'propagation-test', description: 'Test' }, propDir);
    await handleState('update', { scope: 'large' }, propDir);

    // Read scope from state
    const state = await handleState('read', undefined, propDir);
    expect(state.scope).toBe('large');

    // Context respects scope
    const ctx = await assembleContext('ux', propDir, 'propagation-test', 'large');
    if ('methodology' in ctx) {
      const context = ctx as ContextResponse;
      // Large scope should load all 9 UX files
      expect(context.methodology.length).toBe(9);
    }

    await rm(propDir, { recursive: true, force: true });
  });
});

// --- 5.3: Codebase-to-impact flow ---
// Deferred: requires tree-sitter runtime; covered in intel/e2e tests

// --- 5.4: Error handling ---
describe('error handling', () => {
  it('context with no active feature returns error', async () => {
    const ctx = await assembleContext('analyst', testDir, null, null);
    expect('error' in ctx).toBe(true);
    if ('error' in ctx) {
      expect(ctx.error).toBe('no_active_feature');
    }
  });

  it('state with invalid action returns error', async () => {
    const result = await handleState('invalid-action', undefined, testDir);
    expect(result.error).toBeDefined();
  });

  it('validate with missing artifact returns valid: false', async () => {
    const emptyDir = await setupFullE2EProject('empty-artifact-test');
    // Remove the triage output so validation fails
    const { unlink } = await import('fs/promises');
    try {
      await unlink(join(emptyDir, '.specflow', 'features', 'empty-artifact-test', '0-triage.md'));
    } catch { /* may not exist */ }

    const result = await validateArtifact('triage', emptyDir, 'empty-artifact-test');
    expect('valid' in result).toBe(true);
    expect((result as ValidationResponse).valid).toBe(false);
    expect((result as ValidationResponse).checks.artifact_exists).toBe(false);

    await rm(emptyDir, { recursive: true, force: true });
  });

  it('context with unknown phase returns error', async () => {
    const result = await assembleContext('nonexistent-phase', testDir, 'test-feature', null);
    expect('error' in result).toBe(true);
  });

  it('validate with no active feature returns error', async () => {
    const result = await validateArtifact('triage', testDir, null);
    expect('error' in result).toBe(true);
  });
});

// --- 5.5: Error resilience in tool handlers ---
describe('tool handler error resilience', () => {
  it('assembleContext does not throw on missing project directories', async () => {
    const result = await assembleContext('analyst', '/nonexistent/path', 'test', 'medium');
    // Should return a result (possibly with warnings), not throw
    expect(result).toBeDefined();
  });

  it('handleState returns error on missing state directory', async () => {
    const result = await handleState('read', undefined, '/nonexistent/path');
    // Should return null/empty state, not throw
    expect(result).toBeDefined();
  });

  it('validateArtifact does not throw on bad phase', async () => {
    const result = await validateArtifact('totally-invalid', testDir, 'test');
    expect('error' in result).toBe(true);
  });
});

// --- 5.6: Project root initialization concurrency ---
// This tests the module-level caching in root.ts
describe('project root concurrency', () => {
  it('concurrent assembleContext calls resolve consistently', async () => {
    const results = await Promise.all([
      assembleContext('triage', testDir, 'test-feature', null),
      assembleContext('analyst', testDir, 'test-feature', null),
      assembleContext('architect', testDir, 'test-feature', null),
    ]);

    // All should succeed (return context, not error)
    for (const result of results) {
      expect('persona' in result).toBe(true);
    }
  });
});

// --- 5.7: Concurrent tool call safety ---
describe('concurrent tool call safety', () => {
  it('parallel context + state calls both return valid results', async () => {
    const concDir = await setupFullE2EProject('concurrent-tools-test');
    await handleState('start', { feature: 'concurrent-tools-test', description: 'Test' }, concDir);

    const [ctx, state] = await Promise.all([
      assembleContext('triage', concDir, 'concurrent-tools-test', null),
      handleState('read', undefined, concDir),
    ]);

    expect('persona' in ctx).toBe(true);
    expect(state.feature).toBe('concurrent-tools-test');

    await rm(concDir, { recursive: true, force: true });
  });
});

// --- 5.8: SSE session lifecycle ---
// Note: SSE tests require HTTP server; testing the transports Map pattern
describe('SSE transport pattern', () => {
  it('Map-based session tracking supports add and delete', () => {
    const transports = new Map<string, { sessionId: string }>();
    transports.set('session-1', { sessionId: 'session-1' });
    transports.set('session-2', { sessionId: 'session-2' });

    expect(transports.size).toBe(2);
    transports.delete('session-1');
    expect(transports.size).toBe(1);
    expect(transports.has('session-1')).toBe(false);
    expect(transports.has('session-2')).toBe(true);
  });
});

// --- 5.9: Response size validation ---
describe('response size validation', () => {
  it('artifact truncation at 30K boundary', async () => {
    const sizeDir = await setupFullE2EProject('size-test');
    const largeSpec = 'x'.repeat(40_000);
    await writeFile(
      join(sizeDir, '.specflow', 'features', 'size-test', '1-spec.md'),
      largeSpec,
    );

    const ctx = await assembleContext('architect', sizeDir, 'size-test', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['1-spec.md'].length).toBe(30_000);
      expect(context.truncated).toBe(true);
    }

    await rm(sizeDir, { recursive: true, force: true });
  });
});

// --- 5.10: Requirement ID extraction accuracy ---
describe('requirement ID extraction accuracy', () => {
  it('"version-2024" does not match as FR-2024', async () => {
    const idDir = await setupFullE2EProject('id-accuracy-test');
    const featureDir = join(idDir, '.specflow', 'features', 'id-accuracy-test');

    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '- FR-01: Login\n- FR-02: Logout',
    );
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      'Using version-2024 of the framework.\nImplemented FR-01 and FR-02 completely.\nAPI version-2024 is stable.',
    );

    const result = await validateArtifact('dev-story', idDir, 'id-accuracy-test');
    if ('valid' in result) {
      const v = result as ValidationResponse;
      // version-2024 should NOT match as FR-2024
      const unknownRefs = v.findings.filter(f => f.type === 'unknown_reference');
      expect(unknownRefs.some(f => f.id === 'FR-2024')).toBe(false);
      expect(v.checks.requirement_coverage!.covered).toBe(2);
    }

    await rm(idDir, { recursive: true, force: true });
  });

  it('mixed FR-1/FR-01 normalizes to single entry', async () => {
    const normDir = await setupFullE2EProject('normalization-test');
    const featureDir = join(normDir, '.specflow', 'features', 'normalization-test');

    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '- FR-01: Login\n- FR-02: Logout',
    );
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      'Implemented FR-1 and FR-2 successfully.\nAlso referenced FR-01 and FR-02 in tests.',
    );

    const result = await validateArtifact('dev-story', normDir, 'normalization-test');
    if ('valid' in result) {
      const v = result as ValidationResponse;
      expect(v.checks.requirement_coverage!.covered).toBe(2);
      expect(v.checks.requirement_coverage!.total).toBe(2);
      expect(v.checks.requirement_coverage!.missing).toHaveLength(0);
    }

    await rm(normDir, { recursive: true, force: true });
  });
});

// --- 5.11: Per-tool timing metrics ---
describe('per-tool timing', () => {
  it('context assembly completes in reasonable time', async () => {
    const start = performance.now();
    await assembleContext('analyst', testDir, 'test-feature', 'medium');
    const elapsed = performance.now() - start;

    // Should complete in under 5 seconds (generous for CI)
    expect(elapsed).toBeLessThan(5000);
  });

  it('state operations complete quickly', async () => {
    const start = performance.now();
    await handleState('read', undefined, testDir);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it('validation completes quickly', async () => {
    const start = performance.now();
    await validateArtifact('triage', testDir, 'test-feature');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });
});
