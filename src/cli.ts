#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';

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

// Placeholder commands - will be implemented in 10-05 and 10-06
program
  .command('pm [issue]')
  .description('Invoke PM orchestrator (coming in 10-05)')
  .action(() => {
    console.log(pc.yellow('Warning:') + ' PM orchestrator not yet implemented. See 10-05-PLAN.md');
  });

program
  .command('status')
  .description('Show SpecFlow status')
  .action(() => {
    console.log(pc.bold(pc.cyan('SpecFlow CLI')) + ' v1.0.0');
    console.log(pc.green('OK') + ' TypeScript structure initialized');
    console.log(pc.dim('Next: Agent wrapper abstraction (10-04)'));
  });

program.parse();
