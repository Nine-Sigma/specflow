/**
 * Skill Runner
 *
 * Parses SKILL.md files and executes skills through the agent system.
 * Handles frontmatter extraction and context injection per Phase 11 patterns.
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { SkillFrontmatter } from './types.js';
import type { AgentContext, AgentResult } from '../wrapper/agent-registry.js';

/**
 * Extended AgentResult with skill metadata for future use.
 */
export interface SkillResult extends AgentResult {
  metadata?: SkillFrontmatter;
}

/**
 * Parse SKILL.md content into frontmatter and body.
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed frontmatter (may be empty) and body content
 *
 * @example
 * parseSkillMd('---\nname: test\n---\nBody here')
 * // { frontmatter: { name: 'test' }, body: 'Body here' }
 */
export function parseSkillMd(content: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
  // Match YAML frontmatter: ---\n...\n---
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    // No frontmatter found - return empty and full content as body
    return {
      frontmatter: {},
      body: content,
    };
  }

  try {
    const frontmatter = parseYaml(match[1]) as SkillFrontmatter;
    return {
      frontmatter: frontmatter || {},
      body: match[2],
    };
  } catch {
    // YAML parse error - treat entire content as body
    return {
      frontmatter: {},
      body: content,
    };
  }
}

/**
 * Invoke a skill by reading its SKILL.md entry point.
 *
 * @param skillDir - Path to skill directory (contains SKILL.md)
 * @param context - Agent context with optional specflowContext
 * @returns AgentResult with skill content and metadata
 *
 * @example
 * invokeSkill('.specflow/skills/pptx', { specflowContext: '...' })
 */
export async function invokeSkill(
  skillDir: string,
  context: AgentContext
): Promise<SkillResult> {
  // nosemgrep: path-join-resolve-traversal
  const skillMdPath = join(skillDir, 'SKILL.md');

  let content: string;
  try {
    content = await readFile(skillMdPath, 'utf-8');
  } catch {
    return {
      success: false,
      error: `Failed to load skill: SKILL.md not found at ${skillMdPath}`,
    };
  }

  const { frontmatter, body } = parseSkillMd(content);

  // Build context block if specflowContext provided (per Phase 11 pattern)
  const contextBlock = context.specflowContext
    ? `<required_reading>\n${context.specflowContext}\n</required_reading>\n\n`
    : '';

  return {
    success: true,
    output: `${contextBlock}${body}`,
    metadata: frontmatter,
  };
}
