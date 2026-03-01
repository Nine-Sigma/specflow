import { readFile, readdir, stat } from 'fs/promises';
import { join, isAbsolute } from 'path';
import {
  PHASE_PERSONA_MAP,
  PHASE_EXPERTISE_MAP,
  PHASE_METHODOLOGY_MAP,
  PHASE_ARTIFACTS_MAP,
  PHASE_OUTPUT_MAP,
  PHASE_SKILL_CAPABILITIES,
  VALID_PHASES,
  ARTIFACT_TRUNCATION_THRESHOLD,
  SKILLS_TOTAL_CAP,
  SCOPE_ORDER,
  UX_SCOPE_TIERS,
  sanitizeSlug,
  type ContextResponse,
} from './types.js';

/**
 * Assemble scoped context for a given phase.
 *
 * Loads persona, expertise files, and relevant artifacts from the project,
 * scoped to what the phase needs.
 */
export async function assembleContext(
  phase: string,
  projectRoot: string,
  activeFeature: string | null,
  scope: string | null,
): Promise<ContextResponse | { error: string; available_features?: string[] }> {
  // Validate phase
  if (!VALID_PHASES.has(phase)) {
    return {
      error: `Unknown phase: "${phase}". Valid phases: ${[...VALID_PHASES].join(', ')}`,
    };
  }

  // Resolve active feature
  if (!activeFeature) {
    const featuresDir = join(projectRoot, '.specflow', 'features'); // nosemgrep: path-join-resolve-traversal
    const available = await listFeatures(featuresDir);
    return {
      error: 'no_active_feature',
      available_features: available,
    };
  }

  const featureDir = join(projectRoot, '.specflow', 'features', sanitizeSlug(activeFeature)); // nosemgrep: path-join-resolve-traversal
  const warnings: Array<{ type: string; message: string }> = [];
  let truncated = false;

  // Load persona
  const personaFile = PHASE_PERSONA_MAP[phase];
  const persona = await loadFileContent(
    join(projectRoot, '.specflow-lib', 'personas', personaFile), // nosemgrep: path-join-resolve-traversal
  );

  // Load expertise
  const expertisePaths = PHASE_EXPERTISE_MAP[phase] || [];
  const expertise: string[] = [];
  for (const path of expertisePaths) {
    const fullPath = join(projectRoot, '.specflow-lib', 'expertise', path); // nosemgrep: path-join-resolve-traversal
    if (path.endsWith('/')) {
      // Load all .md files in directory
      const files = await loadDirectoryMarkdown(fullPath);
      expertise.push(...files);
    } else {
      const content = await loadFileContent(fullPath);
      if (content) expertise.push(content);
    }
  }

  // Load methodology
  const methodology: string[] = [];
  const methodologyFiles = getMethodologyFiles(phase, scope);
  for (const file of methodologyFiles) {
    const fullPath = join(projectRoot, '.specflow-lib', 'methodology', file); // nosemgrep: path-join-resolve-traversal
    const content = await loadFileContent(fullPath);
    if (content) {
      methodology.push(content);
    } else {
      warnings.push({
        type: 'methodology_missing',
        message: `Methodology file "${file}" not found at ${fullPath}`,
      });
    }
  }

  // Load artifacts
  const artifactNames = PHASE_ARTIFACTS_MAP[phase] || [];
  const artifacts: Record<string, string> = {};
  for (const name of artifactNames) {
    const artifactPath = join(featureDir, name); // nosemgrep: path-join-resolve-traversal
    const content = await loadFileContent(artifactPath);
    if (content) {
      if (content.length > ARTIFACT_TRUNCATION_THRESHOLD) {
        artifacts[name] = content.slice(0, ARTIFACT_TRUNCATION_THRESHOLD);
        truncated = true;
      } else {
        artifacts[name] = content;
      }
    } else {
      warnings.push({
        type: 'artifact_missing',
        message: `Expected artifact "${name}" not found at ${artifactPath}`,
      });
    }
  }

  // Load skills
  const agents = await loadAgentsJson(projectRoot);
  const matchedSkills = discoverPhaseSkills(agents, phase, scope);
  const skills: Array<{ name: string; content: string }> = [];
  let totalSkillSize = 0;

  for (const [name, entry] of matchedSkills) {
    if (totalSkillSize >= SKILLS_TOTAL_CAP) {
      warnings.push({
        type: 'skills_cap_reached',
        message: `Skills total cap (${SKILLS_TOTAL_CAP} chars) reached, skipping remaining skills`,
      });
      break;
    }

    const invokePath = entry.invoke as string;
    const content = await loadSkillContent(invokePath, projectRoot);
    if (content === null) {
      warnings.push({
        type: 'skill_missing',
        message: `SKILL.md not found for skill "${name}" at ${invokePath}`,
      });
      continue;
    }

    let skillContent = content;
    if (skillContent.length > ARTIFACT_TRUNCATION_THRESHOLD) {
      skillContent = skillContent.slice(0, ARTIFACT_TRUNCATION_THRESHOLD);
      truncated = true;
    }

    if (totalSkillSize + skillContent.length > SKILLS_TOTAL_CAP) {
      skillContent = skillContent.slice(0, SKILLS_TOTAL_CAP - totalSkillSize);
      truncated = true;
    }

    totalSkillSize += skillContent.length;
    skills.push({ name, content: skillContent });
  }

  // Resolve output path
  const outputFile = PHASE_OUTPUT_MAP[phase] || '';
  const output_path = outputFile
    ? `.specflow/features/${activeFeature}/${outputFile}`
    : '';

  const response: ContextResponse = {
    persona: persona || '',
    expertise,
    methodology,
    skills,
    artifacts,
    output_path,
    scope,
  };

  if (warnings.length > 0) response.warnings = warnings;
  if (truncated) response.truncated = true;

  return response;
}

