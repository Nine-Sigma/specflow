import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { assembleContext } from '../../context.js';
import { handleState } from '../../state.js';
import {
  PHASE_PERSONA_MAP,
  PHASE_EXPERTISE_MAP,
  type ContextResponse,
} from '../../types.js';
import { setupFullE2EProject } from '../fixtures/helpers.js';
import { MetricsCollector } from '../metrics/harness.js';

let testDir: string;
const collectors: MetricsCollector[] = [];

beforeAll(async () => {
  testDir = await setupFullE2EProject();
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// --- 4.1: Persona name matches PHASE_PERSONA_MAP ---
describe('agent persona mapping', () => {
  const personaNames: Record<string, string> = {
    'pm.md': 'John',
    'analyst.md': 'Mary',
    'architect.md': 'Winston',
    'security.md': 'Jordan',
    'cost.md': 'Taylor',
    'dev.md': 'Amelia',
    'qa.md': 'Quinn',
    'ux-designer.md': 'Sally',
  };

  it.each(Object.entries(PHASE_PERSONA_MAP))(
    'phase %s uses persona %s',
    async (phase, personaFile) => {
      const ctx = await assembleContext(phase, testDir, 'test-feature', 'medium');
      if ('persona' in ctx) {
        const context = ctx as ContextResponse;
        const expectedName = personaNames[personaFile];
        if (expectedName) {
          expect(context.persona).toContain(expectedName);
        }
      }
    },
  );
});

// --- 4.2: Missing persona file ---
describe('missing persona file', () => {
  it('returns empty persona string when file is missing', async () => {
    const missingDir = await setupFullE2EProject('missing-persona-test');
    // Remove the analyst persona
    const { unlink } = await import('fs/promises');
    try {
      await unlink(join(missingDir, '.specflow-lib', 'personas', 'analyst.md'));
    } catch { /* ignore */ }

    const ctx = await assembleContext('analyst', missingDir, 'missing-persona-test', 'medium');
    if ('persona' in ctx) {
      const context = ctx as ContextResponse;
      // When persona file is missing, loadFileContent returns null → empty string
      expect(context.persona).toBe('');
    }

    await rm(missingDir, { recursive: true, force: true });
  });
});

// --- 4.3: Expertise loading validation ---
describe('expertise loading', () => {
  it('analyst gets requirements expertise', async () => {
    const ctx = await assembleContext('analyst', testDir, 'test-feature', 'medium');
    if ('expertise' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.expertise.length).toBeGreaterThan(0);
      // analyst maps to ['requirements/', 'synthesis/codebase-analysis.md']
      expect(context.expertise.some(e => e.includes('BOSS'))).toBe(true);
    }
  });

  it('architect gets architecture expertise', async () => {
    const ctx = await assembleContext('architect', testDir, 'test-feature', 'medium');
    if ('expertise' in ctx) {
      const context = ctx as ContextResponse;
      // architect maps to ['architecture/', 'code-intelligence.md']
      expect(context.expertise.length).toBeGreaterThan(0);
    }
  });

  it('review phase gets review expertise', async () => {
    const ctx = await assembleContext('review', testDir, 'test-feature', 'medium');
    if ('expertise' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.expertise.some(e => e.includes('Review'))).toBe(true);
    }
  });

  it('phases with empty expertise return empty array', async () => {
    // security, cost, ux, brainstorm, complete all have []
    const ctx = await assembleContext('brainstorm', testDir, 'test-feature', 'medium');
    if ('expertise' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.expertise).toHaveLength(0);
    }
  });
});

// --- 4.4: Artifact dependency chain ---
describe('artifact dependency chain', () => {
  it('architect context receives analyst output', async () => {
    // The analyst writes 1-spec.md, architect needs it
    const ctx = await assembleContext('architect', testDir, 'test-feature', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['1-spec.md']).toBeDefined();
      expect(context.artifacts['1-spec.md'].length).toBeGreaterThan(0);
    }
  });

  it('security receives spec and architecture', async () => {
    const ctx = await assembleContext('security', testDir, 'test-feature', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['1-spec.md']).toBeDefined();
      expect(context.artifacts['2-architecture.md']).toBeDefined();
    }
  });

  it('checkpoint-dev receives lock and dev output', async () => {
    // Write dev output
    await writeFile(
      join(testDir, '.specflow', 'features', 'test-feature', '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 and FR-02.\nCovered TC-01 and AC-01.',
    );

    const ctx = await assembleContext('checkpoint-dev', testDir, 'test-feature', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['5-requirements-lock.md']).toBeDefined();
      expect(context.artifacts['6-dev-output.md']).toBeDefined();
    }
  });
});

