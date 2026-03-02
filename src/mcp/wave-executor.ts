/**
 * Wave Executor — deterministic parallel execution of dev/QA/pillar waves.
 *
 * Spawns CLI processes (claude/copilot) in git worktrees for isolation,
 * merges results back, and updates sprint-status.
 */

import { execSync, spawn as nodeSpawn } from 'child_process';
import { join } from 'path';
import { mkdir, rm, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { z } from 'zod';
import { assembleContext } from './context.js';
import { handleState } from './state.js';

// ================================================================
// Types & Interfaces
// ================================================================

export type WaveType = 'dev' | 'qa' | 'pillars' | 'cleanup';

export interface WaveParams {
  type: WaveType;
  cli?: string;
  timeout_ms?: number;
  max_concurrent?: number;
}

export interface WaveStoryResult {
  id: string;
  status: 'done' | 'failed' | 'timeout';
  duration_ms: number;
  files_changed: string[];
  merge_status: 'merged' | 'conflict' | 'skipped';
  error?: string;
}

export interface WaveResult {
  wave: number | null;
  status: 'complete' | 'partial' | 'failed';
  stories: WaveStoryResult[];
  conflicts?: string[];
  total_duration_ms: number;
  cli_used: string;
  count?: number;
}

export interface WaveErrorResult {
  error: string;
  suggestion?: string;
}

// ================================================================
// Zod Schema
// ================================================================

export const WaveParamsSchema = z.object({
  type: z.enum(['dev', 'qa', 'pillars', 'cleanup']),
  cli: z.string().optional(),
  timeout_ms: z.number().optional().default(600000),
  max_concurrent: z.number().optional().default(5),
});

// ================================================================
// CLI Detection
// ================================================================

let cachedCli: string | null | undefined;

export function detectCli(): string | null {
  if (cachedCli !== undefined) return cachedCli;

  for (const cli of ['claude', 'copilot']) {
    try {
      execSync(`which ${cli}`, { stdio: 'pipe' }); // nosemgrep: detect-child-process
      cachedCli = cli;
      return cli;
    } catch {
      // Not found, try next
    }
  }

  cachedCli = null;
  return null;
}

/** Reset cached CLI detection (for testing) */
export function resetCliCache(): void {
  cachedCli = undefined;
}

export function buildCliArgs(cli: string, prompt: string): string[] {
  if (cli === 'claude') {
    return [
      '-p', prompt,
      '--allowedTools', 'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
      '--no-session-persistence',
      '--output-format', 'json',
      '--max-turns', '20',
    ];
  }

  if (cli === 'copilot') {
    return [
      '-p', prompt,
      '--autopilot',
      '--yolo',
      '--max-autopilot-continues', '10',
    ];
  }

  return ['-p', prompt];
}

function validateCliOnPath(cli: string): boolean {
  try {
    execSync(`which ${cli}`, { stdio: 'pipe' }); // nosemgrep: detect-child-process
    return true;
  } catch {
    return false;
  }
}

// ================================================================
// Git Detection
// ================================================================

let cachedGit: boolean | undefined;

export function detectGit(projectRoot: string): boolean {
  if (cachedGit !== undefined) return cachedGit;

  try {
    execSync('git rev-parse --git-dir', { cwd: projectRoot, stdio: 'pipe' });
    cachedGit = true;
    return true;
  } catch {
    cachedGit = false;
    return false;
  }
}

/** Reset cached git detection (for testing) */
export function resetGitCache(): void {
  cachedGit = undefined;
}

// ================================================================
// Git Worktree Lifecycle
// ================================================================

export async function createWorktrees(
  waveNumber: number,
  storyIds: string[],
  projectRoot: string,
): Promise<Map<string, string>> {
  const cwdMap = new Map<string, string>();
  const waveDir = join(projectRoot, '.specflow', 'worktrees', `wave-${waveNumber}`); // nosemgrep: path-join-resolve-traversal

  await mkdir(waveDir, { recursive: true });

  for (const id of storyIds) {
    const worktreePath = join(waveDir, `story-${id}`); // nosemgrep: path-join-resolve-traversal
    const branchName = `wave-${waveNumber}/story-${id}`;

    try {
      execSync(
        `git worktree add "${worktreePath}" -b "${branchName}"`, // nosemgrep: detect-child-process
        { cwd: projectRoot, stdio: 'pipe' },
      );
      cwdMap.set(id, worktreePath);
    } catch (err) {
      // Partial failure — clean up already-created worktrees
      for (const [createdId, createdPath] of cwdMap) {
        try {
          execSync(`git worktree remove "${createdPath}" --force`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
          execSync(`git branch -D "wave-${waveNumber}/story-${createdId}"`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
        } catch {
          // Best-effort cleanup
        }
      }
      throw new Error(`Failed to create worktree for story ${id}: ${(err as Error).message}`);
    }
  }

  return cwdMap;
}

export interface MergeResult {
  merged: string[];
  conflicts: Map<string, string[]>;
  skipped: string[];
}

export async function mergeWorktrees(
  waveNumber: number,
  completedStoryIds: string[],
  allStoryIds: string[],
  projectRoot: string,
): Promise<MergeResult> {
  const result: MergeResult = {
    merged: [],
    conflicts: new Map(),
    skipped: [],
  };

  const completedSet = new Set(completedStoryIds);

  for (const id of allStoryIds) {
    if (!completedSet.has(id)) {
      result.skipped.push(id);
      continue;
    }

    const branchName = `wave-${waveNumber}/story-${id}`;

    try {
      execSync(`git merge "${branchName}" --no-edit`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
      result.merged.push(id);
    } catch {
      // Merge conflict — abort and record
      try {
        execSync('git merge --abort', { cwd: projectRoot, stdio: 'pipe' });
      } catch {
        // May not need abort if merge didn't start
      }

      // Get conflicting files
      let conflictFiles: string[] = [];
      try {
        const output = execSync('git diff --name-only --diff-filter=U', { cwd: projectRoot, stdio: 'pipe' });
        conflictFiles = output.toString().trim().split('\n').filter(Boolean);
      } catch {
        conflictFiles = ['unknown'];
      }

      result.conflicts.set(id, conflictFiles);
    }
  }

  return result;
}

export async function cleanupWorktrees(
  waveNumber: number,
  storyIds: string[],
  preserveIds: string[],
  projectRoot: string,
): Promise<void> {
  const preserveSet = new Set(preserveIds);

  for (const id of storyIds) {
    if (preserveSet.has(id)) continue;

    const worktreePath = join(projectRoot, '.specflow', 'worktrees', `wave-${waveNumber}`, `story-${id}`); // nosemgrep: path-join-resolve-traversal
    const branchName = `wave-${waveNumber}/story-${id}`;

    try {
      execSync(`git worktree remove "${worktreePath}" --force`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
    } catch {
      // Best-effort removal
    }

    try {
      execSync(`git branch -D "${branchName}"`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
    } catch {
      // Branch may already be deleted
    }
  }

  // Remove wave directory if empty
  const waveDir = join(projectRoot, '.specflow', 'worktrees', `wave-${waveNumber}`); // nosemgrep: path-join-resolve-traversal
  try {
    const entries = await readdir(waveDir);
    if (entries.length === 0) {
      await rm(waveDir, { recursive: true, force: true });
    }
  } catch {
    // Directory may not exist
  }
}

export async function cleanupOrphaned(projectRoot: string): Promise<{ count: number }> {
  const worktreesDir = join(projectRoot, '.specflow', 'worktrees'); // nosemgrep: path-join-resolve-traversal

  if (!existsSync(worktreesDir)) {
    return { count: 0 };
  }

  let count = 0;

  // Prune git worktree references
  try {
    execSync('git worktree prune', { cwd: projectRoot, stdio: 'pipe' });
  } catch {
    // Best effort
  }

  // Scan for orphaned wave directories
  try {
    const waveEntries = await readdir(worktreesDir);
    for (const waveEntry of waveEntries) {
      if (!waveEntry.startsWith('wave-')) continue;

      const waveDir = join(worktreesDir, waveEntry); // nosemgrep: path-join-resolve-traversal
      try {
        const storyEntries = await readdir(waveDir);
        count += storyEntries.length;
      } catch {
        // Skip
      }

      await rm(waveDir, { recursive: true, force: true });
    }
  } catch {
    // Directory listing failed
  }

  // Delete orphaned wave branches
  try {
    const branchOutput = execSync('git branch', { cwd: projectRoot, stdio: 'pipe' });
    const branches = branchOutput.toString().split('\n').map(b => b.trim().replace('* ', ''));
    for (const branch of branches) {
      if (branch.match(/^wave-\d+\/story-/)) {
        try {
          execSync(`git branch -D "${branch}"`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
        } catch {
          // Best effort
        }
      }
    }
  } catch {
    // Best effort
  }

  return { count };
}

// ================================================================
// Process Spawning
// ================================================================

interface AgentResult {
  status: 'done' | 'failed' | 'timeout';
  stdout: string;
  stderr: string;
  duration_ms: number;
}

export function spawnAgent(
  cli: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<AgentResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // nosemgrep: detect-child-process
    const proc = nodeSpawn(cli, args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      // Give it a moment, then SIGKILL
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch { /* already dead */ }
      }, 5000);
    }, timeoutMs);

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      const duration_ms = Date.now() - startTime;

      if (timedOut) {
        resolve({ status: 'timeout', stdout, stderr, duration_ms });
      } else if (code === 0) {
        resolve({ status: 'done', stdout, stderr, duration_ms });
      } else {
        resolve({ status: 'failed', stdout, stderr, duration_ms });
      }
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        status: 'failed',
        stdout,
        stderr: err.message,
        duration_ms: Date.now() - startTime,
      });
    });
  });
}

