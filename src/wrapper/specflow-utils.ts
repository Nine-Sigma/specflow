import { spawn } from 'child_process';
import pc from 'picocolors';
import type { AgentContext, AgentResult } from './agent-registry.js';

/**
 * Invoke SpecFlow tracker utilities
 * These are TypeScript utilities that agents call for tracker operations
 */
export async function invokeSpecflowUtility(utilityPath: string, context: AgentContext): Promise<AgentResult> {
  const command = (context.options?.command as string) || 'help';
  const args = (context.options?.args as string[]) || [];

  console.log(pc.cyan('\u25cf') + pc.dim(' [SpecFlow]') + ` Invoking ${pc.cyan(command)}`);

  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', utilityPath, command, ...args], {
      cwd: context.cwd || process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
    });

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
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr || undefined,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}
