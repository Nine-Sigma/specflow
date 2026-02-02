/**
 * Review CLI Command Handlers
 *
 * Implements the `sf review detect` command for dynamic skill detection.
 * Phase 20: Dynamic Review Orchestrator
 */
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { detectRelevantSkills, formatDetectionLog } from './detection.js';
import type { DetectionContext, DetectionResult } from './types.js';

type ScopeLevel = 'trivial' | 'small' | 'medium' | 'large' | 'complex';

interface DetectOptions {
  files?: string;
  scope?: string;
  pillars?: string;
  skills?: string;
}

interface DetectOutputMatch {
  name: string;
  source: 'skill' | 'internal';
  path: string;
  reason: string;
  detail?: string;
}

interface DetectOutput {
  matched: DetectOutputMatch[];
  skipped: string[];
  context: {
    files: number;
    scope: string;
    pillars: string[];
  };
  manual_override: boolean;
}

/**
 * Handle `sf review detect` command.
 *
 * Discovers review-capable skills and matches them against changed files.
 * Outputs JSON for prompt consumption.
 */
export async function reviewDetectCommand(options: DetectOptions): Promise<void> {
  const filesArg = options.files || '';
  const scope = (options.scope || 'medium') as ScopeLevel;
  const pillarsArg = options.pillars || '';
  const skillsOverride = options.skills;

  const changedFiles = filesArg.split(',').filter((f) => f.trim() !== '');
  const selectedPillars = pillarsArg.split(',').filter((p) => p.trim() !== '');

  // Manual override: skip detection, return specified skills
  if (skillsOverride) {
    const overrideSkills = skillsOverride.split(',').filter((s) => s.trim() !== '');
    const output: DetectOutput = {
      matched: overrideSkills.map((name) => ({
        name: name.trim(),
        source: 'skill' as const,
        path: `.specflow/skills/${name.trim()}/SKILL.md`,
        reason: 'manual_override',
        detail: 'Specified via --skills flag',
      })),
      skipped: [],
      context: {
        files: changedFiles.length,
        scope,
        pillars: selectedPillars,
      },
      manual_override: true,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Read file contents for pattern matching
  const fileContents = new Map<string, string>();
  for (const file of changedFiles) {
    try {
      const content = await readFile(file, 'utf8');
      fileContents.set(file, content);
    } catch {
      // Skip files that can't be read (may not exist)
    }
  }

  // Create detection context
  const context: DetectionContext = {
    changedFiles,
    fileContents,
    scope,
    selectedPillars,
  };

  // Run detection
  const results = await detectRelevantSkills(context);

  // Format output
  const matched = results.filter((r) => r.matched);
  const skipped = results.filter((r) => !r.matched);

  const output: DetectOutput = {
    matched: matched.map((r) => ({
      name: r.skill.name,
      source: r.skill.source,
      path: r.skill.path,
      reason: r.matchReason,
      detail: r.matchedPattern,
    })),
    skipped: skipped.map((r) => r.skill.name),
    context: {
      files: changedFiles.length,
      scope,
      pillars: selectedPillars,
    },
    manual_override: false,
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Review command group with detect subcommand
 */
export const reviewCommand = new Command('review')
  .description('Review orchestration commands');

reviewCommand
  .command('detect')
  .description('Detect relevant review skills for changed files')
  .option('--files <files>', 'Comma-separated list of changed files')
  .option('--scope <level>', 'Scope level (trivial|small|medium|large|complex)', 'medium')
  .option('--pillars <pillars>', 'Comma-separated list of selected pillars')
  .option('--skills <skills>', 'Manual override: comma-separated skill names (bypasses detection)')
  .action(reviewDetectCommand);