export async function spawnWave(
  storyIds: string[],
  cli: string,
  prompts: Map<string, string>,
  cwdMap: Map<string, string>,
  timeoutMs: number,
  maxConcurrent: number,
): Promise<Map<string, AgentResult>> {
  const results = new Map<string, AgentResult>();
  const queue = [...storyIds];
  const active = new Set<Promise<void>>();

  while (queue.length > 0 || active.size > 0) {
    // Fill up to maxConcurrent
    while (queue.length > 0 && active.size < maxConcurrent) {
      const id = queue.shift()!;
      const prompt = prompts.get(id) || '';
      const cwd = cwdMap.get(id) || process.cwd();
      const args = buildCliArgs(cli, prompt);

      const task = spawnAgent(cli, args, cwd, timeoutMs).then((result) => {
        results.set(id, result);
      });

      const tracked = task.then(
        () => { active.delete(tracked); },
        () => { active.delete(tracked); },
      );
      active.add(tracked);
    }

    // Wait for at least one to complete
    if (active.size > 0) {
      await Promise.race([...active]);
    }
  }

  return results;
}

// ================================================================
// Context Pre-Assembly
// ================================================================

export async function buildDevStoryPrompt(
  story: { id: string; description?: string; acceptance_criteria?: string[] },
  projectRoot: string,
  feature: string,
  scope: string | null,
): Promise<string> {
  const ctx = await assembleContext('dev-story', projectRoot, feature, scope);

  if ('error' in ctx) {
    throw new Error(`Failed to assemble context for dev-story: ${ctx.error}`);
  }

  const parts: string[] = [];

  if (ctx.persona) parts.push(ctx.persona);
  if (ctx.expertise.length > 0) parts.push(ctx.expertise.join('\n\n'));
  if (ctx.methodology.length > 0) parts.push(ctx.methodology.join('\n\n'));

  // Artifacts
  for (const [name, content] of Object.entries(ctx.artifacts)) {
    parts.push(`## Artifact: ${name}\n\n${content}`);
  }

  // Story-specific instructions
  parts.push(`## Story: ${story.id}`);
  if (story.description) parts.push(story.description);
  if (story.acceptance_criteria && story.acceptance_criteria.length > 0) {
    parts.push('### Acceptance Criteria\n' + story.acceptance_criteria.map(ac => `- ${ac}`).join('\n'));
  }

  // Output path
  parts.push(`## Output\n\nWrite your implementation output to: ${ctx.output_path}`);

  // Headless agent directive
  parts.push(
    '## Important: Headless Agent Mode\n\n' +
    'You are running as a headless agent spawned by the wave executor. ' +
    'Do NOT call any specflow_* MCP tools (specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact). ' +
    'The executor handles state updates after your work is merged, and the PM validates outputs post-merge. ' +
    'Focus exclusively on implementing the story using built-in file/shell tools.',
  );

  return parts.join('\n\n');
}

