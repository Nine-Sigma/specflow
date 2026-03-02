import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { handleState } from './state.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(testDir, '.specflow', 'features'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function startTestFeature() {
  return handleState('start', { feature: 'test-feat', description: 'Test feature' }, testDir);
}

describe('updateState: last_agent alias', () => {
  it('accepts last_agent as alias for agent', async () => {
    await startTestFeature();
    const result = await handleState('update', { last_agent: 'pm' }, testDir);
    expect(result.last_agent).toBe('pm');
  });

  it('preserves existing agent field behavior', async () => {
    await startTestFeature();
    const result = await handleState('update', { agent: 'analyst' }, testDir);
    expect(result.last_agent).toBe('analyst');
  });

  it('agent takes precedence over last_agent when both provided', async () => {
    await startTestFeature();
    const result = await handleState('update', { agent: 'analyst', last_agent: 'pm' }, testDir);
    expect(result.last_agent).toBe('analyst');
  });

  it('last_agent remains unchanged when neither field provided', async () => {
    await startTestFeature();
    await handleState('update', { agent: 'pm' }, testDir);
    const result = await handleState('update', { phase: 'scope' }, testDir);
    expect(result.last_agent).toBe('pm');
  });
});

describe('resumeState: field consistency', () => {
  it('returns phase field (not just current_phase)', async () => {
    await startTestFeature();
    await handleState('update', { phase: 'dev-story' }, testDir);
    const result = await handleState('resume', undefined, testDir);
    expect(result.phase).toBe('dev-story');
  });

  it('returns last_agent field', async () => {
    await startTestFeature();
    await handleState('update', { agent: 'analyst' }, testDir);
    const result = await handleState('resume', undefined, testDir);
    expect(result.last_agent).toBe('analyst');
  });

  it('includes current_phase as deprecated alias', async () => {
    await startTestFeature();
    await handleState('update', { phase: 'architect' }, testDir);
    const result = await handleState('resume', undefined, testDir);
    expect(result.current_phase).toBe(result.phase);
  });

  it('includes sprint_status when available', async () => {
    await startTestFeature();
    const sprintPath = join(testDir, '.specflow', 'features', 'test-feat', 'sprint-status.yaml');
    await writeFile(sprintPath, 'stories:\n  - id: S-01\n    status: todo\n    wave: 1\nwaves:\n  - number: 1\n');
    const result = await handleState('resume', undefined, testDir);
    expect(result.sprint_status).toBeDefined();
  });
});

describe('updateState: phase transition warnings', () => {
  it('warns when advancing to dev-story without synthesis', async () => {
    await startTestFeature();
    const result = await handleState('update', { phase: 'dev-story' }, testDir);
    expect(result.warnings).toBeDefined();
    const warnings = result.warnings as Array<{ type: string; phase: string }>;
    expect(warnings.some(w => w.type === 'prerequisite_missing' && w.phase === 'synthesis')).toBe(true);
  });

  it('no warnings when all prerequisites met', async () => {
    await startTestFeature();
    // Complete prerequisites
    await handleState('complete', { phase: 'triage' }, testDir);
    await handleState('complete', { phase: 'scope' }, testDir);
    await handleState('complete', { phase: 'analyst' }, testDir);
    await handleState('complete', { phase: 'architect' }, testDir);
    await handleState('complete', { phase: 'synthesis' }, testDir);

    const result = await handleState('update', { phase: 'dev-story' }, testDir);
    expect(result.warnings).toBeUndefined();
  });

  it('no warnings for early phases with no prerequisites', async () => {
    await startTestFeature();
    const result = await handleState('update', { phase: 'triage' }, testDir);
    expect(result.warnings).toBeUndefined();
  });

  it('warns on multiple missing prerequisites', async () => {
    await startTestFeature();
    const result = await handleState('update', { phase: 'review' }, testDir);
    expect(result.warnings).toBeDefined();
    const warnings = result.warnings as Array<{ type: string; phase: string }>;
    expect(warnings.some(w => w.phase === 'qa-verify')).toBe(true);
  });
});

describe('start_or_resume action', () => {
  it('starts a new feature when it does not exist', async () => {
    const result = await handleState('start_or_resume', { feature: 'new-feat', description: 'A new feature' }, testDir);
    expect(result.action_taken).toBe('started');
    expect(result.feature).toBe('new-feat');
    expect(result.phase).toBe('triage');
  });

  it('resumes an existing feature', async () => {
    await startTestFeature();
    await handleState('update', { phase: 'architect', agent: 'architect' }, testDir);

    const result = await handleState('start_or_resume', { feature: 'test-feat', description: 'Test feature' }, testDir);
    expect(result.action_taken).toBe('resumed');
    expect(result.feature).toBe('test-feat');
    expect(result.phase).toBe('architect');
  });

  it('returns error when feature field is missing', async () => {
    const result = await handleState('start_or_resume', {}, testDir);
    expect(result.error).toBeDefined();
  });
});

describe('updateState: strict mode', () => {
  it('blocks phase transition when strict and prerequisites missing', async () => {
    await startTestFeature();
    const result = await handleState('update', { phase: 'dev-story', strict: true }, testDir);
    expect(result.error).toBe('prerequisite_missing');
    expect(result.missing).toBeDefined();
    const missing = result.missing as string[];
    expect(missing).toContain('synthesis');
  });

  it('does not apply phase change when strict blocks', async () => {
    await startTestFeature();
    await handleState('update', { phase: 'dev-story', strict: true }, testDir);
    const state = await handleState('read', undefined, testDir);
    expect(state.phase).toBe('triage'); // unchanged
  });

  it('allows transition when all prerequisites met in strict mode', async () => {
    await startTestFeature();
    await handleState('complete', { phase: 'triage' }, testDir);
    await handleState('complete', { phase: 'scope' }, testDir);
    await handleState('complete', { phase: 'analyst' }, testDir);
    await handleState('complete', { phase: 'architect' }, testDir);
    await handleState('complete', { phase: 'synthesis' }, testDir);

    const result = await handleState('update', { phase: 'dev-story', strict: true }, testDir);
    expect(result.error).toBeUndefined();
    expect(result.phase).toBe('dev-story');
  });

  it('default behavior (no strict) remains advisory', async () => {
    await startTestFeature();
    const result = await handleState('update', { phase: 'dev-story' }, testDir);
    expect(result.phase).toBe('dev-story'); // transition applied
    expect(result.warnings).toBeDefined(); // but warnings present
  });
});
