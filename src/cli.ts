#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { pmOrchestrate, showPmInfo } from './orchestrator/pm.js';
import { runAgent, loadCustomAgents, listAgents, getAgent } from './wrapper/agent-runner.js';

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

// Main PM entry point
program
  .command('pm [issue]')
  .description('Invoke PM orchestrator for intelligent agent routing')
  .option('--type <type>', 'Override work type (bug|feature|refactor|documentation)')
  .option('--no-pillars', 'Skip three-pillar enforcement')
  .option('--info', 'Show PM routing information')
  .action(async (issue, options) => {
    await loadCustomAgents();

    if (options.info || !issue) {
      showPmInfo();
      return;
    }

    try {
      const result = await pmOrchestrate(issue, {
        type: options.type,
        noPillars: options.noPillars,
      });

      console.log('\n' + '='.repeat(50));
      console.log(result.summary);

      if (!result.success) {
        console.log('\nSome agents failed. Review output above.');
        process.exit(1);
      }
    } catch (err) {
      console.error('PM orchestration failed:', err);
      process.exit(1);
    }
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
    console.log(pc.green('OK') + ' BMAD + Ralph + TypeScript architecture');
    console.log(pc.dim('Run "sf pm --info" for routing information'));
  });

program.parse();
