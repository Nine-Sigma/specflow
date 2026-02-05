/**
 * Skill Plugin System Types
 *
 * Types for parsing skill specifications and SKILL.md frontmatter
 * following the Anthropic Agent Skills standard.
 */

/**
 * Parsed skill specification from name@owner/repo syntax.
 *
 * Formats supported:
 *   name@owner/repo           - Standard (path: skills/{name})
 *   name@owner/repo:path      - Custom path (path: path/{name})
 *   name@owner/repo#ref       - With git ref
 *   name@owner/repo:path#ref  - Custom path with ref
 *
 * Examples:
 *   pptx@anthropics/skills -> { name: 'pptx', owner: 'anthropics', repo: 'skills', path: 'skills/pptx', ref: 'main' }
 *   my-skill@org/repo#v2.0 -> { name: 'my-skill', owner: 'org', repo: 'repo', path: 'skills/my-skill', ref: 'v2.0' }
 *   code-review@wshobson/agents:plugins/developer-essentials/skills -> { ..., path: 'plugins/developer-essentials/skills/code-review' }
 */
export interface SkillSpec {
  /** Skill name (e.g., "pptx") */
  name: string;
  /** GitHub repository owner (e.g., "anthropics") */
  owner: string;
  /** GitHub repository name (e.g., "skills") */
  repo: string;
  /** Path within repository (default: "skills/{name}") */
  path: string;
  /** Git ref - branch, tag, or commit (default: "main") */
  ref: string;
}

/**
 * SKILL.md frontmatter fields per Anthropic Agent Skills standard.
 *
 * @see https://code.claude.com/docs/en/skills
 */
export interface SkillFrontmatter {
  /** Skill display name */
  name?: string;
  /** Human-readable description */
  description?: string;
  /** If true, skill cannot invoke Claude models */
  'disable-model-invocation'?: boolean;
  /** If true, user can invoke via slash command */
  'user-invocable'?: boolean;
  /** Comma-separated list of allowed tools */
  'allowed-tools'?: string;
  /** Model to use for skill execution */
  model?: string;
  /** Context mode - 'fork' creates isolated context */
  context?: 'fork';
  /** Agent that owns this skill */
  agent?: string;
  /** Hint shown when user types the command */
  'argument-hint'?: string;
}