export async function buildQaPrompt(
  ticket: { id: string; description?: string; story_ref?: string },
  projectRoot: string,
  feature: string,
  scope: string | null,
): Promise<string> {
  const ctx = await assembleContext('qa-verify', projectRoot, feature, scope);

  if ('error' in ctx) {
    throw new Error(`Failed to assemble context for qa-verify: ${ctx.error}`);
  }

  const parts: string[] = [];

  if (ctx.persona) parts.push(ctx.persona);
  if (ctx.expertise.length > 0) parts.push(ctx.expertise.join('\n\n'));
  if (ctx.methodology.length > 0) parts.push(ctx.methodology.join('\n\n'));

  for (const [name, content] of Object.entries(ctx.artifacts)) {
    parts.push(`## Artifact: ${name}\n\n${content}`);
  }

  parts.push(`## QA Ticket: ${ticket.id}`);
  if (ticket.description) parts.push(ticket.description);
  if (ticket.story_ref) parts.push(`Story reference: ${ticket.story_ref}`);

  parts.push(`## Output\n\nWrite your QA output to: ${ctx.output_path}`);

  parts.push(
    '## Important: Headless Agent Mode\n\n' +
    'You are running as a headless agent spawned by the wave executor. ' +
    'Do NOT call any specflow_* MCP tools (specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact). ' +
    'The executor handles state updates after your work is merged, and the PM validates outputs post-merge. ' +
    'Focus exclusively on QA verification using built-in file/shell tools.',
  );

  return parts.join('\n\n');
}

