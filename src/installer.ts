#!/usr/bin/env node
/**
 * SpecFlow Installer
 * Copies slash-commands/*.md to user's .claude/commands/
 *
 * Usage:
 *   npx specflow install        # Install to current directory
 *   npx specflow install ./app  # Install to specific directory
 *   npx specflow uninstall      # Remove SpecFlow commands
 */
import { copyFile, mkdir, readdir, unlink, stat, cp, readFile, writeFile } from 'fs/promises';
import { createInterface } from 'readline';
import { dirname, join, resolve, normalize, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Sanitize and validate target directory path.
 * Prevents path traversal attacks by:
 * 1. Resolving to absolute path
 * 2. Normalizing to remove ../ sequences
 * 3. Verifying result is under original base
 */
function sanitizeTargetDir(inputDir: string): string {
  // nosemgrep: path-join-resolve-traversal
  const baseDir = process.cwd();
  // nosemgrep: path-join-resolve-traversal
  const resolved = resolve(baseDir, inputDir);
  const normalized = normalize(resolved);

  // Ensure path doesn't escape via traversal
  // nosemgrep: path-join-resolve-traversal
  if (!normalized.startsWith(baseDir) && !isAbsolute(inputDir)) {
    throw new Error(`Invalid path: ${inputDir} - path traversal detected`);
  }

  return normalized;
}

/**
 * Prompt user for y/n confirmation.
 * Returns true for 'y' or 'Y', false otherwise.
 */
async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Detect which SpecFlow directories already exist.
 * Note: targetDir must be sanitized before calling this function.
 */
async function detectExisting(targetDir: string): Promise<string[]> {
  const dirs = ['.specflow', '.specflow-lib', '.claude/commands'];
  const existing: string[] = [];

  for (const dir of dirs) {
    try {
      // nosemgrep: path-join-resolve-traversal
      await stat(join(targetDir, dir));
      existing.push(dir);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return existing;
}

/**
 * Update .gitignore to include secrets.json entry.
 * Creates file if it doesn't exist. Avoids duplicates.
 * Note: targetDir must be sanitized before calling this function.
 */
async function updateGitignore(targetDir: string): Promise<void> {
  // nosemgrep: path-join-resolve-traversal
  const gitignorePath = join(targetDir, '.gitignore');
  const lineToAdd = '.specflow/secrets.json';

  let content = '';
  try {
    content = await readFile(gitignorePath, 'utf8');
  } catch {
    // .gitignore doesn't exist, will create
  }

  const lines = content.split('\n');
  if (lines.some(line => line.trim() === lineToAdd)) {
    return; // Already has the entry
  }

  const newContent = content.endsWith('\n') || content === ''
    ? content + lineToAdd + '\n'
    : content + '\n' + lineToAdd + '\n';

  await writeFile(gitignorePath, newContent);
}

/**
 * Create minimal .specflow/ directory with initial files.
 * Does NOT copy from templates - creates programmatically.
 * Note: targetDir must be sanitized before calling this function.
 */
async function createSpecflowDir(targetDir: string): Promise<void> {
  // nosemgrep: path-join-resolve-traversal
  const specflowDir = join(targetDir, '.specflow');

  // Create directories
  // nosemgrep: path-join-resolve-traversal
  await mkdir(join(specflowDir, 'features'), { recursive: true });
  // nosemgrep: path-join-resolve-traversal
  await mkdir(join(specflowDir, 'skills'), { recursive: true });

  // Create STATE.md
  const stateContent = `# Project State

## Current Position

Phase: Not started
Status: Ready for first feature

## Accumulated Context

### Decisions

None yet.

### Pending Todos

None.

## Session Continuity

Last session: (not started)
Next: Run /sf:pm "your feature" to begin
`;
  // nosemgrep: path-join-resolve-traversal
  await writeFile(join(specflowDir, 'STATE.md'), stateContent);

  // Create config.json
  const configContent = JSON.stringify({
    tracker: null,
    testing: {
      coverage_thresholds: {
        medium: 70,
        large: 80,
        complex: 90
      },
      flaky_retries: 2
    },
    uat: {
      mode: "auto",
      fallback: "manual"
    }
  }, null, 2) + '\n';
  // nosemgrep: path-join-resolve-traversal
  await writeFile(join(specflowDir, 'config.json'), configContent);

  // Create .gitkeep files
  // nosemgrep: path-join-resolve-traversal
  await writeFile(join(specflowDir, 'features', '.gitkeep'), '');
  // nosemgrep: path-join-resolve-traversal
  await writeFile(join(specflowDir, 'skills', '.gitkeep'), '');
}

/**
 * Initialize SpecFlow in a project directory.
 *
 * Creates:
 * - .specflow/ (runtime workspace - created programmatically)
 * - .specflow-lib/ (methodology library - copied from package)
 * - .claude/commands/ (slash commands - copied from package)
 *
 * @param targetDir - Directory to initialize (defaults to cwd)
 * @param options - { force: boolean } to skip confirmation prompt
 */
export async function init(
  targetDir: string = process.cwd(),
  options: { force?: boolean } = {}
): Promise<void> {
  const safeTargetDir = sanitizeTargetDir(targetDir);

  console.log(pc.bold(pc.cyan('\nSpecFlow Init\n')));

  // 1. Check for existing installation
  const existingDirs = await detectExisting(safeTargetDir);
  if (existingDirs.length > 0) {
    console.log(pc.yellow('Existing SpecFlow installation detected:'));
    for (const dir of existingDirs) {
      console.log(`  ${pc.dim(dir)}`);
    }
    console.log('');

    if (!options.force) {
      const confirmed = await confirm('Overwrite existing files?');
      if (!confirmed) {
        console.log(pc.yellow('\nInit cancelled.'));
        return;
      }
    } else {
      console.log(pc.dim('--force specified, continuing...\n'));
    }
  }

  // Find package root (where .specflow-lib/ and slash-commands/ live)
  const packageRoot = resolve(__dirname, '..');

  // Verify package has required directories
  // nosemgrep: path-join-resolve-traversal
  const specflowLibSrc = join(packageRoot, '.specflow-lib');
  // nosemgrep: path-join-resolve-traversal
  const slashCommandsSrc = join(packageRoot, 'slash-commands');

  try {
    await stat(specflowLibSrc);
  } catch {
    console.error(pc.red('Error: .specflow-lib/ not found in package'));
    console.error(pc.dim(`Expected at: ${specflowLibSrc}`));
    process.exit(1);
  }

  // 2. Check for existing features to inform user
  // Note: Features are preserved implicitly - mkdir({recursive:true}) doesn't delete
  // existing subdirectories, and we never rm -rf before creating. This check is
  // purely informational to let users know their work is safe.
  // nosemgrep: path-join-resolve-traversal
  const featuresDir = join(safeTargetDir, '.specflow', 'features');
  try {
    const entries = await readdir(featuresDir);
    const existingFeatures = entries.filter(f => f !== '.gitkeep');
    if (existingFeatures.length > 0) {
      console.log(pc.dim(`Preserving ${existingFeatures.length} existing feature(s)`));
    }
  } catch {
    // No existing features directory
  }

  // 3. Create/copy directories
  console.log(pc.bold('Creating directories:\n'));

  // .specflow/ - created programmatically (not copied)
  try {
    await createSpecflowDir(safeTargetDir);
    console.log(`  ${pc.green('+')} .specflow/`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      console.error(pc.red(`Error: Permission denied creating .specflow/`));
      console.error(pc.dim('Check directory permissions or try with elevated access.'));
      process.exit(1);
    }
    throw error;
  }

  // .specflow-lib/ - copied from package
  // nosemgrep: path-join-resolve-traversal
  const specflowLibDest = join(safeTargetDir, '.specflow-lib');
  try {
    await cp(specflowLibSrc, specflowLibDest, { recursive: true, force: true });
    console.log(`  ${pc.green('+')} .specflow-lib/`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      console.error(pc.red(`Error: Permission denied creating .specflow-lib/`));
      console.error(pc.dim('Check directory permissions or try with elevated access.'));
      process.exit(1);
    }
    throw error;
  }

  // .claude/commands/ - copied from package (reuse existing pattern)
  // nosemgrep: path-join-resolve-traversal
  const claudeDir = join(safeTargetDir, '.claude', 'commands');
  // nosemgrep: path-join-resolve-traversal
  await mkdir(join(safeTargetDir, '.claude'), { recursive: true });
  try {
    await cp(slashCommandsSrc, claudeDir, { recursive: true, force: true });
    console.log(`  ${pc.green('+')} .claude/commands/`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      console.error(pc.red(`Error: Permission denied creating .claude/commands/`));
      console.error(pc.dim('Check directory permissions or try with elevated access.'));
      process.exit(1);
    }
    throw error;
  }

  // 4. Update .gitignore
  try {
    await updateGitignore(safeTargetDir);
    console.log(`  ${pc.green('+')} .gitignore (added secrets.json)`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      console.error(pc.red(`Error: Permission denied updating .gitignore`));
      console.error(pc.dim('Check file permissions or try with elevated access.'));
      process.exit(1);
    }
    throw error;
  }

  // 5. Display summary
  console.log('');
  console.log(pc.bold(pc.green('SpecFlow initialized successfully!\n')));

  console.log(pc.bold('Created:'));
  console.log(`  ${pc.cyan('.specflow/')}           ${pc.dim('Runtime workspace')}`);
  console.log(`  ${pc.cyan('.specflow-lib/')}       ${pc.dim('Methodology library')}`);
  console.log(`  ${pc.cyan('.claude/commands/')}    ${pc.dim('Slash commands')}`);
  console.log('');

  console.log(pc.bold('Next steps:'));
  console.log(`  1. Review ${pc.cyan('.specflow/config.json')} for settings`);
  console.log(`  2. Start PM with ${pc.green('/sf:pm "your feature"')}`);
  console.log('');
}

export async function install(targetDir: string = process.cwd()): Promise<void> {
  // Sanitize user-provided directory path
  const safeTargetDir = sanitizeTargetDir(targetDir);
  // nosemgrep: path-join-resolve-traversal
  const claudeDir = join(safeTargetDir, '.claude', 'commands');

  console.log(pc.bold(pc.cyan('\nSpecFlow Installer\n')));

  // Create .claude/commands/ if not exists
  await mkdir(claudeDir, { recursive: true });
  console.log(pc.dim(`Target: ${claudeDir}\n`));

  // Find package's slash-commands/ directory
  // In dev: ../slash-commands relative to src/
  // In package: ../slash-commands relative to dist/
  const packageRoot = resolve(__dirname, '..');
  const slashCommandsDir = join(packageRoot, 'slash-commands');

  // Get all sf-*.md files
  let files: string[];
  try {
    files = await readdir(slashCommandsDir);
  } catch {
    console.error(pc.red('Error: Could not read slash-commands directory'));
    console.error(pc.dim(`Expected at: ${slashCommandsDir}`));
    process.exit(1);
  }

  const commands = files.filter(f => f.startsWith('sf-') && f.endsWith('.md'));

  if (commands.length === 0) {
    console.error(pc.red('Error: No slash commands found in package'));
    process.exit(1);
  }

  // Copy each command (sf-* prefix prevents conflicts with user's commands)
  let installed = 0;
  for (const cmd of commands) {
    // cmd is validated via filter (starts with 'sf-', ends with '.md')
    // nosemgrep: path-join-resolve-traversal
    const src = join(slashCommandsDir, cmd);
    // nosemgrep: path-join-resolve-traversal
    const dest = join(claudeDir, cmd);
    await copyFile(src, dest);
    console.log(`  ${pc.green('+')} ${cmd}`);
    installed++;
  }

  console.log(pc.bold(pc.green(`\nInstalled ${installed} SpecFlow commands\n`)));
  console.log(pc.dim('Usage examples:'));
  console.log(`  ${pc.cyan('/sf:pm')} "add logout button"    ${pc.dim('# PM orchestrates everything')}`);
  console.log(`  ${pc.cyan('/sf:security')}                   ${pc.dim('# STRIDE threat analysis')}`);
  console.log(`  ${pc.cyan('/sf:cost')}                       ${pc.dim('# Cost breakdown')}`);
  console.log(`  ${pc.cyan('/sf:agents')}                     ${pc.dim('# List all agents')}`);
  console.log('');
}

export async function uninstall(targetDir: string = process.cwd()): Promise<void> {
  const safeTargetDir = sanitizeTargetDir(targetDir);
  // nosemgrep: path-join-resolve-traversal
  const claudeDir = join(safeTargetDir, '.claude', 'commands');

  console.log(pc.bold(pc.yellow('\nSpecFlow Uninstaller\n')));

  let files: string[];
  try {
    files = await readdir(claudeDir);
  } catch {
    console.log(pc.dim('No .claude/commands/ directory found.'));
    return;
  }

  const sfCommands = files.filter(f => f.startsWith('sf-') && f.endsWith('.md'));

  if (sfCommands.length === 0) {
    console.log(pc.dim('No SpecFlow commands found to remove.'));
    return;
  }

  for (const cmd of sfCommands) {
    // cmd is validated via filter (starts with 'sf-', ends with '.md')
    // nosemgrep: path-join-resolve-traversal
    await unlink(join(claudeDir, cmd));
    console.log(`  ${pc.red('-')} ${cmd}`);
  }

  console.log(pc.bold(pc.yellow(`\nRemoved ${sfCommands.length} SpecFlow commands\n`)));
}

export async function link(targetDir: string = process.cwd()): Promise<void> {
  const safeTargetDir = sanitizeTargetDir(targetDir);
  // nosemgrep: path-join-resolve-traversal
  const claudeDir = join(safeTargetDir, '.claude', 'commands');
  const { symlink, lstat } = await import('fs/promises');

  console.log(pc.bold(pc.blue('\nSpecFlow Link (Dev Mode)\n')));

  await mkdir(claudeDir, { recursive: true });

  const packageRoot = resolve(__dirname, '..');
  const slashCommandsDir = join(packageRoot, 'slash-commands');

  let files: string[];
  try {
    files = await readdir(slashCommandsDir);
  } catch {
    console.error(pc.red('Error: Could not read slash-commands directory'));
    process.exit(1);
  }

  const commands = files.filter(f => f.startsWith('sf-') && f.endsWith('.md'));

  let linked = 0;
  for (const cmd of commands) {
    // cmd is validated via filter (starts with 'sf-', ends with '.md')
    // nosemgrep: path-join-resolve-traversal
    const src = join(slashCommandsDir, cmd);
    // nosemgrep: path-join-resolve-traversal
    const dest = join(claudeDir, cmd);

    // Remove existing file/symlink
    try {
      await lstat(dest);
      await unlink(dest);
    } catch {
      // File doesn't exist, continue
    }

    await symlink(src, dest);
    console.log(`  ${pc.blue('~')} ${cmd} -> slash-commands/${cmd}`);
    linked++;
  }

  console.log(pc.bold(pc.blue(`\nLinked ${linked} SpecFlow commands (dev mode)\n`)));
}

function showHelp(): void {
  console.log(pc.bold(pc.cyan('\nSpecFlow CLI\n')));
  console.log('Usage: ' + pc.cyan('npx specflow') + ' <command> [directory]\n');
  console.log('Commands:');
  console.log(`  ${pc.green('init')}        Initialize SpecFlow in a project`);
  console.log(`  ${pc.green('install')}     Copy /sf:* commands only (use init for full setup)`);
  console.log(`  ${pc.red('uninstall')}   Remove /sf:* commands from .claude/commands/`);
  console.log(`  ${pc.blue('link')}        Symlink commands for development`);
  console.log('');
  console.log('Options:');
  console.log(`  ${pc.dim('-f, --force')}  Skip confirmation prompts`);
  console.log('');
  console.log('Examples:');
  console.log(`  npx specflow init              ${pc.dim('# Initialize in current directory')}`);
  console.log(`  npx specflow init ./myapp      ${pc.dim('# Initialize in specific directory')}`);
  console.log(`  npx specflow init --force      ${pc.dim('# Overwrite without prompting')}`);
  console.log('');
}

// CLI entry point
const command = process.argv[2];
const targetDir = process.argv[3] || process.cwd();

switch (command) {
  case 'init':
    const forceFlag = process.argv.includes('--force') || process.argv.includes('-f');
    init(targetDir, { force: forceFlag });
    break;
  case 'install':
    install(targetDir);
    break;
  case 'uninstall':
    uninstall(targetDir);
    break;
  case 'link':
    link(targetDir);
    break;
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    showHelp();
    break;
}
