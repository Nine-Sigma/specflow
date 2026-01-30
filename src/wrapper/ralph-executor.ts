import { spawn, type SpawnOptions } from 'child_process';
import { existsSync } from 'fs';
import pc from 'picocolors';
import type { AgentContext, AgentResult } from './agent-registry.js';

// Allowed tool values for Ralph
const ALLOWED_TOOLS = ['claude', 'aider', 'cursor'] as const;

// Known safe Ralph script path (relative to project root)
const RALPH_SCRIPT = 'ralph/ralph.sh';

/**
 * Execute Ralph TDD loop
 * Only allows the known Ralph script path for security
 * Tool is restricted to known values to prevent injection
 */
export async function executeRalphLoop(
  _scriptPath: string, // Ignored - we use hardcoded path for security
  context: AgentContext
): Promise<AgentResult> {
  // Get cwd - if provided, must exist as directory
  const workDir = context.cwd || process.cwd();

  // Check if Ralph script exists in the working directory
  // We use the literal constant RALPH_SCRIPT for the script name
  if (!existsSync(`${workDir}/${RALPH_SCRIPT}`)) {
    return {
      success: false,
      error: `Ralph script not found in ${workDir}`,
    };
  }

  // Validate tool - must be in allowed list
  const toolInput = (context.options?.tool as string) || 'claude';
  const tool = ALLOWED_TOOLS.includes(toolInput as (typeof ALLOWED_TOOLS)[number])
    ? toolInput
    : 'claude';

  // Validate maxIterations - must be positive integer
  const maxIterationsInput = context.options?.maxIterations;
  const maxIterations =
    typeof maxIterationsInput === 'number' && maxIterationsInput > 0 && maxIterationsInput <= 100
      ? Math.floor(maxIterationsInput)
      : 10;

  console.log(pc.magenta('\u25cf') + pc.dim(' [Ralph]') + ` Starting TDD loop`);
  console.log(pc.dim(`  Tool: ${tool}, Max iterations: ${maxIterations}`));

  const spawnOptions: SpawnOptions = {
    cwd: workDir,
    stdio: ['inherit', 'pipe', 'pipe'],
  };

  return new Promise((resolvePromise) => {
    // Script path is the hardcoded RALPH_SCRIPT constant
    // Tool is validated against ALLOWED_TOOLS whitelist
    // maxIterations is validated as positive integer <= 100
    const proc = spawn(
      'bash',
      [RALPH_SCRIPT, tool, String(maxIterations)],
      spawnOptions
    );

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      const completed = stdout.includes('<promise>COMPLETE</promise>');
      resolvePromise({
        success: code === 0 || completed,
        output: stdout,
        error: stderr || undefined,
      });
    });

    proc.on('error', (err) => {
      resolvePromise({
        success: false,
        error: err.message,
      });
    });
  });
}
