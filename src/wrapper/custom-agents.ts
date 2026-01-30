import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import pc from 'picocolors';
import type { AgentContext, AgentResult } from './agent-registry.js';

/**
 * Invoke a custom agent (npx package or local prompt)
 */
export async function invokeCustomAgent(invoke: string, context: AgentContext): Promise<AgentResult> {
  // Determine if npx package or local prompt
  if (invoke.startsWith('@') || invoke.includes('/') === false) {
    // npx package (e.g., @myorg/scanner or scanner)
    return invokeNpxAgent(invoke, context);
  } else {
    // Local prompt file
    return invokeLocalPrompt(invoke, context);
  }
}

async function invokeNpxAgent(packageName: string, context: AgentContext): Promise<AgentResult> {
  console.log(pc.yellow('\u25cf') + pc.dim(' [Custom]') + ` Invoking ${pc.yellow(packageName)}`);

  return new Promise((resolve) => {
    const proc = spawn('npx', [packageName], {
      cwd: context.cwd || process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
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

async function invokeLocalPrompt(promptPath: string, context: AgentContext): Promise<AgentResult> {
  try {
    const prompt = await readFile(promptPath, 'utf-8');
    return {
      success: true,
      output: `Custom agent loaded from ${promptPath}\n\n${prompt}`,
    };
  } catch {
    return {
      success: false,
      error: `Failed to load custom agent: ${promptPath}`,
    };
  }
}
