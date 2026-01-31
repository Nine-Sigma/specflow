/**
 * Skill Installer
 *
 * Parses name@owner/repo syntax and downloads skill directories from GitHub.
 * Uses gh CLI for authentication (avoids token management complexity).
 */
import { spawn } from 'child_process';
import { mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import pc from 'picocolors';
import type { SkillSpec } from './types.js';

/**
 * Parse skill specification string into structured SkillSpec.
 *
 * @param spec - Skill spec in format: name@owner/repo or name@owner/repo#ref
 * @returns Parsed SkillSpec with defaults applied
 * @throws Error if spec format is invalid
 *
 * @example
 * parseSkillSpec('pptx@anthropics/skills')
 * // { name: 'pptx', owner: 'anthropics', repo: 'skills', path: 'skills/pptx', ref: 'main' }
 *
 * parseSkillSpec('my-skill@org/repo#v1.0')
 * // { name: 'my-skill', owner: 'org', repo: 'repo', path: 'skills/my-skill', ref: 'v1.0' }
 */
export function parseSkillSpec(spec: string): SkillSpec {
  // Format: name@owner/repo or name@owner/repo#ref
  const atIndex = spec.indexOf('@');
  if (atIndex === -1) {
    throw new Error(
      `Invalid skill spec: "${spec}". Expected format: name@owner/repo or name@owner/repo#ref`
    );
  }

  const name = spec.slice(0, atIndex);
  const source = spec.slice(atIndex + 1);

  if (!name) {
    throw new Error(`Invalid skill spec: "${spec}". Skill name is required before @`);
  }

  // Parse source: owner/repo or owner/repo#ref
  const hashIndex = source.indexOf('#');
  const repoPath = hashIndex === -1 ? source : source.slice(0, hashIndex);
  const ref = hashIndex === -1 ? 'main' : source.slice(hashIndex + 1);

  const slashIndex = repoPath.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(
      `Invalid skill spec: "${spec}". Expected owner/repo format after @`
    );
  }

  const owner = repoPath.slice(0, slashIndex);
  const repo = repoPath.slice(slashIndex + 1);

  if (!owner || !repo) {
    throw new Error(
      `Invalid skill spec: "${spec}". Both owner and repo are required`
    );
  }

  if (ref === '') {
    throw new Error(
      `Invalid skill spec: "${spec}". Ref cannot be empty when # is used`
    );
  }

  return {
    name,
    owner,
    repo,
    path: `skills/${name}`,
    ref,
  };
}

/**
 * Execute gh CLI command and return stdout.
 *
 * @param args - Arguments to pass to gh command
 * @returns Promise resolving to stdout
 * @throws Error if command exits with non-zero code
 */
export async function execGh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`gh ${args.join(' ')} failed (exit ${code}): ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err: Error) => {
      reject(new Error(`Failed to spawn gh: ${err.message}`));
    });
  });
}

/**
 * GitHub API content item structure.
 */
interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  url: string;
  download_url: string | null;
}

/**
 * Download a skill directory from GitHub recursively.
 *
 * @param spec - Parsed skill specification
 * @param destDir - Destination directory to write files
 */
export async function downloadSkillDirectory(
  spec: SkillSpec,
  destDir: string
): Promise<void> {
  // Get directory contents via GitHub API
  const apiPath = `/repos/${spec.owner}/${spec.repo}/contents/${spec.path}?ref=${spec.ref}`;

  console.log(pc.dim(`  Fetching: ${spec.owner}/${spec.repo}/${spec.path}`));

  let result: string;
  try {
    result = await execGh(['api', apiPath]);
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('404')) {
      throw new Error(
        `Skill not found: ${spec.owner}/${spec.repo}/${spec.path} (ref: ${spec.ref})`
      );
    }
    throw error;
  }

  const contents: GitHubContentItem | GitHubContentItem[] = JSON.parse(result);

  // Create destination directory
  await mkdir(destDir, { recursive: true });

  // Handle single file vs directory response
  const items = Array.isArray(contents) ? contents : [contents];

  for (const item of items) {
    // nosemgrep: path-join-resolve-traversal
    const itemDest = join(destDir, item.name);

    if (item.type === 'file') {
      // Download file content via raw accept header
      console.log(pc.dim(`  Downloading: ${item.name}`));
      const fileContent = await execGh([
        'api',
        item.url,
        '-H',
        'Accept: application/vnd.github.raw',
      ]);
      await writeFile(itemDest, fileContent);
    } else if (item.type === 'dir') {
      // Recursively download subdirectory
      await downloadSkillDirectory(
        { ...spec, path: item.path },
        itemDest
      );
    }
  }
}

/**
 * Install a skill from GitHub to local .specflow/skills directory.
 *
 * @param spec - Skill spec string (e.g., "pptx@anthropics/skills")
 * @returns Path to installed skill directory
 * @throws Error if skill already exists or download fails
 */
export async function installSkill(spec: string): Promise<string> {
  const skillSpec = parseSkillSpec(spec);

  // nosemgrep: path-join-resolve-traversal
  const destDir = join(process.cwd(), '.specflow', 'skills', skillSpec.name);

  // Check if already installed (no auto-overwrite for safety)
  try {
    await stat(destDir);
    throw new Error(
      `Skill "${skillSpec.name}" already installed at ${destDir}. ` +
        `Remove it first with: rm -rf ${destDir}`
    );
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // ENOENT means directory doesn't exist, which is what we want
  }

  console.log(
    pc.bold(`\nInstalling skill: ${pc.cyan(skillSpec.name)}\n`)
  );
  console.log(pc.dim(`  Source: ${skillSpec.owner}/${skillSpec.repo}/${skillSpec.path}`));
  console.log(pc.dim(`  Ref: ${skillSpec.ref}`));
  console.log('');

  await downloadSkillDirectory(skillSpec, destDir);

  // Verify SKILL.md exists
  // nosemgrep: path-join-resolve-traversal
  const skillMdPath = join(destDir, 'SKILL.md');
  try {
    await stat(skillMdPath);
  } catch {
    throw new Error(
      `Invalid skill: SKILL.md not found in ${skillSpec.owner}/${skillSpec.repo}/${skillSpec.path}`
    );
  }

  console.log('');
  console.log(pc.green(`Installed to: ${destDir}`));

  return destDir;
}
