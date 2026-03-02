import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { sanitizeSlug, PHASE_PREREQUISITES, type WorkflowState } from './types.js';

/** Sprint status story entry */
interface StoryEntry {
  id: string;
  status: string;
  wave: number;
  dependencies?: string[];
  completed_at?: string;
}

/** Sprint status wave entry */
interface WaveEntry {
  number: number;
}

/** Sprint status structure */
interface SprintStatus {
  stories: StoryEntry[];
  waves: WaveEntry[];
}

/** Simple advisory lock using a promise chain */
let lockChain = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = lockChain.then(fn, fn);
  lockChain = next.then(() => {}, () => {});
  return next;
}

// Use a flexible result type for tool responses
type StateResult = Record<string, unknown>;

/**
 * Handle specflow_state tool calls.
 *
 */
export async function handleState(
  action: string,
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  switch (action) {
    case 'read':
      return readState(projectRoot);
    case 'start':
      return startFeature(data, projectRoot);
    case 'update':
      return updateState(data, projectRoot);
    case 'complete':
      return completePhase(data, projectRoot);
    case 'resume':
      return resumeState(projectRoot);
    case 'start_or_resume':
      return startOrResume(data, projectRoot);
    case 'stories':
      return handleStories(data, projectRoot);
    case 'waves':
      return handleWaves(projectRoot);
    case 'next-wave':
      return handleNextWave(projectRoot);
    default:
      return { error: `Unknown action: "${action}". Valid actions: read, start, start_or_resume, update, complete, resume, stories, waves, next-wave` };
  }
}

/**
 * Read current workflow state.
 */
async function readState(projectRoot: string): Promise<StateResult> {
  const state = await loadActiveState(projectRoot);
  if (!state) {
    return { feature: null, phase: null };
  }
  return stateToResult(state);
}

/**
 * Start a new feature workflow.
 */
async function startFeature(
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  if (!data?.feature || typeof data.feature !== 'string') {
    return { error: 'Missing required field: feature' };
  }

  const slug = sanitizeSlug(data.feature);
  const description = (data.description as string) || '';
  const featureDir = join(projectRoot, '.specflow', 'features', slug); // nosemgrep: path-join-resolve-traversal
  const statePath = join(featureDir, 'workflow-state.json'); // nosemgrep: path-join-resolve-traversal

  // Check if feature already exists
  try {
    const existing = await readFile(statePath, 'utf8');
    const existingState = JSON.parse(existing);
    return {
      error: `Feature "${slug}" already exists`,
      current_state: existingState,
    };
  } catch {
    // Feature doesn't exist, continue
  }

  const now = new Date().toISOString();
  const state: WorkflowState = {
    feature: slug,
    description,
    phase: 'triage',
    last_agent: null,
    scope: null,
    pillars: [],
    completed_phases: [],
    last_completed_at: null,
    created_at: now,
    updated_at: now,
  };

  await mkdir(featureDir, { recursive: true });
  await writeStateFile(statePath, state);
  await updateGlobalState(projectRoot, state);

  return stateToResult(state);
}

/**
 * Start a new feature or resume an existing one.
 * Eliminates the friction of needing to know whether a feature already exists.
 */
async function startOrResume(
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  if (!data?.feature || typeof data.feature !== 'string') {
    return { error: 'Missing required field: feature' };
  }

  const slug = sanitizeSlug(data.feature);
  const featureDir = join(projectRoot, '.specflow', 'features', slug); // nosemgrep: path-join-resolve-traversal
  const statePath = join(featureDir, 'workflow-state.json'); // nosemgrep: path-join-resolve-traversal

  // Check if feature already exists
  try {
    const existing = await readFile(statePath, 'utf8');
    const state = JSON.parse(existing) as WorkflowState;
    return { ...stateToResult(state), action_taken: 'resumed' };
  } catch {
    // Feature doesn't exist, create it
  }

  const description = (data.description as string) || '';
  const now = new Date().toISOString();
  const state: WorkflowState = {
    feature: slug,
    description,
    phase: 'triage',
    last_agent: null,
    scope: null,
    pillars: [],
    completed_phases: [],
    last_completed_at: null,
    created_at: now,
    updated_at: now,
  };

  await mkdir(featureDir, { recursive: true });
  await writeStateFile(statePath, state);
  await updateGlobalState(projectRoot, state);

  return { ...stateToResult(state), action_taken: 'started' };
}

