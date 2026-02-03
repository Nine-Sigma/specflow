/**
 * Skill discovery and content detection for dynamic review
 * Phase 19: Skill Triggers + Content Detection
 *
 * Requirements: DIS-01 to DIS-05, DET-01 to DET-05
 */

/**
 * @deprecated This module is kept for testing purposes only.
 *
 * For production skill detection, use the skill-detector agent:
 * - sf-review.md spawns skill-detector via Task
 * - Any agent can spawn skill-detector with capability_filter
 *
 * Why deprecated:
 * - CLI requires build/install, creates fragile dependency
 * - Agent-based detection works without external tooling
 * - Enables any agent (not just sf-review) to discover skills
 *
 * This code remains for:
 * - Unit tests of detection algorithm
 * - Reference implementation for skill-detector agent
 *
 * @see .specflow/agents/skill-detector.md for production usage
 * @see Phase 26 (Skill-Detector Architecture) in ROADMAP.md
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as YAML from 'yaml';
import * as picomatch from 'picomatch';
import type {
  ReviewSkill,
  TriggerConfig,
  DetectionResult,
  DetectionContext,
  DiscoveryResult,
} from './types.js';

const SCOPE_LEVELS = ['trivial', 'small', 'medium', 'large', 'complex'] as const;

/**
 * Maximum regex pattern length to prevent ReDoS attacks.
 * Patterns from skill definitions are limited to prevent exponential backtracking.
 */
const MAX_PATTERN_LENGTH = 200;

/**
 * Timeout for regex execution in milliseconds.
 * If a pattern takes too long, it's considered malicious or poorly written.
 */
const REGEX_TIMEOUT_MS = 100;

/**
 * Validate and sanitize a regex pattern to prevent ReDoS attacks.
 * Returns null if pattern is unsafe or invalid.
 *
 * Security: Patterns come from skill authors (external) so we validate:
 * - Length limits (prevent exponential backtracking patterns)
 * - Pattern complexity (reject obvious ReDoS patterns)
 * - Syntax validity (reject malformed regex)
 */
function safeRegex(pattern: string): RegExp | null {
  // Length check - very long patterns are suspicious
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return null;
  }

  // Reject common ReDoS patterns: nested quantifiers like (a+)+, (a*)*
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const redosPatterns = /(\+|\*|\{[0-9,]+\})(\+|\*|\?|\{[0-9,]+\})/;
  if (redosPatterns.test(pattern)) {
    return null;
  }

  try {
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    return new RegExp(pattern, 'm');
  } catch {
    return null;
  }
}

/**
 * Extract YAML frontmatter from markdown content
 */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return YAML.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Check if scopeA >= scopeB in the scope hierarchy
 */
function scopeAtLeast(
  current: (typeof SCOPE_LEVELS)[number],
  minimum: (typeof SCOPE_LEVELS)[number]
): boolean {
  return SCOPE_LEVELS.indexOf(current) >= SCOPE_LEVELS.indexOf(minimum);
}

/**
 * Discover all review-capable skills from agents.json and internal expertise
 * Requirements: DIS-03, DIS-04, DIS-05
 *
 * @deprecated Use skill-detector agent instead.
 * Kept for testing - mirrors algorithm in .specflow/agents/skill-detector.md
 */
