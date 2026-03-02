#!/usr/bin/env node

// Preflight: ensure Node.js >= 20
const [nodeMajor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 20) {
  console.error(`SpecFlow requires Node.js >= 20 (found ${process.version})`);
  console.error('Install via: https://nodejs.org or use nvm/fnm');
  process.exit(1);
}

import { Command } from 'commander';
import pc from 'picocolors';
import { runAgent, loadCustomAgents, listAgents, getAgent } from './wrapper/agent-runner.js';
import { installSkillCommand, listSkillsCommand, removeSkillCommand } from './skills/commands.js';
import { reviewCommand } from './review/commands.js';
import { init } from './installer.js';

const program = new Command();

// Custom help styling
program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(pc.red(str)),
});

program
  .name('sf')
  .description(pc.cyan('SpecFlow') + ' - Security-first, cost-aware development')
  .version('1.0.0');

// PM command - directs to slash command
program
  .command('pm [issue]')
  .description('PM orchestrator (use /sf:pm in Claude Code)')
  .action(() => {
    console.log(pc.bold(pc.cyan('SpecFlow PM Orchestrator')));
    console.log();
    console.log('PM orchestration uses prompt-based routing in Claude Code.');
    console.log();
    console.log(pc.bold('Usage:'));
    console.log('  In Claude Code, invoke: ' + pc.green('/sf:pm "your feature description"'));
    console.log();
    console.log(pc.bold('Available commands:'));
    console.log('  /sf:pm <description>  - Start new feature workflow');
    console.log('  /sf:pm --review       - Review current feature outputs');
    console.log('  /sf:pm --status       - Show current STATE.md');
    console.log();
    console.log(pc.dim('The PM agent (John) orchestrates: analyst → architect → [security] → [cost] → tea → dev → qa'));
  });

// Direct agent invocation (escape hatches)
program
  .command('agent <name>')
  .description('Invoke a specific agent directly')
  .action(async (name) => {
    await loadCustomAgents();
    const result = await runAgent(name, {});
    console.log(result.output || result.error);
    if (!result.success) process.exit(1);
  });

// List available agents
program
  .command('agents')
  .description('List all available agents')
  .action(async () => {
    await loadCustomAgents();
    console.log(pc.bold('Available agents:\n'));
    for (const name of listAgents()) {
      const agent = getAgent(name);
      console.log(`  ${pc.green(name)}: ${pc.dim(agent?.description || '(no description)')}`);
    }
  });

// Status command
program
  .command('status')
  .description('Show SpecFlow status')
  .action(() => {
    console.log(pc.bold(pc.cyan('SpecFlow CLI')) + ' v1.0.0');
    console.log(pc.green('OK') + ' Prompt-based orchestration via /sf:* commands');
    console.log(pc.dim('Run "sf pm" for PM routing information'));
  });

// Skill management
const skillCommand = new Command('skill')
  .description('Manage external skills');

skillCommand
  .command('install')
  .description('Install skill from GitHub')
  .argument('<spec>', 'Skill spec (e.g., pptx@anthropics/skills)')
  .action(installSkillCommand);

skillCommand
  .command('list')
  .description('List installed skills')
  .action(listSkillsCommand);

skillCommand
  .command('remove')
  .description('Remove installed skill')
  .argument('<name>', 'Skill name to remove')
  .action(removeSkillCommand);

program.addCommand(skillCommand);
program.addCommand(reviewCommand);

// Init command - full project initialization
program
  .command('init [directory]')
  .description('Initialize SpecFlow in a project')
  .option('-f, --force', 'Overwrite existing files without prompting')
  .action(async (directory, options) => {
    try {
      await init(directory || process.cwd(), { force: options.force });
    } catch (err) {
      console.error(pc.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// MCP server command
program
  .command('serve')
  .description('Start SpecFlow MCP server')
  .option('-p, --port <port>', 'HTTP/SSE port (default: stdio)')
  .action(async (options) => {
    const { startServer } = await import('./mcp/server.js');
    const port = options.port ? parseInt(options.port, 10) : undefined;
    await startServer({ port });
  });

program.parse();