export async function buildPillarPrompt(
  pillar: 'security' | 'cost' | 'ux',
  projectRoot: string,
  feature: string,
  scope: string | null,
): Promise<string> {
  const ctx = await assembleContext(pillar, projectRoot, feature, scope);

  if ('error' in ctx) {
    throw new Error(`Failed to assemble context for ${pillar}: ${ctx.error}`);
  }

  const parts: string[] = [];

  if (ctx.persona) parts.push(ctx.persona);
  if (ctx.expertise.length > 0) parts.push(ctx.expertise.join('\n\n'));
  if (ctx.methodology.length > 0) parts.push(ctx.methodology.join('\n\n'));

  for (const [name, content] of Object.entries(ctx.artifacts)) {
    parts.push(`## Artifact: ${name}\n\n${content}`);
  }

  parts.push(`## Output\n\nWrite your ${pillar} analysis to: ${ctx.output_path}`);

  parts.push(
    '## Important: Headless Agent Mode\n\n' +
    'You are running as a headless agent spawned by the wave executor. ' +
    'Do NOT call any specflow_* MCP tools (specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact). ' +
    'The executor handles state updates after your work is merged, and the PM validates outputs post-merge. ' +
    `Focus exclusively on ${pillar} analysis using built-in file/shell tools.`,
  );

  return parts.join('\n\n');
}

// ================================================================
// Main Executor
// ================================================================

