/**
 * Skill Registry
 *
 * Manages skill registration and unregistration in agents.json.
 * Handles name collision detection and skill-specific metadata.
 */
import { readFile, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import type { SkillFrontmatter } from './types.js';
import { defaultAgents } from '../wrapper/agent-registry.js';

/**
 * Structure of agents.json file.
 */
interface AgentsJsonData {
  agents: Record<string, AgentEntry>;
  [key: string]: unknown;
}

/**
 * Agent entry in agents.json.
 */
interface AgentEntry {
  source: string;
  invoke: string;
  description?: string;
}

/**
 * Parse SKILL.md frontmatter and body content.
 *
 * @param content - Raw SKILL.md content
 * @returns Parsed frontmatter and body
 */
export function parseSkillMd(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  // Simple YAML parsing for frontmatter (handles key: value pairs)
  const frontmatter: SkillFrontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: string | boolean = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle boolean values
    if (value === 'true') value = true as unknown as string;
    if (value === 'false') value = false as unknown as string;

    (frontmatter as Record<string, unknown>)[key] = value;
  }

  return {
    frontmatter,
    body: match[2],
  };
}

/**
 * Load agents.json from current working directory.
 *
 * @returns Parsed agents.json data
 */
export async function loadAgentsJson(): Promise<AgentsJsonData> {
  const agentsPath = join(process.cwd(), 'agents.json');

  try {
    const content = await readFile(agentsPath, 'utf-8');
    return JSON.parse(content) as AgentsJsonData;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default structure
      return { agents: {} };
    }
    throw error;
  }
}

/**
 * Save agents.json to current working directory.
 *
 * @param data - Agents.json data to write
 */
export async function saveAgentsJson(data: AgentsJsonData): Promise<void> {
  const agentsPath = join(process.cwd(), 'agents.json');
  await writeFile(agentsPath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Register a skill in agents.json.
 *
 * Reads SKILL.md from the skill directory, extracts name and description,
 * and adds the skill to agents.json with source: 'skill'.
 *
 * @param skillDir - Path to the skill directory containing SKILL.md
 * @returns The skill name that was registered
 * @throws Error if name collision with non-skill agent, or SKILL.md missing/invalid
 */
export async function registerSkill(skillDir: string): Promise<string> {
  // Read SKILL.md
  // nosemgrep: path-join-resolve-traversal
  const skillMdPath = join(skillDir, 'SKILL.md');
  let content: string;

  try {
    content = await readFile(skillMdPath, 'utf-8');
  } catch {
    throw new Error(`SKILL.md not found at ${skillMdPath}`);
  }

  // Parse frontmatter
  const { frontmatter } = parseSkillMd(content);

  // Determine skill name
  const skillName = frontmatter.name || basename(skillDir);

  // Load agents.json
  const agentsJson = await loadAgentsJson();

  // Check for name collision with default agents (bmad, specflow)
  const defaultAgent = defaultAgents[skillName];
  if (defaultAgent) {
    throw new Error(
      `Cannot register skill "${skillName}": name collision with built-in agent (source: ${defaultAgent.source})`
    );
  }

  // Check for name collision with custom agents in agents.json
  const existingAgent = agentsJson.agents[skillName];
  if (existingAgent) {
    if (existingAgent.source !== 'skill') {
      throw new Error(
        `Cannot register skill "${skillName}": name collision with existing agent (source: ${existingAgent.source})`
      );
    }
    // Skill already exists - warn but allow overwrite (reinstall)
    console.warn(`Warning: Overwriting existing skill "${skillName}"`);
  }

  // Add skill entry
  agentsJson.agents[skillName] = {
    source: 'skill',
    invoke: skillDir,
    description: frontmatter.description || `Skill: ${skillName}`,
  };

  // Save agents.json
  await saveAgentsJson(agentsJson);

  return skillName;
}

/**
 * Unregister a skill from agents.json.
 *
 * Only removes entries with source: 'skill'. Non-skill agents cannot be
 * unregistered via this function for safety.
 *
 * @param skillName - Name of the skill to unregister
 * @returns true if skill was removed, false if not found or not a skill
 */
export async function unregisterSkill(skillName: string): Promise<boolean> {
  // Load agents.json
  const agentsJson = await loadAgentsJson();

  // Check if agent exists
  const existingAgent = agentsJson.agents[skillName];
  if (!existingAgent) {
    return false;
  }

  // Only unregister skills (not built-in or custom agents)
  if (existingAgent.source !== 'skill') {
    return false;
  }

  // Remove the entry
  delete agentsJson.agents[skillName];

  // Save agents.json
  await saveAgentsJson(agentsJson);

  return true;
}
