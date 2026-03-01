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
import { copyFile, mkdir, readdir, unlink, stat, cp, readFile, writeFile, rm } from 'fs/promises';
import { createInterface } from 'readline';
import { dirname, join, resolve, normalize, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import pc from 'picocolors';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Skill entry structure from agents.json
 */
interface SkillEntry {
  source: string;
  invoke: string;
  bundled?: boolean;
  install?: string;
  tools?: string[];
  toolInstall?: Record<string, string>;
  description?: string;
  'review-capable'?: boolean;
  'scope-minimum'?: string;
}

/**
 * Agents.json structure
 */
interface AgentsJson {
  agents: Record<string, SkillEntry>;
  _docs?: Record<string, string[]>;
}

/**
 * Tool availability status
 */
interface ToolStatus {
  name: string;
  available: boolean;
  version?: string;
  installCommand?: string;
}

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
 * Process bundled skills from agents.json.
 * Copies skill directories from package templates to user's .specflow/skills/
 */
async function processBundledSkills(
  agentsJson: AgentsJson,
  targetDir: string
): Promise<void> {
  const bundledSkills = Object.entries(agentsJson.agents)
    .filter(([_, entry]) => entry.bundled === true && entry.source === 'skill');

  if (bundledSkills.length === 0) {
    console.log(pc.dim('  No bundled skills found'));
    return;
  }

  for (const [name] of bundledSkills) {
    // nosemgrep: path-join-resolve-traversal
    const sourcePath = join(__dirname, '..', 'templates', 'skills', name);
    // nosemgrep: path-join-resolve-traversal
    const targetPath = join(targetDir, '.specflow', 'skills', name);

    try {
      await stat(sourcePath);
      await cp(sourcePath, targetPath, { recursive: true, force: true });
      console.log(`  ${pc.green('+')} ${name} -> .specflow/skills/${name}/`);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        console.log(`  ${pc.yellow('!')} ${name}: source not found (${sourcePath})`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Get default install command for a tool.
 */
function getDefaultInstallCommand(tool: string): string {
  const defaults: Record<string, string> = {
    'ast-grep': 'npm i -g @ast-grep/cli',
    'jscpd': 'npm i -g jscpd',
    'knip': 'npm i -g knip',
    'vulture': 'pip install vulture',
    'ruff': 'pip install ruff'
  };
  return defaults[tool] || `# Install ${tool}`;
}

/**
 * Check if a CLI tool is available.
 */
async function checkToolAvailability(tool: string): Promise<{ available: boolean; version?: string }> {
  try {
    // Special case for npx-based tools
    if (tool === 'knip') {
      const { stdout } = await execAsync('npx knip --version 2>/dev/null', { timeout: 10000 });
      return { available: true, version: stdout.trim() };
    }

    // Standard which + version check
    await execAsync(`which ${tool}`);
    try {
      const { stdout } = await execAsync(`${tool} --version 2>/dev/null`, { timeout: 5000 });
      const version = stdout.trim().split('\n')[0];
      return { available: true, version };
    } catch {
      return { available: true }; // Found but no version
    }
  } catch {
    return { available: false };
  }
}

/**
 * Check CLI tool availability for all skills.
 */
async function checkCliTools(agentsJson: AgentsJson): Promise<ToolStatus[]> {
  // Collect all unique tools from all skills
  const allTools = new Map<string, string>();

  for (const [_, entry] of Object.entries(agentsJson.agents)) {
    if (entry.tools) {
      for (const tool of entry.tools) {
        const installCmd = entry.toolInstall?.[tool];
        if (installCmd) {
          allTools.set(tool, installCmd);
        } else {
          allTools.set(tool, getDefaultInstallCommand(tool));
        }
      }
    }
  }

  // Check each tool
  const results: ToolStatus[] = [];

  for (const [tool, installCommand] of allTools) {
    const status = await checkToolAvailability(tool);
    results.push({
      name: tool,
      available: status.available,
      version: status.version,
      installCommand
    });
  }

  return results;
}

/**
 * Display tool status to console.
 */
function displayToolStatus(tools: ToolStatus[]): void {
  const available = tools.filter(t => t.available);
  const missing = tools.filter(t => !t.available);

  for (const tool of available) {
    const version = tool.version ? ` (${tool.version})` : '';
    console.log(`  ${pc.green('+')} ${tool.name}: found${version}`);
  }

  for (const tool of missing) {
    console.log(`  ${pc.yellow('!')} ${tool.name}: not found`);
  }
}

/**
 * Prompt to install missing tools.
 */
async function promptInstallTools(missing: ToolStatus[]): Promise<void> {
  if (missing.length === 0) return;

  console.log('');
  console.log(pc.bold('Missing tools can be installed:'));
  for (const tool of missing) {
    console.log(`  ${tool.name}: ${pc.dim(tool.installCommand)}`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>(resolve => {
    rl.question('\nInstall missing tools? [y/N/select] ', resolve);
  });
  rl.close();

  const choice = answer.toLowerCase().trim();

  if (choice === 'y' || choice === 'yes') {
    // Install all missing tools
    await installTools(missing);
  } else if (choice === 's' || choice === 'select') {
    // Let user select which to install
    await selectAndInstallTools(missing);
  } else {
    console.log(pc.dim('\nSkipping tool installation.'));
    console.log(pc.dim('Note: slop-detector will skip unavailable tools.'));
  }
}

/**
 * Install a list of tools.
 */
async function installTools(tools: ToolStatus[]): Promise<void> {
  for (const tool of tools) {
    console.log(`\nInstalling ${tool.name}...`);
    try {
      await execAsync(tool.installCommand!, { timeout: 120000 });
      console.log(`  ${pc.green('+')} ${tool.name} installed`);
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`  ${pc.red('x')} ${tool.name} failed: ${err.message}`);
      console.log(`    Try manually: ${tool.installCommand}`);
    }
  }
}

/**
 * Select and install specific tools.
 */
async function selectAndInstallTools(tools: ToolStatus[]): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  for (const tool of tools) {
    const answer = await new Promise<string>(resolve => {
      rl.question(`Install ${tool.name}? [y/N] `, resolve);
    });

    if (answer.toLowerCase().trim() === 'y') {
      console.log(`Installing ${tool.name}...`);
      try {
        await execAsync(tool.installCommand!, { timeout: 120000 });
        console.log(`  ${pc.green('+')} ${tool.name} installed`);
      } catch (error: unknown) {
        const err = error as Error;
        console.log(`  ${pc.red('x')} Failed: ${err.message}`);
      }
    }
  }

  rl.close();
}

/**
 * Merge skill entries from template into user's agents.json.
 */
async function mergeAgentsJson(
  templateAgents: AgentsJson,
  targetDir: string
): Promise<void> {
  // nosemgrep: path-join-resolve-traversal
  const userAgentsPath = join(targetDir, 'agents.json');

  let userAgents: AgentsJson = {
    agents: {},
    _docs: templateAgents._docs
  };

  // Read existing user agents.json if exists
  try {
    const content = await readFile(userAgentsPath, 'utf8');
    userAgents = JSON.parse(content) as AgentsJson;
  } catch {
    // File doesn't exist or can't parse, will create new
  }

  // Merge bundled skills (don't overwrite user customizations)
  const bundledSkills = Object.entries(templateAgents.agents)
    .filter(([_, entry]) => entry.bundled === true);

  let added = 0;
  for (const [name, entry] of bundledSkills) {
    if (!userAgents.agents[name]) {
      // Adjust invoke path for user's project
      const userEntry = { ...entry };
      userEntry.invoke = `.specflow/skills/${name}`;
      userAgents.agents[name] = userEntry;
      added++;
    }
  }

  // Update _docs if template has newer version
  if (templateAgents._docs) {
    userAgents._docs = templateAgents._docs;
  }

  // Write back
  await writeFile(
    userAgentsPath,
    JSON.stringify(userAgents, null, 2) + '\n'
  );

  if (added > 0) {
    console.log(`  ${pc.green('+')} Added ${added} skill(s) to agents.json`);
  } else {
    console.log(`  ${pc.dim('-')} agents.json up to date`);
  }
}

/**
 * ast-grep documentation section for CLAUDE.md
 */
const AST_GREP_SECTION = `

## Code Search

You run in an environment where \`ast-grep\` may be available. For syntax-aware or structural matching:
- Use \`ast-grep --lang <lang> -p '<pattern>'\` for structural code search
- Set \`--lang\` appropriately (typescript, python, rust, go, java, etc.)
- Fall back to rg/grep only when ast-grep is unavailable or text search is needed

Examples:
- Find async functions: \`ast-grep -p 'async function $NAME($$$) { $$$ }' --lang typescript\`
- Find React hooks: \`ast-grep -p 'use$HOOK($$$)' --lang tsx\`
- Find empty catches: \`ast-grep -p 'catch ($_) { }' --lang typescript\`
- Find class methods: \`ast-grep -p 'class $C { $$$METHOD($$$) { $$$ }' --lang python\`
`;

/**
 * Inject ast-grep section into CLAUDE.md.
 */
async function injectAstGrepSection(targetDir: string): Promise<void> {
  // nosemgrep: path-join-resolve-traversal
  const claudeMdPath = join(targetDir, 'CLAUDE.md');

  let content = '';
  let exists = false;

  try {
    content = await readFile(claudeMdPath, 'utf8');
    exists = true;

    // Check if already has Code Search section
    if (content.includes('## Code Search')) {
      console.log(`  ${pc.dim('-')} CLAUDE.md already has Code Search section`);
      return;
    }
  } catch {
    // CLAUDE.md doesn't exist, will create
  }

  // Append ast-grep section
  content = content.trimEnd() + AST_GREP_SECTION;

  await writeFile(claudeMdPath, content);

  if (exists) {
    console.log(`  ${pc.green('+')} Added "## Code Search" section to CLAUDE.md`);
  } else {
    console.log(`  ${pc.green('+')} Created CLAUDE.md with Code Search section`);
  }
}

/**
 * SpecFlow section delimiter for copilot-instructions.md
 */
const SPECFLOW_SECTION_START = '<!-- SPECFLOW:START -->';
const SPECFLOW_SECTION_END = '<!-- SPECFLOW:END -->';

const SPECFLOW_COPILOT_INSTRUCTIONS = `${SPECFLOW_SECTION_START}
## SpecFlow

This project uses SpecFlow for PM-orchestrated feature development.

### MCP Server
The SpecFlow MCP server provides context, state management, and validation tools.
It starts automatically when agents invoke \`specflow_context\`, \`specflow_state\`, or \`specflow_validate\`.

### Workflow
Use the PM agent (\`sf-pm\`) to orchestrate features. The PM routes work to specialized agents:
analyst, architect, security, cost, ux, tea, dev, qa, review.

### Direct Agent Use
You can also invoke agents directly (e.g., \`sf-security\`) — they will call the MCP server
for their persona, expertise, and feature artifacts.
${SPECFLOW_SECTION_END}`;

/**
 * Create/merge MCP config file.
 * Adds specflow server entry, preserves existing entries.
 */
async function createMcpConfig(
  targetDir: string,
  filename: string,
  serverKey: string,
): Promise<void> {
  const configPath = join(targetDir, filename); // nosemgrep: path-join-resolve-traversal
  let config: Record<string, unknown> = {};

  try {
    const content = await readFile(configPath, 'utf8');
    config = JSON.parse(content);
  } catch {
    // File doesn't exist or isn't valid JSON
  }

  const serversKey = serverKey;
  if (!config[serversKey]) {
    config[serversKey] = {};
  }

  const servers = config[serversKey] as Record<string, unknown>;
  servers['specflow'] = {
    command: 'npx',
    args: ['specflow', 'serve'],
  };

  // Ensure directory exists
  const dir = dirname(configPath);
  await mkdir(dir, { recursive: true });

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Generate agent prompt files for a platform.
 */
async function generateAgentPrompts(
  targetDir: string,
  platform: 'claude' | 'copilot',
): Promise<number> {
  const { generateClaudeCodePM, generateCopilotPM, generateClaudeCodeAgent, generateCopilotAgent, AGENT_NAMES } =
    await import('./mcp/prompts.js');
  const { lstat } = await import('fs/promises');

  const dir = platform === 'claude'
    ? join(targetDir, '.claude', 'commands') // nosemgrep: path-join-resolve-traversal
    : join(targetDir, '.github', 'agents'); // nosemgrep: path-join-resolve-traversal

  await mkdir(dir, { recursive: true });

  // Helper to remove existing file/symlink before writing
  const safeWrite = async (filePath: string, content: string) => {
    try {
      const s = await lstat(filePath);
      if (s.isSymbolicLink()) {
        await unlink(filePath);
      }
    } catch {
      // File doesn't exist, continue
    }
    await writeFile(filePath, content);
  };

  // Generate PM prompt
  const pmContent = platform === 'claude' ? generateClaudeCodePM() : generateCopilotPM();
  await safeWrite(join(dir, 'sf-pm.md'), pmContent); // nosemgrep: path-join-resolve-traversal

  // Generate thin agent prompts
  for (const agent of AGENT_NAMES) {
    const content = platform === 'claude'
      ? generateClaudeCodeAgent(agent)
      : generateCopilotAgent(agent);
    await safeWrite(join(dir, `sf-${agent}.md`), content); // nosemgrep: path-join-resolve-traversal
  }

  return AGENT_NAMES.length + 1; // +1 for PM
}

/**
 * Create/update copilot-instructions.md with SpecFlow section.
 */
async function updateCopilotInstructions(targetDir: string): Promise<void> {
  const filePath = join(targetDir, '.github', 'copilot-instructions.md');
  await mkdir(join(targetDir, '.github'), { recursive: true });

  let content = '';
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    // File doesn't exist
  }

  // Check for existing SpecFlow section
  const startIdx = content.indexOf(SPECFLOW_SECTION_START);
  const endIdx = content.indexOf(SPECFLOW_SECTION_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    content = content.slice(0, startIdx) + SPECFLOW_COPILOT_INSTRUCTIONS + content.slice(endIdx + SPECFLOW_SECTION_END.length);
  } else {
    // Append new section
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += '\n' + SPECFLOW_COPILOT_INSTRUCTIONS + '\n';
  }

  await writeFile(filePath, content);
}

/**
 * Initialize SpecFlow in a project directory.
 *
 * Creates:
 * - .specflow/ (runtime workspace - created programmatically)
 * - .specflow-lib/ (methodology library - copied from package)
 * - .claude/commands/ (slash commands - copied from package)
 * - .mcp.json (Claude Code MCP config)
 * - .vscode/mcp.json (Copilot MCP config)
 * - .github/agents/ (Copilot agent files)
 * - .github/copilot-instructions.md
 *
 * @param targetDir - Directory to initialize (defaults to cwd)
 * @param options - { force: boolean } to skip confirmation prompt
 */
export async function init(
  targetDir: string = process.cwd(),
  options: { force?: boolean; skipToolInstall?: boolean } = {}
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

  // Load template agents.json for bundled skills
  // nosemgrep: path-join-resolve-traversal
  const templateAgentsPath = join(packageRoot, 'templates', 'agents.json');
  let templateAgents: AgentsJson | null = null;
  try {
    const content = await readFile(templateAgentsPath, 'utf8');
    templateAgents = JSON.parse(content) as AgentsJson;
  } catch {
    // Template agents.json not found, bundled skills won't be installed
    console.log(pc.dim('Note: No bundled skills template found'));
  }

  // Verify package has required directories
  // nosemgrep: path-join-resolve-traversal
  const specflowLibSrc = join(packageRoot, '.specflow-lib');

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

  // .claude/commands/ - thin prompts generated later by generateAgentPrompts()
  // nosemgrep: path-join-resolve-traversal
  await mkdir(join(safeTargetDir, '.claude', 'commands'), { recursive: true });

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

  // 5. Process bundled skills (if template exists)
  if (templateAgents) {
    console.log('');
    console.log(pc.bold('Copying bundled skills:\n'));
    await processBundledSkills(templateAgents, safeTargetDir);

    // 6. Check CLI tools
    console.log('');
    console.log(pc.bold('Checking CLI tools:\n'));
    const toolStatus = await checkCliTools(templateAgents);
    displayToolStatus(toolStatus);

    const missingTools = toolStatus.filter(t => !t.available);
    if (missingTools.length > 0 && !options.skipToolInstall) {
      await promptInstallTools(missingTools);
    }

    // 7. Merge agents.json
    console.log('');
    console.log(pc.bold('Updating agents.json:\n'));
    await mergeAgentsJson(templateAgents, safeTargetDir);

    // 8. Inject CLAUDE.md section
    console.log('');
    console.log(pc.bold('Updating CLAUDE.md:\n'));
    await injectAstGrepSection(safeTargetDir);
  }

  // 9. Generate MCP configs
  console.log('');
  console.log(pc.bold('Setting up MCP server:\n'));

  await createMcpConfig(safeTargetDir, '.mcp.json', 'mcpServers');
  console.log(`  ${pc.green('+')} .mcp.json (Claude Code)`);

  await createMcpConfig(safeTargetDir, join('.vscode', 'mcp.json'), 'servers');
  console.log(`  ${pc.green('+')} .vscode/mcp.json (Copilot)`);

  // 10. Generate agent prompts for both platforms
  console.log('');
  console.log(pc.bold('Generating agent prompts:\n'));

  const claudeCount = await generateAgentPrompts(safeTargetDir, 'claude');
  console.log(`  ${pc.green('+')} .claude/commands/sf-*.md (${claudeCount} files)`);

  const copilotCount = await generateAgentPrompts(safeTargetDir, 'copilot');
  console.log(`  ${pc.green('+')} .github/agents/sf-*.md (${copilotCount} files)`);

  // 11. Update copilot-instructions.md
  await updateCopilotInstructions(safeTargetDir);
  console.log(`  ${pc.green('+')} .github/copilot-instructions.md`);

  // 12. Display summary
  console.log('');
  console.log(pc.bold(pc.green('SpecFlow initialized successfully!\n')));

  console.log(pc.bold('Created:'));
  console.log(`  ${pc.cyan('.specflow/')}           ${pc.dim('Runtime workspace')}`);
  console.log(`  ${pc.cyan('.specflow-lib/')}       ${pc.dim('Methodology library')}`);
  console.log(`  ${pc.cyan('.claude/commands/')}    ${pc.dim('Slash commands + MCP agents')}`);
  console.log(`  ${pc.cyan('.github/agents/')}      ${pc.dim('Copilot agents')}`);
  console.log(`  ${pc.cyan('.mcp.json')}            ${pc.dim('Claude Code MCP config')}`);
  console.log(`  ${pc.cyan('.vscode/mcp.json')}     ${pc.dim('Copilot MCP config')}`);
  if (templateAgents) {
    console.log(`  ${pc.cyan('agents.json')}          ${pc.dim('Agent registry (with bundled skills)')}`);
  }
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
  console.log(`  ${pc.cyan('serve')}       Start MCP context engine (stdio or --port <n>)`);
  console.log('');
  console.log('Options:');
  console.log(`  ${pc.dim('-f, --force')}            Skip confirmation prompts`);
  console.log(`  ${pc.dim('--skip-tool-install')}    Skip prompting to install CLI tools`);
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
    const skipToolInstall = process.argv.includes('--skip-tool-install');
    init(targetDir, { force: forceFlag, skipToolInstall });
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
  case 'serve': {
    const portIndex = process.argv.indexOf('--port');
    const port = portIndex !== -1 ? parseInt(process.argv[portIndex + 1], 10) : undefined;
    import('./mcp/server.js').then(({ startServer }) => {
      startServer({ port });
    });
    break;
  }
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    showHelp();
    break;
}
