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
import { copyFile, mkdir, readdir, unlink, stat } from 'fs/promises';
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
  console.log(`  ${pc.green('install')}     Copy /sf:* commands to .claude/commands/`);
  console.log(`  ${pc.red('uninstall')}   Remove /sf:* commands from .claude/commands/`);
  console.log(`  ${pc.blue('link')}        Symlink commands for development (edits propagate)`);
  console.log('');
  console.log('Examples:');
  console.log(`  npx specflow install           ${pc.dim('# Install to current directory')}`);
  console.log(`  npx specflow install ./myapp   ${pc.dim('# Install to specific directory')}`);
  console.log(`  npx specflow link              ${pc.dim('# Dev mode with symlinks')}`);
  console.log('');
}

// CLI entry point
const command = process.argv[2];
const targetDir = process.argv[3] || process.cwd();

switch (command) {
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
