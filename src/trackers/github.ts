/**
 * GitHub tracker utilities - thin wrapper around gh CLI
 * Agents can also use gh CLI directly for most operations
 */
import { spawn } from 'child_process';

export interface Ticket {
  id: string;
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export async function createIssue(ticket: Ticket): Promise<string> {
  const args = ['issue', 'create', '--title', ticket.title, '--body', ticket.body];
  if (ticket.labels?.length) args.push('--label', ticket.labels.join(','));
  if (ticket.assignees?.length) args.push('--assignee', ticket.assignees.join(','));

  return runGh(args);
}

export async function createEpic(title: string, body: string): Promise<string> {
  return createIssue({ id: '', title, body, labels: ['epic'] });
}

export async function linkIssues(parent: string, child: string): Promise<void> {
  // Add comment linking issues (GitHub doesn't have native sub-issues in free tier)
  await runGh(['issue', 'comment', child, '--body', `Parent: #${parent}`]);
}

async function runGh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args, { stdio: ['inherit', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', d => stdout += d);
    proc.stderr?.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`gh failed with code ${code}: ${stderr}`));
      }
    });
  });
}
