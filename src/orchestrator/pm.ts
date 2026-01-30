import pc from 'picocolors';
import { runAgent, listAgents, getAgent } from '../wrapper/agent-runner.js';
import type { AgentContext, AgentResult } from '../wrapper/agent-registry.js';

// Work types that affect routing
export type WorkType = 'bug' | 'feature' | 'refactor' | 'documentation' | 'unknown';

// PM orchestration plan
export interface OrchestrationPlan {
  workType: WorkType;
  agents: string[];
  parallel: boolean;
  reason: string;
}

// PM execution result
export interface PmResult {
  plan: OrchestrationPlan;
  results: Map<string, AgentResult>;
  success: boolean;
  summary: string;
}

/**
 * Detect work type from issue description
 * Simple heuristic - PM agent can override with intelligence
 */
export function detectWorkType(description: string): WorkType {
  const lower = description.toLowerCase();

  if (lower.includes('bug') || lower.includes('fix') || lower.includes('broken') || lower.includes('error')) {
    return 'bug';
  }
  if (lower.includes('refactor') || lower.includes('cleanup') || lower.includes('optimize')) {
    return 'refactor';
  }
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('comment')) {
    return 'documentation';
  }
  if (lower.includes('add') || lower.includes('feature') || lower.includes('new') || lower.includes('implement')) {
    return 'feature';
  }

  return 'unknown';
}

/**
 * Create orchestration plan based on work type
 * This is the "brain" - decides which agents to involve
 */
export function createPlan(workType: WorkType, _description: string): OrchestrationPlan {
  switch (workType) {
    case 'bug':
      // Bugs: QA-focused, less three-pillar overhead
      return {
        workType,
        agents: ['qa', 'dev'],
        parallel: false,
        reason: 'Bug fix: QA analyzes, dev implements',
      };

    case 'feature':
      // Features: Full three-pillar treatment
      return {
        workType,
        agents: ['analyst', 'security', 'cost', 'architect', 'dev', 'qa'],
        parallel: true, // analyst/security/cost can run in parallel
        reason: 'Feature: Full three-pillar analysis before implementation',
      };

    case 'refactor':
      // Refactor: Architecture-focused
      return {
        workType,
        agents: ['architect', 'dev', 'qa'],
        parallel: false,
        reason: 'Refactor: Architect reviews, dev implements, QA verifies',
      };

    case 'documentation':
      // Docs: Minimal agents
      return {
        workType,
        agents: ['analyst'],
        parallel: false,
        reason: 'Documentation: Analyst reviews and updates',
      };

    default:
      // Unknown: Conservative, full analysis
      return {
        workType,
        agents: ['analyst', 'architect'],
        parallel: false,
        reason: 'Unknown work type: Starting with analysis',
      };
  }
}

/**
 * Execute orchestration plan
 * Runs agents sequentially or in parallel based on plan
 */
export async function executePlan(
  plan: OrchestrationPlan,
  context: AgentContext
): Promise<Map<string, AgentResult>> {
  const results = new Map<string, AgentResult>();

  if (plan.parallel) {
    // Run agents in parallel
    console.log(pc.dim(`[PM] Running ${plan.agents.length} agents in parallel`));
    const promises = plan.agents.map(async (name) => {
      const result = await runAgent(name, context);
      return { name, result };
    });

    const settled = await Promise.all(promises);
    for (const { name, result } of settled) {
      results.set(name, result);
    }
  } else {
    // Run agents sequentially
    console.log(pc.dim(`[PM] Running ${plan.agents.length} agents sequentially`));
    for (const name of plan.agents) {
      const result = await runAgent(name, context);
      results.set(name, result);

      // Stop on critical failure
      if (!result.success && ['analyst', 'security'].includes(name)) {
        console.log(pc.yellow(`[PM] Stopping: ${name} failed critically`));
        break;
      }
    }
  }

  return results;
}

/**
 * Main PM orchestration entry point
 */
export async function pmOrchestrate(
  issue: string,
  options: { type?: WorkType; noPillars?: boolean } = {}
): Promise<PmResult> {
  console.log(pc.bold(pc.cyan('[PM]')) + ' Starting orchestration');
  console.log(pc.dim(`[PM] Issue: ${issue}`));

  // Detect or use provided work type
  const workType = options.type || detectWorkType(issue);
  console.log(pc.dim(`[PM] Work type: ${workType}`));

  // Create orchestration plan
  let plan = createPlan(workType, issue);

  // Apply options
  if (options.noPillars) {
    // Remove pillar agents if requested
    plan = {
      ...plan,
      agents: plan.agents.filter((a) => !['security', 'cost'].includes(a)),
      reason: plan.reason + ' (pillars disabled)',
    };
  }

  console.log(pc.dim(`[PM] Plan: ${plan.agents.join(' -> ')}`));
  console.log(pc.dim(`[PM] Reason: ${plan.reason}`));

  // Execute plan
  const context: AgentContext = { workItem: issue, options };
  const results = await executePlan(plan, context);

  // Summarize results
  const successCount = Array.from(results.values()).filter((r) => r.success).length;
  const summary = `Completed ${successCount}/${plan.agents.length} agents for ${workType}`;

  return {
    plan,
    results,
    success: successCount === plan.agents.length,
    summary,
  };
}

/**
 * Show available agents and routing logic
 */
export function showPmInfo(): void {
  console.log(pc.bold(pc.cyan('PM Orchestrator')) + ' - Intelligent Agent Routing\n');

  console.log(pc.bold('Available Agents:'));
  for (const name of listAgents()) {
    const agent = getAgent(name);
    console.log(`  ${pc.green(name)}: ${pc.dim(agent?.description || '(no description)')}`);
  }

  console.log('\n' + pc.bold('Work Type Routing:'));
  console.log(`  ${pc.yellow('bug')}          -> qa, dev`);
  console.log(`  ${pc.yellow('feature')}      -> analyst, security, cost, architect, dev, qa ${pc.dim('(parallel pillars)')}`);
  console.log(`  ${pc.yellow('refactor')}     -> architect, dev, qa`);
  console.log(`  ${pc.yellow('documentation')} -> analyst`);
  console.log(`  ${pc.yellow('unknown')}      -> analyst, architect`);

  console.log('\n' + pc.bold('Options:'));
  console.log(`  ${pc.dim('--type <type>')}   Override work type detection`);
  console.log(`  ${pc.dim('--no-pillars')}    Skip security and cost agents`);
}