export async function executeWave(
  params: WaveParams,
  projectRoot: string,
  feature: string | null,
  scope: string | null,
): Promise<WaveResult | WaveErrorResult> {
  const startTime = Date.now();

  // Resolve CLI
  let cli: string;
  if (params.cli) {
    if (!validateCliOnPath(params.cli)) {
      return {
        error: `Specified CLI "${params.cli}" not found on PATH`,
        suggestion: 'Ensure the CLI is installed, or omit the cli parameter for auto-detection',
      };
    }
    cli = params.cli;
  } else {
    const detected = detectCli();
    if (!detected) {
      return {
        error: 'No supported CLI found on PATH',
        suggestion: 'Install claude or copilot CLI, or use probabilistic Task() fallback',
      };
    }
    cli = detected;
  }

  // Handle cleanup type
  if (params.type === 'cleanup') {
    if (!detectGit(projectRoot)) {
      const cleanup = await cleanupOrphaned(projectRoot);
      return { wave: null, status: 'complete', stories: [], total_duration_ms: 0, cli_used: cli, ...cleanup };
    }
    const cleanup = await cleanupOrphaned(projectRoot);
    return {
      wave: null,
      status: 'complete',
      stories: [],
      total_duration_ms: Date.now() - startTime,
      cli_used: cli,
      ...cleanup,
    };
  }

  // Handle pillars type
  if (params.type === 'pillars') {
    return executePillarWave(params, cli, projectRoot, feature, scope, startTime);
  }

  // Dev/QA waves require git
  if (!detectGit(projectRoot)) {
    return {
      error: 'Git required for deterministic parallel execution of dev/qa waves',
      suggestion: 'Use probabilistic Task() fallback',
    };
  }

  if (!feature) {
    return { error: 'No active feature' };
  }

  // Get next wave stories
  const nextWave = await handleState('next-wave', undefined, projectRoot);

  if (!nextWave.stories || (nextWave.stories as unknown[]).length === 0) {
    return {
      wave: null,
      status: 'complete',
      stories: [],
      total_duration_ms: Date.now() - startTime,
      cli_used: cli,
    };
  }

  const waveNumber = nextWave.wave as number;
  const stories = nextWave.stories as Array<{ id: string; description?: string; acceptance_criteria?: string[] }>;
  const storyIds = stories.map(s => s.id);

  // Build prompts for each story
  const prompts = new Map<string, string>();

  for (const story of stories) {
    try {
      const prompt = params.type === 'qa'
        ? await buildQaPrompt(story, projectRoot, feature, scope)
        : await buildDevStoryPrompt(story, projectRoot, feature, scope);
      prompts.set(story.id, prompt);
    } catch (err) {
      return { error: `Failed to build prompt for story ${story.id}: ${(err as Error).message}` };
    }
  }

  // Worktree lifecycle
  let cwdMap: Map<string, string>;
  try {
    cwdMap = await createWorktrees(waveNumber, storyIds, projectRoot);
  } catch (err) {
    return { error: `Failed to create worktrees: ${(err as Error).message}` };
  }

  try {
    // Spawn agents
    const agentResults = await spawnWave(
      storyIds,
      cli,
      prompts,
      cwdMap,
      params.timeout_ms || 600000,
      params.max_concurrent || 5,
    );

    // Determine successful stories
    const successfulIds = storyIds.filter(id => agentResults.get(id)?.status === 'done');

    // Collect per-story files changed BEFORE merging (all branches share same base HEAD)
    const filesChanged = new Map<string, string[]>();
    for (const id of successfulIds) {
      const branchName = `wave-${waveNumber}/story-${id}`;
      try {
        const diff = execSync(`git diff --name-only "HEAD...${branchName}"`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
        filesChanged.set(id, diff.toString().trim().split('\n').filter(Boolean));
      } catch {
        filesChanged.set(id, []);
      }
    }

    // Merge successful branches
    const mergeResult = await mergeWorktrees(waveNumber, successfulIds, storyIds, projectRoot);

    // Build story results
    const storyResults: WaveStoryResult[] = storyIds.map(id => {
      const agentResult = agentResults.get(id);
      const isMerged = mergeResult.merged.includes(id);
      const isConflict = mergeResult.conflicts.has(id);

      let mergeStatus: 'merged' | 'conflict' | 'skipped' = 'skipped';
      if (isMerged) mergeStatus = 'merged';
      else if (isConflict) mergeStatus = 'conflict';

      return {
        id,
        status: agentResult?.status || 'failed',
        duration_ms: agentResult?.duration_ms || 0,
        files_changed: filesChanged.get(id) || [],
        merge_status: mergeStatus,
        error: agentResult?.status !== 'done' ? agentResult?.stderr : undefined,
      };
    });

    // Determine overall status
    const allDone = storyResults.every(s => s.status === 'done' && s.merge_status === 'merged');
    const anyDone = storyResults.some(s => s.status === 'done' && s.merge_status === 'merged');
    const status = allDone ? 'complete' : anyDone ? 'partial' : 'failed';

    // Collect all conflict files
    const allConflicts: string[] = [];
    for (const files of mergeResult.conflicts.values()) {
      allConflicts.push(...files);
    }

    // Update state for merged stories
    for (const id of mergeResult.merged) {
      try {
        await handleState('stories', { update: { id, status: 'done' } }, projectRoot);
      } catch {
        // Best effort state update
      }
    }

    const waveResult: WaveResult = {
      wave: waveNumber,
      status,
      stories: storyResults,
      total_duration_ms: Date.now() - startTime,
      cli_used: cli,
    };

    if (allConflicts.length > 0) {
      waveResult.conflicts = allConflicts;
    }

    return waveResult;
  } finally {
    // Always clean up worktrees
    const preserveIds = [...(await getConflictIds(projectRoot, waveNumber, storyIds))];
    await cleanupWorktrees(waveNumber, storyIds, preserveIds, projectRoot);
  }
}

async function getConflictIds(
  projectRoot: string,
  waveNumber: number,
  storyIds: string[],
): Promise<string[]> {
  // Check which worktree directories still have unmerged changes
  const preserveIds: string[] = [];
  const head = execSync('git rev-parse HEAD', { cwd: projectRoot, stdio: 'pipe' }).toString().trim();

  for (const id of storyIds) {
    const worktreePath = join(projectRoot, '.specflow', 'worktrees', `wave-${waveNumber}`, `story-${id}`); // nosemgrep: path-join-resolve-traversal
    if (existsSync(worktreePath)) {
      const branchName = `wave-${waveNumber}/story-${id}`;
      try {
        // Check if branch tip is an ancestor of HEAD (i.e., was merged)
        execSync(`git merge-base --is-ancestor "${branchName}" "${head}"`, { cwd: projectRoot, stdio: 'pipe' }); // nosemgrep: detect-child-process
        // Branch was merged, safe to clean up
      } catch {
        // Branch not merged — preserve for manual resolution
        preserveIds.push(id);
      }
    }
  }
  return preserveIds;
}

async function executePillarWave(
  params: WaveParams,
  cli: string,
  projectRoot: string,
  feature: string | null,
  scope: string | null,
  startTime: number,
): Promise<WaveResult | WaveErrorResult> {
  if (!feature) {
    return { error: 'No active feature for pillar execution' };
  }

  // Determine active pillars based on scope
  const activePillars: Array<'security' | 'cost' | 'ux'> = [];
  const scopeLevel = scope || 'medium';

  if (['medium', 'large', 'complex'].includes(scopeLevel)) {
    activePillars.push('security', 'cost');
  }
  if (['large', 'complex'].includes(scopeLevel)) {
    activePillars.push('ux');
  }

  if (activePillars.length === 0) {
    return {
      wave: null,
      status: 'complete',
      stories: [],
      total_duration_ms: Date.now() - startTime,
      cli_used: cli,
    };
  }

  // Build prompts for each pillar
  const prompts = new Map<string, string>();
  const cwdMap = new Map<string, string>();

  for (const pillar of activePillars) {
    try {
      const prompt = await buildPillarPrompt(pillar, projectRoot, feature, scope);
      prompts.set(pillar, prompt);
      cwdMap.set(pillar, projectRoot); // Pillars work in project root, no worktrees
    } catch (err) {
      return { error: `Failed to build prompt for ${pillar}: ${(err as Error).message}` };
    }
  }

  // Spawn pillar agents (no worktrees needed)
  const agentResults = await spawnWave(
    activePillars,
    cli,
    prompts,
    cwdMap,
    params.timeout_ms || 600000,
    params.max_concurrent || 5,
  );

  const storyResults: WaveStoryResult[] = activePillars.map(pillar => {
    const result = agentResults.get(pillar);
    return {
      id: pillar,
      status: result?.status || 'failed',
      duration_ms: result?.duration_ms || 0,
      files_changed: [],
      merge_status: 'skipped' as const,
      error: result?.status !== 'done' ? result?.stderr : undefined,
    };
  });

  const allDone = storyResults.every(s => s.status === 'done');
  const anyDone = storyResults.some(s => s.status === 'done');

  return {
    wave: null,
    status: allDone ? 'complete' : anyDone ? 'partial' : 'failed',
    stories: storyResults,
    total_duration_ms: Date.now() - startTime,
    cli_used: cli,
  };
}