/**
 * Update workflow state fields (partial update).
 */
async function updateState(
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  if (!data) return { error: 'No data provided for update' };

  return withLock(async () => {
    const state = await loadActiveState(projectRoot);
    if (!state) return { error: 'No active workflow' };

    const statePath = getStatePath(projectRoot, state.feature);

    // Check phase prerequisites before applying changes
    const warnings: Array<{ type: string; phase: string; message: string }> = [];
    if (data.phase !== undefined) {
      const prereqs = PHASE_PREREQUISITES[data.phase as string];
      if (prereqs) {
        const missing: string[] = [];
        for (const prereq of prereqs) {
          if (!state.completed_phases.includes(prereq)) {
            missing.push(prereq);
            warnings.push({
              type: 'prerequisite_missing',
              phase: prereq,
              message: `Phase "${prereq}" has not been completed before entering "${data.phase}"`,
            });
          }
        }

        // Strict mode: block transition when prerequisites are missing
        if (data.strict === true && missing.length > 0) {
          return {
            error: 'prerequisite_missing',
            missing,
            message: `Cannot enter phase "${data.phase}" — missing prerequisites: ${missing.join(', ')}`,
          };
        }
      }
    }

    // Apply partial updates
    if (data.phase !== undefined) state.phase = data.phase as string;
    const agentValue = data.agent !== undefined ? data.agent : data.last_agent;
    if (agentValue !== undefined) state.last_agent = agentValue as string;
    if (data.scope !== undefined) state.scope = data.scope as string;
    if (data.pillars !== undefined) state.pillars = data.pillars as string[];
    state.updated_at = new Date().toISOString();

    await writeStateFile(statePath, state);
    await updateGlobalState(projectRoot, state);

    const result = stateToResult(state);
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    return result;
  });
}

/**
 * Mark a phase as complete (idempotent).
 */
async function completePhase(
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  if (!data?.phase || typeof data.phase !== 'string') {
    return { error: 'Missing required field: phase' };
  }

  const phaseName = data.phase;

  return withLock(async () => {
    const state = await loadActiveState(projectRoot);
    if (!state) return { error: 'No active workflow' };

    const statePath = getStatePath(projectRoot, state.feature);

    // Idempotent: don't add if already present
    if (!state.completed_phases.includes(phaseName)) {
      state.completed_phases.push(phaseName);
    }
    state.last_completed_at = new Date().toISOString();
    state.updated_at = new Date().toISOString();

    await writeStateFile(statePath, state);
    await updateGlobalState(projectRoot, state);

    return stateToResult(state);
  });
}

/**
 * Return raw state snapshot for session recovery.
 * Does NOT compute next-phase routing decisions.
 */
async function resumeState(projectRoot: string): Promise<StateResult> {
  const state = await loadActiveState(projectRoot);
  if (!state) return { feature: null, phase: null };

  // Load sprint-status summary if available
  let sprintStatus: unknown = null;
  try {
    const sprintPath = join(projectRoot, '.specflow', 'features', state.feature, 'sprint-status.yaml'); // nosemgrep: path-join-resolve-traversal
    const content = await readFile(sprintPath, 'utf8');
    sprintStatus = parseYaml(content);
  } catch {
    // No sprint-status yet
  }

  return {
    ...stateToResult(state),
    current_phase: state.phase,  // deprecated alias for backward compatibility
    sprint_status: sprintStatus,
  };
}

/**
 * Handle stories action — read/write story status in sprint-status.yaml
 */
async function handleStories(
  data: Record<string, unknown> | undefined,
  projectRoot: string,
): Promise<StateResult> {
  const state = await loadActiveState(projectRoot);
  if (!state) return { error: 'No active workflow' };

  const sprintPath = join(projectRoot, '.specflow', 'features', state.feature, 'sprint-status.yaml'); // nosemgrep: path-join-resolve-traversal

  // If data.update is provided, update a story
  if (data?.update && typeof data.update === 'object') {
    return withLock(async () => {
      let sprintStatus = await loadSprintStatus(sprintPath);
      if (!sprintStatus) {
        sprintStatus = { stories: [], waves: [] };
      }

      const update = data.update as { id: string; status: string };
      const story = sprintStatus.stories.find(s => s.id === update.id);
      if (story) {
        story.status = update.status;
        if (update.status === 'done') {
          story.completed_at = new Date().toISOString();
        }
      }

      await writeFile(sprintPath, stringifyYaml(sprintStatus));
      return sprintStatus as unknown as StateResult;
    });
  }

  // Read sprint status
  const sprintStatus = await loadSprintStatus(sprintPath);
  return (sprintStatus || { stories: [], waves: [] }) as unknown as StateResult;
}

