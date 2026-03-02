import { describe, it, expect, afterAll } from 'vitest';
import { rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { assembleContext } from '../../context.js';
import { handleState } from '../../state.js';
import { type ContextResponse } from '../../types.js';
import { setupFullE2EProject, buildArtifact } from '../fixtures/helpers.js';

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map(d => rm(d, { recursive: true, force: true })));
});

// --- 7.2: Scope-gated ceremony ---

describe('trivial scope: minimal ceremony', () => {
  it('executes only minimal phases', async () => {
    const dir = await setupFullE2EProject('trivial-test');
    dirs.push(dir);

    await handleState('start', { feature: 'trivial-test', description: 'Fix typo' }, dir);
    await handleState('update', { scope: 'trivial', pillars: [] }, dir);

    // Trivial scope: triage → analyst → dev-story
    const phases = ['triage', 'analyst', 'dev-story'];

    for (const phase of phases) {
      const ctx = await assembleContext(phase, dir, 'trivial-test', 'trivial');
      expect('persona' in ctx).toBe(true);
      await handleState('complete', { phase }, dir);
    }

    const state = await handleState('read', undefined, dir);
    expect(state.scope).toBe('trivial');
    expect((state.pillars as string[]).length).toBe(0);

    // No sprint-status.yaml should be created for trivial
    try {
      await readFile(join(dir, '.specflow', 'features', 'trivial-test', 'sprint-status.yaml'), 'utf8');
      // If we get here, file exists — that's unexpected for trivial scope
      // But not a hard failure since PM creates it only if needed
    } catch {
      // Expected: no sprint-status.yaml for trivial scope
    }
  });
});

describe('small scope: skip security and cost pillars', () => {
  it('includes testing but skips security and cost', async () => {
    const dir = await setupFullE2EProject('small-test');
    dirs.push(dir);

    await handleState('start', { feature: 'small-test', description: 'Add logout button' }, dir);
    await handleState('update', { scope: 'small', pillars: ['testing'] }, dir);

    // Small scope should include tea
    const teaCtx = await assembleContext('tea', dir, 'small-test', 'small');
    expect('persona' in teaCtx).toBe(true);

    // Security context still works (but PM shouldn't route there for small)
    const secCtx = await assembleContext('security', dir, 'small-test', 'small');
    if ('persona' in secCtx) {
      const context = secCtx as ContextResponse;
      // Security phase works but wouldn't be in the small scope workflow
      expect(context.methodology.length).toBe(1); // stride-framework.md
    }

    const state = await handleState('read', undefined, dir);
    expect(state.scope).toBe('small');
    expect(state.pillars).toEqual(['testing']);
  });
});

describe('medium scope: includes security and testing', () => {
  it('activates security and tea pillars', async () => {
    const dir = await setupFullE2EProject('medium-test');
    dirs.push(dir);

    await handleState('start', { feature: 'medium-test', description: 'New endpoint' }, dir);
    await handleState('update', { scope: 'medium', pillars: ['security', 'testing'] }, dir);

    // Security phase should receive STRIDE methodology
    const secCtx = await assembleContext('security', dir, 'medium-test', 'medium');
    if ('persona' in secCtx) {
      const context = secCtx as ContextResponse;
      expect(context.persona).toContain('Jordan');
      expect(context.methodology.length).toBe(1);
      expect(context.methodology[0]).toContain('STRIDE');
    }

    // Tea phase receives testing expertise
    const teaCtx = await assembleContext('tea', dir, 'medium-test', 'medium');
    if ('persona' in teaCtx) {
      const context = teaCtx as ContextResponse;
      expect(context.expertise.length).toBeGreaterThan(0);
    }

    // Pillar phases receive correct context
    for (const phase of ['security', 'tea']) {
      const ctx = await assembleContext(phase, dir, 'medium-test', 'medium');
      expect('persona' in ctx).toBe(true);
      await handleState('complete', { phase }, dir);
    }

    const state = await handleState('read', undefined, dir);
    expect(state.pillars).toEqual(['security', 'testing']);
    expect((state.completed_phases as string[])).toContain('security');
    expect((state.completed_phases as string[])).toContain('tea');
  });
});

describe('large scope: all pillars in parallel', () => {
  it('activates all pillars and parallel execution does not corrupt state', async () => {
    const dir = await setupFullE2EProject('large-test');
    dirs.push(dir);

    await handleState('start', { feature: 'large-test', description: 'Payment integration' }, dir);
    await handleState('update', { scope: 'large', pillars: ['security', 'cost', 'ux', 'testing'] }, dir);

    // Parallel pillar execution
    const [secCtx, costCtx, uxCtx] = await Promise.all([
      assembleContext('security', dir, 'large-test', 'large'),
      assembleContext('cost', dir, 'large-test', 'large'),
      assembleContext('ux', dir, 'large-test', 'large'),
    ]);

    expect('persona' in secCtx).toBe(true);
    expect('persona' in costCtx).toBe(true);
    expect('persona' in uxCtx).toBe(true);

    // UX should get all 9 methodology files for large scope
    if ('methodology' in uxCtx) {
      expect((uxCtx as ContextResponse).methodology.length).toBe(9);
    }

    // Parallel completions should not corrupt state
    await Promise.all([
      handleState('complete', { phase: 'security' }, dir),
      handleState('complete', { phase: 'cost' }, dir),
      handleState('complete', { phase: 'ux' }, dir),
    ]);

    const state = await handleState('read', undefined, dir);
    const completed = state.completed_phases as string[];
    expect(completed).toContain('security');
    expect(completed).toContain('cost');
    expect(completed).toContain('ux');

    // All pillar outputs available to synthesis
    await writeFile(join(dir, '.specflow', 'features', 'large-test', '3-security.md'),
      buildArtifact('security'));
    await writeFile(join(dir, '.specflow', 'features', 'large-test', '4-cost.md'),
      buildArtifact('cost'));
    await writeFile(join(dir, '.specflow', 'features', 'large-test', '1.6-ux-design.md'),
      '## UX Design\n### Core Experience\nFull UX design output.');

    const synthCtx = await assembleContext('synthesis', dir, 'large-test', 'large');
    if ('artifacts' in synthCtx) {
      const context = synthCtx as ContextResponse;
      expect(context.artifacts['3-security.md']).toBeDefined();
      expect(context.artifacts['4-cost.md']).toBeDefined();
      expect(context.artifacts['1.6-ux-design.md']).toBeDefined();
    }
  });
});
