import pc from 'picocolors';
import {
  defaultAgents,
  type AgentContext,
  type AgentResult,
  type AgentRegistry,
} from './agent-registry.js';
import { invokeBmadAgent } from './bmad-agents.js';
import { executeRalphLoop } from './ralph-executor.js';
import { invokeSpecflowUtility } from './specflow-utils.js';
import { invokeCustomAgent } from './custom-agents.js';

// Merged registry (defaults + custom)
let agents: AgentRegistry = { ...defaultAgents };

/**
 * Load custom agents from agents.json if it exists
 */
export async function loadCustomAgents(): Promise<void> {
  try {
    const { readFile } = await import('fs/promises');
    const raw = await readFile('agents.json', 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.agents) {
      agents = { ...defaultAgents, ...parsed.agents };
      console.log(pc.dim(`[Registry] Loaded ${Object.keys(parsed.agents).length} custom agents`));
    }
  } catch {
    // agents.json doesn't exist, use defaults only
  }
}

/**
 * List all available agents
 */
export function listAgents(): string[] {
  return Object.keys(agents);
}

/**
 * Get agent definition
 */
export function getAgent(name: string) {
  return agents[name];
}

/**
 * Unified agent runner - single entry point for all agent types
 * All agents are BMAD agents - SpecFlow context injected via /sf:* wrappers
 */
export async function runAgent(name: string, context: AgentContext = {}): Promise<AgentResult> {
  const agent = agents[name];

  if (!agent) {
    return {
      success: false,
      error: `Unknown agent: ${name}. Available: ${Object.keys(agents).join(', ')}`,
    };
  }

  const sourceColors: Record<string, (s: string) => string> = {
    bmad: pc.blue,
    ralph: pc.magenta,
    specflow: pc.cyan,
    custom: pc.yellow,
  };
  const colorFn = sourceColors[agent.source] || pc.white;

  console.log(pc.bold(pc.green('\u25b6')) + ` Running ${pc.bold(name)} ` + pc.dim(`(${colorFn(agent.source)})`));

  switch (agent.source) {
    case 'bmad':
      return invokeBmadAgent(agent.invoke, context);
    case 'ralph':
      return executeRalphLoop(agent.invoke, context);
    case 'specflow':
      return invokeSpecflowUtility(agent.invoke, context);
    case 'custom':
      return invokeCustomAgent(agent.invoke, context);
    default:
      return {
        success: false,
        error: `Unknown agent source: ${agent.source}`,
      };
  }
}
