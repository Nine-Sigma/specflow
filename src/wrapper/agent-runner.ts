import pc from 'picocolors';
import {
  defaultAgents,
  type AgentContext,
  type AgentResult,
  type AgentRegistry,
} from './agent-registry.js';
import { invokeSpecflowUtility } from './specflow-utils.js';
import { invokeCustomAgent } from './custom-agents.js';
import { invokeSkill } from '../skills/runner.js';

// Note: BMAD agents are invoked via Claude Code slash commands,
// not via this TypeScript layer. The prompt-based orchestration in sf-*.md
// files handles agent routing. This file only handles utility commands.

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
specflow: pc.cyan,
    custom: pc.yellow,
    skill: pc.green,
  };
  const colorFn = sourceColors[agent.source] || pc.white;

  console.log(pc.bold(pc.green('\u25b6')) + ` Running ${pc.bold(name)} ` + pc.dim(`(${colorFn(agent.source)})`));

  switch (agent.source) {
    case 'bmad':
      // BMAD agents are invoked via Claude Code slash commands.
      // The sf-*.md files handle prompt-based orchestration.
      return {
        success: true,
        output: `Agent "${name}" is invoked via Claude Code slash command: ${agent.invoke}\nUse the /sf-* commands for SpecFlow orchestration.`,
      };
    case 'specflow':
      return invokeSpecflowUtility(agent.invoke, context);
    case 'custom':
      return invokeCustomAgent(agent.invoke, context);
    case 'skill':
      return invokeSkill(agent.invoke, context);
    default:
      return {
        success: false,
        error: `Unknown agent source: ${agent.source}`,
      };
  }
}
