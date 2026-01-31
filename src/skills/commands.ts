/**
 * Skill CLI Command Handlers
 *
 * Implements install, list, and remove commands for skill management.
 * Provides colored output and proper error handling.
 */
import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import pc from 'picocolors';
import { installSkill } from './installer.js';
import { registerSkill, unregisterSkill, parseSkillMd } from './registry.js';
import { readFile } from 'fs/promises';

/**
 * Install a skill from GitHub.
 *
 * Downloads skill files, validates SKILL.md exists, and registers in agents.json.
 *
 * @param spec - Skill spec (e.g., "pptx@anthropics/skills")
 */
export async function installSkillCommand(spec: string): Promise<void> {
  console.log(pc.bold(`Installing skill: ${pc.cyan(spec)}...`));

  try {
    // Download skill from GitHub
    const destDir = await installSkill(spec);

    // Validate SKILL.md exists (installer already checks, but double-confirm)
    // nosemgrep: path-join-resolve-traversal
    const skillMdPath = join(destDir, 'SKILL.md');
    try {
      await stat(skillMdPath);
    } catch {
      throw new Error(`SKILL.md not found at ${destDir}. Invalid skill.`);
    }

    // Register in agents.json
    const skillName = await registerSkill(destDir);

    console.log('');
    console.log(pc.green('Success!') + ` Installed ${pc.bold(skillName)} to ${pc.dim(destDir)}`);
    console.log(pc.dim('Registered in agents.json'));
  } catch (err) {
    const error = err as Error;
    console.error(pc.red('Error:') + ` ${error.message}`);
    process.exit(1);
  }
}

/**
 * List all installed skills.
 *
 * Shows skill name, description, and entry point path for each installed skill.
 */
export async function listSkillsCommand(): Promise<void> {
  const skillsDir = join(process.cwd(), '.specflow', 'skills');

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory());

    if (skillDirs.length === 0) {
      console.log(pc.dim('No skills installed.'));
      return;
    }

    console.log(pc.bold('Installed skills:\n'));

    for (const dir of skillDirs) {
      const skillPath = join(skillsDir, dir.name);
      const skillMdPath = join(skillPath, 'SKILL.md');

      try {
        const content = await readFile(skillMdPath, 'utf-8');
        const { frontmatter } = parseSkillMd(content);
        const name = frontmatter.name || dir.name;
        const description = frontmatter.description || '(no description)';

        console.log(`  ${pc.green(name)}: ${pc.dim(description)}`);
        console.log(`    ${pc.dim('Entry:')} .specflow/skills/${dir.name}/SKILL.md`);
      } catch {
        // SKILL.md missing or unreadable
        console.log(`  ${pc.yellow(dir.name)}: ${pc.dim('(missing SKILL.md)')}`);
      }
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.log(pc.dim('No skills installed.'));
      return;
    }
    throw error;
  }
}

/**
 * Remove an installed skill.
 *
 * Unregisters from agents.json and deletes the skill directory.
 *
 * @param name - Name of the skill to remove
 */
export async function removeSkillCommand(name: string): Promise<void> {
  // nosemgrep: path-join-resolve-traversal
  const skillDir = join(process.cwd(), '.specflow', 'skills', name);

  // Check if skill directory exists
  try {
    await stat(skillDir);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.error(pc.red('Error:') + ` Skill "${name}" not found at ${skillDir}`);
      process.exit(1);
    }
    throw error;
  }

  try {
    // Unregister from agents.json
    const wasRemoved = await unregisterSkill(name);
    if (!wasRemoved) {
      console.log(pc.yellow('Warning:') + ` Skill "${name}" not found in agents.json (may have been manually removed)`);
    }

    // Remove skill directory
    await rm(skillDir, { recursive: true, force: true });

    console.log(pc.green('Removed skill:') + ` ${pc.bold(name)}`);
  } catch (err) {
    const error = err as Error;
    console.error(pc.red('Error:') + ` Failed to remove skill: ${error.message}`);
    process.exit(1);
  }
}