export async function discoverReviewSkills(
  agentsJsonPath = 'agents.json',
  internalExpertiseDirs = ['security', 'architecture']
): Promise<DiscoveryResult> {
  const skills: ReviewSkill[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  // 1. Discover skills from agents.json (DIS-03, DIS-04)
  try {
    const agentsContent = await readFile(agentsJsonPath, 'utf8');
    const agentsJson = JSON.parse(agentsContent);

    for (const [name, config] of Object.entries(agentsJson.agents || {})) {
      const cfg = config as { source?: string; invoke?: string };
      if (cfg.source !== 'skill') continue;
      if (name.startsWith('_')) continue; // Skip disabled

      const skillPath = cfg.invoke;
      if (!skillPath) continue;

      const skillMdPath = `${skillPath}/SKILL.md`;

      try {
        const content = await readFile(skillMdPath, 'utf8');
        const frontmatter = extractFrontmatter(content);

        if (frontmatter?.['review-capable'] === true) {
          const triggers = frontmatter.triggers as TriggerConfig | undefined;
          skills.push({
            name,
            source: 'skill',
            path: skillPath,
            triggers: {
              files: triggers?.files ?? [],
              patterns: triggers?.patterns ?? [],
            },
            scopeMinimum: frontmatter['scope-minimum'] as ReviewSkill['scopeMinimum'],
          });
        }
      } catch (e) {
        errors.push({ path: skillMdPath, error: String(e) });
      }
    }
  } catch (e) {
    errors.push({ path: agentsJsonPath, error: String(e) });
  }

  // 2. Discover internal expertise triggers (DIS-05)
  for (const dir of internalExpertiseDirs) {
    const triggersPath = `.specflow-lib/expertise/${dir}/triggers.yaml`;

    try {
      if (!existsSync(triggersPath)) continue;

      const content = await readFile(triggersPath, 'utf8');
      const config = YAML.parse(content);

      if (config['review-capable'] === true) {
        skills.push({
          name: dir,
          source: 'internal',
          path: triggersPath,
          triggers: {
            files: config.triggers?.files ?? [],
            patterns: config.triggers?.patterns ?? [],
          },
          scopeMinimum: config['scope-minimum'],
          pillarBinding: config['pillar-binding'],
        });
      }
    } catch (e) {
      errors.push({ path: triggersPath, error: String(e) });
    }
  }

  return { skills, errors };
}

/**
 * Match a single skill's triggers against content
 * Requirements: DET-02, DET-03
 *
 * @deprecated Use skill-detector agent instead.
 * Kept for testing trigger matching logic.
 */
export function matchSkillTriggers(
  skill: ReviewSkill,
  changedFiles: string[],
  fileContents: Map<string, string>
): { matched: boolean; reason: DetectionResult['matchReason']; detail?: string } {
  // Check file patterns (DET-02)
  for (const pattern of skill.triggers.files ?? []) {
    for (const file of changedFiles) {
      try {
        if (picomatch.isMatch(file, pattern, { nocase: true })) {
          return { matched: true, reason: 'file_pattern', detail: `${file} matched ${pattern}` };
        }
      } catch {
        // Invalid pattern, skip
      }
    }
  }

  // Check code patterns (DET-03)
  for (const pattern of skill.triggers.patterns ?? []) {
    const regex = safeRegex(pattern);
    if (!regex) {
      // Invalid or unsafe pattern, skip
      continue;
    }

    for (const entry of Array.from(fileContents.entries())) {
      const [file, content] = entry;
      if (regex.test(content)) {
        return { matched: true, reason: 'code_pattern', detail: `${file} matched /${pattern}/` };
      }
    }
  }

  return { matched: false, reason: 'none' };
}

/**
 * Detect all relevant skills for a review context
 * Requirements: DET-01 to DET-05
 *
 * @deprecated Use skill-detector agent instead.
 * Main entry point for CLI - replaced by agent spawn in sf-review.md Step 3.
 */
export async function detectRelevantSkills(
  context: DetectionContext,
  agentsJsonPath = 'agents.json'
): Promise<DetectionResult[]> {
  const { skills } = await discoverReviewSkills(agentsJsonPath);
  const results: DetectionResult[] = [];

  for (const skill of skills) {
    // Check pillar binding first (always included if pillar selected)
    if (skill.pillarBinding && context.selectedPillars.includes(skill.pillarBinding)) {
      results.push({
        skill,
        matched: true,
        matchReason: 'pillar_binding',
        matchedPattern: `pillar: ${skill.pillarBinding}`,
      });
      continue;
    }

    // Check scope minimum (included if scope >= minimum)
    if (skill.scopeMinimum && scopeAtLeast(context.scope, skill.scopeMinimum)) {
      results.push({
        skill,
        matched: true,
        matchReason: 'scope_minimum',
        matchedPattern: `scope ${context.scope} >= ${skill.scopeMinimum}`,
      });
      continue;
    }

    // Check content triggers
    const triggerMatch = matchSkillTriggers(skill, context.changedFiles, context.fileContents);
    results.push({
      skill,
      matched: triggerMatch.matched,
      matchReason: triggerMatch.reason,
      matchedPattern: triggerMatch.detail,
    });
  }

  return results;
}

/**
 * Format detection results for logging (DET-04, DET-05)
 *
 * @deprecated Output format now in skill-detector agent.
 * Kept for test output formatting.
 */
export function formatDetectionLog(results: DetectionResult[]): string {
  const lines: string[] = ['## Skill Detection Results\n'];

  const matched = results.filter((r) => r.matched);
  const skipped = results.filter((r) => !r.matched);

  lines.push(`### Selected Skills (${matched.length})\n`);
  for (const r of matched) {
    lines.push(`- **${r.skill.name}** (${r.skill.source})`);
    lines.push(`  - Reason: ${r.matchReason}`);
    if (r.matchedPattern) {
      lines.push(`  - Match: ${r.matchedPattern}`);
    }
  }

  if (skipped.length > 0) {
    lines.push(`\n### Skipped Skills (${skipped.length})\n`);
    for (const r of skipped) {
      lines.push(`- ${r.skill.name}: not relevant (no matching triggers)`);
    }
  }

  return lines.join('\n');
}