// --- 4.5: State transition sequence ---
describe('state transitions', () => {
  it('start → update(phase) → complete(phase) accumulates completed_phases', async () => {
    const stateDir = await setupFullE2EProject('state-transitions-test');

    await handleState('start', { feature: 'state-transitions-test', description: 'Test' }, stateDir);
    await handleState('update', { phase: 'triage', agent: 'pm' }, stateDir);
    await handleState('complete', { phase: 'triage' }, stateDir);

    await handleState('update', { phase: 'scope', agent: 'pm' }, stateDir);
    await handleState('complete', { phase: 'scope' }, stateDir);

    await handleState('update', { phase: 'analyst', agent: 'analyst' }, stateDir);
    await handleState('complete', { phase: 'analyst' }, stateDir);

    const state = await handleState('read', undefined, stateDir);
    const completed = state.completed_phases as string[];
    expect(completed).toContain('triage');
    expect(completed).toContain('scope');
    expect(completed).toContain('analyst');
    expect(completed).toHaveLength(3);

    await rm(stateDir, { recursive: true, force: true });
  });
});

// --- 4.6: Phase completion idempotency ---
describe('phase completion idempotency', () => {
  it('double-completing same phase results in single entry', async () => {
    const idempDir = await setupFullE2EProject('idempotent-test');

    await handleState('start', { feature: 'idempotent-test', description: 'Test' }, idempDir);
    await handleState('complete', { phase: 'analyst' }, idempDir);
    await handleState('complete', { phase: 'analyst' }, idempDir);

    const state = await handleState('read', undefined, idempDir);
    const completed = state.completed_phases as string[];
    expect(completed.filter(p => p === 'analyst')).toHaveLength(1);

    await rm(idempDir, { recursive: true, force: true });
  });
});

// --- 4.7: Concurrent state operations ---
describe('concurrent state operations', () => {
  it('3 parallel state updates all reflected without corruption', async () => {
    const concDir = await setupFullE2EProject('concurrent-test');

    await handleState('start', { feature: 'concurrent-test', description: 'Test' }, concDir);

    // 3 parallel completions
    await Promise.all([
      handleState('complete', { phase: 'security' }, concDir),
      handleState('complete', { phase: 'cost' }, concDir),
      handleState('complete', { phase: 'ux' }, concDir),
    ]);

    const state = await handleState('read', undefined, concDir);
    const completed = state.completed_phases as string[];
    expect(completed).toContain('security');
    expect(completed).toContain('cost');
    expect(completed).toContain('ux');

    await rm(concDir, { recursive: true, force: true });
  });
});

// --- 4.8: Review skill detection robustness ---
describe('review skill detection', () => {
  it('loads review skills for review phase', async () => {
    const ctx = await assembleContext('review', testDir, 'test-feature', 'medium');
    if ('skills' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.skills.length).toBeGreaterThan(0);
      expect(context.skills.some(s => s.name === 'test-review-skill')).toBe(true);
    }
  });

  it('does not load skills for phases without capability requirements', async () => {
    const ctx = await assembleContext('analyst', testDir, 'test-feature', 'medium');
    if ('skills' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.skills).toHaveLength(0);
    }
  });
});

// --- 4.9: Context size breakdown metrics per agent phase ---
describe('context size metrics per agent phase', () => {
  const agentPhases = ['analyst', 'architect', 'security', 'dev-story', 'review'];

  it.each(agentPhases)('collects metrics for %s phase', async (phase) => {
    const metrics = new MetricsCollector(phase, 'medium', 'agent-metrics', 'agent-handoff');
    const ctx = await metrics.time('contextAssembly', () =>
      assembleContext(phase, testDir, 'test-feature', 'medium'),
    );

    if ('persona' in ctx) {
      metrics.recordContextSizes(ctx as ContextResponse);
      const m = metrics.getMetrics();
      expect(m.contextSizes.total).toBeGreaterThan(0);
      collectors.push(metrics);
    }
  });
});
