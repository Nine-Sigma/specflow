import pc from 'picocolors';
import type { AgentContext, AgentResult } from './agent-registry.js';

/**
 * Invoke a BMAD agent via slash command
 * BMAD agents are invoked through Claude Code's slash command system
 * SpecFlow context is injected before the BMAD agent runs
 */
export async function invokeBmadAgent(command: string, context: AgentContext): Promise<AgentResult> {
  console.log(pc.blue('\u25cf') + pc.dim(' [BMAD]') + ` Invoking ${pc.cyan(command)}`);

  // If SpecFlow context provided (from /sf:* wrapper), inject it
  if (context.specflowContext) {
    console.log(pc.dim('  SpecFlow context: ') + context.specflowContext);
  }

  if (context.workItem) {
    console.log(pc.dim('  Work item: ') + context.workItem);
  }

  // In practice, BMAD agents are invoked via .claude/commands/
  // The /sf:* wrappers inject SpecFlow context before calling BMAD
  return {
    success: true,
    output: `BMAD agent ${command} ready. Invoke via slash command in Claude Code.${
      context.specflowContext ? `\n\nSpecFlow Context:\n${context.specflowContext}` : ''
    }`,
  };
}
