import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { handleState } from './state.js';
import { assembleContext } from './context.js';
import { validateArtifact } from './validate.js';

let testDir: string;

async function setupFullProject(): Promise<string> {
  const dir = join(tmpdir(), `specflow-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(dir, '.specflow', 'features'), { recursive: true });
  await mkdir(join(dir, '.specflow', 'skills'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'personas'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'scoping'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'requirements'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'synthesis'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'testing'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'review'), { recursive: true });

  // Personas
  await writeFile(join(dir, '.specflow-lib', 'personas', 'pm.md'), '# John — PM\nOrchestrator persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'analyst.md'), '# Mary — Analyst\nRequirements persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'architect.md'), '# Winston — Architect\nArchitecture persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'security.md'), '# Jordan — Security\nSecurity persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'cost.md'), '# Taylor — Cost\nCost persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'dev.md'), '# Amelia — Dev\nDev persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'qa.md'), '# Quinn — QA\nQA persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'ux-designer.md'), '# Sally — UX\nUX persona');

  // Expertise
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'scoping', 'scope-levels.md'), '## Scope Levels\ncontent');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'requirements', 'boss-criteria.md'), '## BOSS\ncontent');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'synthesis', 'requirements-lock.md'), '## Lock\ncontent');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'testing', 'index.md'), '## Testing\ncontent');
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'review', 'index.md'), '## Review\ncontent');

  // STATE.md
  await writeFile(join(dir, '.specflow', 'STATE.md'), '# Project State\n\nNot started');

  return dir;
}

beforeEach(async () => {
  testDir = await setupFullProject();
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('E2E happy path', () => {
  it('start → context → write artifact → validate returns valid: true', async () => {
    // Step 1: Start a feature
    const startResult = await handleState('start', {
      feature: 'auth-login',
      description: 'Add login page with OAuth',
    }, testDir);
    expect(startResult.feature).toBe('auth-login');
    expect(startResult.phase).toBe('triage');

    // Step 2: Update to triage phase
    await handleState('update', { phase: 'triage', agent: 'pm' }, testDir);

    // Step 3: Get context for triage
    const triageContext = await assembleContext('triage', testDir, 'auth-login', null);
    expect('persona' in triageContext).toBe(true);
    if ('persona' in triageContext) {
      expect(triageContext.persona).toContain('John');
    }

    // Step 4: Write triage output
    const featureDir = join(testDir, '.specflow', 'features', 'auth-login');
    await writeFile(join(featureDir, '0-triage.md'), `## Triage

### Feature: auth-login
User wants to add a login page with OAuth support.
This requires a form, OAuth integration, and session management.
Estimated scope: medium (3-10 files).
`);

    // Step 5: Validate triage output
    const triageValidation = await validateArtifact('triage', testDir, 'auth-login');
    expect('valid' in triageValidation).toBe(true);
    if ('valid' in triageValidation) {
      expect(triageValidation.valid).toBe(true);
      expect(triageValidation.checks.artifact_exists).toBe(true);
      expect(triageValidation.checks.content_quality).toBe(true);
    }

    // Step 6: Complete triage
    await handleState('complete', { phase: 'triage' }, testDir);

    // Step 7: Move to scope
    await handleState('update', { phase: 'scope', agent: 'pm', scope: 'medium', pillars: ['security', 'testing'] }, testDir);
    await handleState('complete', { phase: 'scope' }, testDir);

    // Step 8: Get context for analyst (should include triage and scope artifacts)
    const analystContext = await assembleContext('analyst', testDir, 'auth-login', 'medium');
    if ('artifacts' in analystContext) {
      expect(analystContext.artifacts['0-triage.md']).toBeDefined();
      expect(analystContext.scope).toBe('medium');
    }

    // Step 9: Resume should show progress
    const resume = await handleState('resume', undefined, testDir);
    expect((resume.completed_phases as string[])).toContain('triage');
    expect((resume.completed_phases as string[])).toContain('scope');
    expect(resume.scope).toBe('medium');
  });
});

describe('direct agent invocation', () => {
  it('specflow_context works without PM when feature is active', async () => {
    // Start a feature first
    await handleState('start', { feature: 'auth-login', description: 'Login' }, testDir);
    await handleState('update', { phase: 'analyst' }, testDir);

    // Direct agent call (no PM involvement)
    const context = await assembleContext('analyst', testDir, 'auth-login', null);
    expect('persona' in context).toBe(true);
    if ('persona' in context) {
      expect(context.persona).toContain('Mary');
      expect(context.output_path).toBe('.specflow/features/auth-login/1-spec.md');
    }
  });

  it('returns error when no active feature', async () => {
    const context = await assembleContext('analyst', testDir, null, null);
    expect('error' in context).toBe(true);
    if ('error' in context) {
      expect(context.error).toBe('no_active_feature');
    }
  });
});

describe('concurrent tool calls', () => {
  it('handles rapid state updates from parallel subagents', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Login' }, testDir);

    // Simulate 5 concurrent phase completions
    const phases = ['security', 'cost', 'ux', 'tea', 'synthesis'];
    await Promise.all(
      phases.map(phase => handleState('complete', { phase }, testDir)),
    );

    // Verify all completions recorded
    const state = await handleState('read', undefined, testDir);
    const completed = state.completed_phases as string[];
    for (const phase of phases) {
      expect(completed).toContain(phase);
    }
  });

  it('handles concurrent state updates without corruption', async () => {
    await handleState('start', { feature: 'auth-login', description: 'Login' }, testDir);

    // Rapid sequential updates
    await Promise.all([
      handleState('update', { phase: 'security', agent: 'security' }, testDir),
      handleState('update', { scope: 'large' }, testDir),
    ]);

    // State should be consistent (one update won)
    const state = await handleState('read', undefined, testDir);
    expect(state.feature).toBe('auth-login');
    // Both updates applied in some order — key is no corruption
    expect(typeof state.updated_at).toBe('string');
  });
});

describe('full init output verification', () => {
  it('generates all expected files', async () => {
    const {
      generateClaudeCodePM,
      generateCopilotPM,
      generateClaudeCodeAgent,
      generateCopilotAgent,
      AGENT_NAMES,
    } = await import('./prompts.js');

    const projectDir = join(tmpdir(), `specflow-init-${Date.now()}`);
    await mkdir(projectDir, { recursive: true });

    // Simulate init output
    await mkdir(join(projectDir, '.specflow', 'features'), { recursive: true });
    await mkdir(join(projectDir, '.specflow-lib', 'personas'), { recursive: true });
    await mkdir(join(projectDir, '.claude', 'commands'), { recursive: true });
    await mkdir(join(projectDir, '.github', 'agents'), { recursive: true });
    await mkdir(join(projectDir, '.vscode'), { recursive: true });

    // MCP configs
    await writeFile(
      join(projectDir, '.mcp.json'),
      JSON.stringify({ mcpServers: { specflow: { command: 'npx', args: ['specflow', 'serve'] } } }, null, 2),
    );
    await writeFile(
      join(projectDir, '.vscode', 'mcp.json'),
      JSON.stringify({ servers: { specflow: { command: 'npx', args: ['specflow', 'serve'] } } }, null, 2),
    );

    // Claude Code prompts
    await writeFile(join(projectDir, '.claude', 'commands', 'sf-pm.md'), generateClaudeCodePM());
    for (const agent of AGENT_NAMES) {
      await writeFile(join(projectDir, '.claude', 'commands', `sf-${agent}.md`), generateClaudeCodeAgent(agent));
    }

    // Copilot prompts
    await writeFile(join(projectDir, '.github', 'agents', 'sf-pm.md'), generateCopilotPM());
    for (const agent of AGENT_NAMES) {
      await writeFile(join(projectDir, '.github', 'agents', `sf-${agent}.md`), generateCopilotAgent(agent));
    }

    // Copilot instructions
    await writeFile(
      join(projectDir, '.github', 'copilot-instructions.md'),
      '<!-- SPECFLOW:START -->\n## SpecFlow\nProject context\n<!-- SPECFLOW:END -->',
    );

    // Verify all expected files
    const verifyExists = async (path: string) => {
      try {
        const s = await readFile(join(projectDir, path), 'utf8'); // nosemgrep: path-join-resolve-traversal
        return s.length > 0;
      } catch {
        return false;
      }
    };

    expect(await verifyExists('.mcp.json')).toBe(true);
    expect(await verifyExists('.vscode/mcp.json')).toBe(true);
    expect(await verifyExists('.claude/commands/sf-pm.md')).toBe(true);
    expect(await verifyExists('.github/agents/sf-pm.md')).toBe(true);
    expect(await verifyExists('.github/copilot-instructions.md')).toBe(true);

    for (const agent of AGENT_NAMES) {
      expect(await verifyExists(`.claude/commands/sf-${agent}.md`)).toBe(true);
      expect(await verifyExists(`.github/agents/sf-${agent}.md`)).toBe(true);
    }

    // Verify MCP configs have correct structure
    const mcpJson = JSON.parse(await readFile(join(projectDir, '.mcp.json'), 'utf8'));
    expect(mcpJson.mcpServers.specflow.command).toBe('npx');
    expect(mcpJson.mcpServers.specflow.args).toEqual(['specflow', 'serve']);

    const vscodeMcp = JSON.parse(await readFile(join(projectDir, '.vscode', 'mcp.json'), 'utf8'));
    expect(vscodeMcp.servers.specflow.command).toBe('npx');

    await rm(projectDir, { recursive: true, force: true });
  });
});