/**
 * Handle waves action — return wave assignments with dependency info.
 */
async function handleWaves(projectRoot: string): Promise<StateResult> {
  const state = await loadActiveState(projectRoot);
  if (!state) return { error: 'No active workflow' };

  const sprintPath = join(projectRoot, '.specflow', 'features', state.feature, 'sprint-status.yaml'); // nosemgrep: path-join-resolve-traversal
  const sprintStatus = await loadSprintStatus(sprintPath);

  if (!sprintStatus?.waves) {
    return { waves: [] };
  }

  return { waves: sprintStatus.waves };
}

/**
 * Handle next-wave action — return stories in next wave with satisfied dependencies.
 */
async function handleNextWave(projectRoot: string): Promise<StateResult> {
  const state = await loadActiveState(projectRoot);
  if (!state) return { error: 'No active workflow' };

  const sprintPath = join(projectRoot, '.specflow', 'features', state.feature, 'sprint-status.yaml'); // nosemgrep: path-join-resolve-traversal
  const sprintStatus = await loadSprintStatus(sprintPath);

  if (!sprintStatus?.waves || !sprintStatus?.stories) {
    return { stories: [], wave: null };
  }

  const doneStories = new Set(
    sprintStatus.stories
      .filter(s => s.status === 'done')
      .map(s => s.id),
  );

  // Find next wave with pending stories
  for (const wave of sprintStatus.waves) {
    const waveStories = sprintStatus.stories.filter(
      s => s.wave === wave.number && s.status !== 'done',
    );

    if (waveStories.length === 0) continue;

    // Check dependency satisfaction
    const ready = waveStories.filter(s => {
      if (!s.dependencies || s.dependencies.length === 0) return true;
      return s.dependencies.every(dep => doneStories.has(dep));
    });

    if (ready.length > 0) {
      return { wave: wave.number, stories: ready };
    }
  }

  return { stories: [], wave: null };
}

// --- Internal helpers ---

function getStatePath(projectRoot: string, feature: string): string {
  return join(projectRoot, '.specflow', 'features', sanitizeSlug(feature), 'workflow-state.json'); // nosemgrep: path-join-resolve-traversal
}

function stateToResult(state: WorkflowState): StateResult {
  return { ...state };
}

/**
 * Load the active workflow state.
 * Scans feature directories for workflow-state.json files and returns the most recently updated one.
 */
async function loadActiveState(projectRoot: string): Promise<WorkflowState | null> {
  const featuresDir = join(projectRoot, '.specflow', 'features'); // nosemgrep: path-join-resolve-traversal

  try {
    const entries = await readdir(featuresDir);
    let latestState: WorkflowState | null = null;
    let latestTime = '';

    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      const statePath = join(featuresDir, entry, 'workflow-state.json'); // nosemgrep: path-join-resolve-traversal
      try {
        const content = await readFile(statePath, 'utf8');
        const state = JSON.parse(content) as WorkflowState;
        if (state.updated_at > latestTime) {
          latestTime = state.updated_at;
          latestState = state;
        }
      } catch {
        // No state file in this feature dir
      }
    }

    return latestState;
  } catch {
    return null;
  }
}

async function writeStateFile(path: string, state: WorkflowState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Update the global STATE.md file as a side-effect.
 */
async function updateGlobalState(projectRoot: string, state: WorkflowState): Promise<void> {
  const stateMdPath = join(projectRoot, '.specflow', 'STATE.md'); // nosemgrep: path-join-resolve-traversal
  const content = `# Project State

## Current Position

Feature: ${state.feature}
Phase: ${state.phase || 'Not started'}
Agent: ${state.last_agent || 'None'}
Scope: ${state.scope || 'Not assessed'}
Status: In progress

## Completed Phases

${state.completed_phases.length > 0 ? state.completed_phases.map(p => `- ${p}`).join('\n') : 'None yet.'}

## Session Continuity

Last updated: ${state.updated_at}
`;
  await writeFile(stateMdPath, content);
}

async function loadSprintStatus(path: string): Promise<SprintStatus | null> {
  try {
    const content = await readFile(path, 'utf8');
    return parseYaml(content) as SprintStatus;
  } catch {
    return null;
  }
}