/**
 * List available feature directories.
 */
async function listFeatures(featuresDir: string): Promise<string[]> {
  try {
    const entries = await readdir(featuresDir);
    const features: string[] = [];
    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      try {
        const s = await stat(join(featuresDir, entry)); // nosemgrep: path-join-resolve-traversal
        if (s.isDirectory()) features.push(entry);
      } catch {
        // skip
      }
    }
    return features;
  } catch {
    return [];
  }
}

/**
 * Load a file's content, returning null if not found.
 */
async function loadFileContent(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Load all .md files from a directory.
 */
async function loadDirectoryMarkdown(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    const results: string[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const content = await loadFileContent(join(dirPath, entry)); // nosemgrep: path-join-resolve-traversal
      if (content) results.push(content);
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Determine which methodology files to load for a phase,
 * applying scope-gated UX tiers when applicable.
 */
export function getMethodologyFiles(phase: string, scope: string | null): string[] {
  const files = PHASE_METHODOLOGY_MAP[phase];
  if (!files) return [];

  // UX phase uses scope-gated tiers
  if (phase === 'ux') {
    if (scope && scope in UX_SCOPE_TIERS) {
      return UX_SCOPE_TIERS[scope];
    }
    // null scope or trivial → load all (safe default)
    return files;
  }

  return files;
}

/**
 * Load and parse agents.json from the project root.
 * Returns the agents object, or an empty object if file is missing.
 */
export async function loadAgentsJson(
  projectRoot: string,
): Promise<Record<string, Record<string, unknown>>> {
  try {
    const content = await readFile(join(projectRoot, 'agents.json'), 'utf8'); // nosemgrep: path-join-resolve-traversal
    const parsed = JSON.parse(content);
    return (parsed.agents as Record<string, Record<string, unknown>>) || {};
  } catch {
    return {};
  }
}

/**
 * Discover skills that match a phase's capability requirements.
 * Filters agents.json entries by: source === "skill", not underscore-prefixed,
 * matching capability flag, and scope meets minimum.
 */
export function discoverPhaseSkills(
  agents: Record<string, Record<string, unknown>>,
  phase: string,
  scope: string | null,
): Array<[string, Record<string, unknown>]> {
  const requiredCaps = PHASE_SKILL_CAPABILITIES[phase];
  if (!requiredCaps || requiredCaps.length === 0) return [];

  const scopeIndex = scope ? SCOPE_ORDER.indexOf(scope as typeof SCOPE_ORDER[number]) : -1;

  return Object.entries(agents).filter(([name, entry]) => {
    // Skip disabled (underscore-prefixed) entries
    if (name.startsWith('_')) return false;

    // Must be a skill
    if (entry.source !== 'skill') return false;

    // Must have at least one matching capability flag
    const hasCapability = requiredCaps.some(cap => entry[cap] === true);
    if (!hasCapability) return false;

    // Check scope-minimum
    const scopeMin = entry['scope-minimum'] as string | undefined;
    if (scopeMin && scope) {
      const minIndex = SCOPE_ORDER.indexOf(scopeMin as typeof SCOPE_ORDER[number]);
      if (minIndex > scopeIndex) return false;
    }

    return true;
  });
}

/**
 * Load a skill's SKILL.md content, stripping frontmatter.
 * Resolves paths relative to project root or uses absolute paths directly.
 */
export async function loadSkillContent(
  skillPath: string,
  projectRoot: string,
): Promise<string | null> {
  const resolvedDir = isAbsolute(skillPath)
    ? skillPath
    : join(projectRoot, skillPath); // nosemgrep: path-join-resolve-traversal
  const skillFile = join(resolvedDir, 'SKILL.md'); // nosemgrep: path-join-resolve-traversal

  const content = await loadFileContent(skillFile);
  if (content === null) return null;

  return stripFrontmatter(content);
}

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return content;
  return content.slice(endIndex + 3).replace(/^\n+/, '');
}
