/**
 * Unified tracker interface
 * Usage: npx tsx src/trackers/index.ts <tracker> <command> [args...]
 *
 * Examples:
 *   npx tsx src/trackers/index.ts github create-issue "Title" "Body"
 *   npx tsx src/trackers/index.ts jira create-epic "Epic title" "Description"
 */
import * as github from './github.js';
import * as jira from './jira.js';
import * as linear from './linear.js';

// Re-export for programmatic use
export { github, jira, linear };

// Unified ticket interface
export interface Ticket {
  id: string;
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

// Unified tracker operations
export type TrackerType = 'github' | 'jira' | 'linear';

export async function createTicket(
  tracker: TrackerType,
  ticket: Ticket,
  options?: { teamId?: string }
): Promise<string> {
  switch (tracker) {
    case 'github':
      return github.createIssue(ticket);
    case 'jira':
      return jira.createIssue(ticket.title, ticket.body, 'Story');
    case 'linear':
      if (!options?.teamId) throw new Error('Linear requires teamId');
      return linear.createIssue(ticket.title, ticket.body, options.teamId);
    default:
      throw new Error(`Unknown tracker: ${tracker}`);
  }
}

export async function createEpic(
  tracker: TrackerType,
  title: string,
  body: string,
  options?: { teamIds?: string[] }
): Promise<string> {
  switch (tracker) {
    case 'github':
      return github.createEpic(title, body);
    case 'jira':
      return jira.createEpic(title, body);
    case 'linear':
      if (!options?.teamIds?.length) throw new Error('Linear requires teamIds');
      return linear.createProject(title, body, options.teamIds);
    default:
      throw new Error(`Unknown tracker: ${tracker}`);
  }
}

// CLI entry point
const [,, tracker, command, ...args] = process.argv;

async function main() {
  if (!tracker || !command) {
    console.log('Usage: npx tsx src/trackers/index.ts <tracker> <command> [args...]');
    console.log('');
    console.log('Trackers: github, jira, linear');
    console.log('');
    console.log('Commands:');
    console.log('  create-issue <title> <body>');
    console.log('  create-epic <title> <body>');
    return;
  }

  switch (tracker) {
    case 'github':
      if (command === 'create-issue') {
        const id = await github.createIssue({ id: '', title: args[0], body: args[1] });
        console.log(id);
      } else if (command === 'create-epic') {
        const id = await github.createEpic(args[0], args[1]);
        console.log(id);
      } else {
        console.error(`Unknown GitHub command: ${command}`);
        process.exit(1);
      }
      break;
    case 'jira':
      if (command === 'create-issue') {
        const id = await jira.createIssue(args[0], args[1], 'Story');
        console.log(id);
      } else if (command === 'create-epic') {
        const id = await jira.createEpic(args[0], args[1]);
        console.log(id);
      } else {
        console.error(`Unknown Jira command: ${command}`);
        process.exit(1);
      }
      break;
    case 'linear':
      if (command === 'create-issue') {
        const id = await linear.createIssue(args[0], args[1], args[2]);
        console.log(id);
      } else {
        console.error(`Unknown Linear command: ${command}`);
        process.exit(1);
      }
      break;
    default:
      console.error(`Unknown tracker: ${tracker}. Use: github, jira, linear`);
      process.exit(1);
  }
}

// Only run main if this is the entry point
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
