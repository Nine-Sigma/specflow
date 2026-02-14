import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import {
  PHASE_PERSONA_MAP,
  PHASE_EXPERTISE_MAP,
  PHASE_ARTIFACTS_MAP,
  PHASE_OUTPUT_MAP,
  VALID_PHASES,
  ARTIFACT_TRUNCATION_THRESHOLD,
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

  // Resolve output path
  const outputFile = PHASE_OUTPUT_MAP[phase] || '';
  const output_path = outputFile
    ? `.specflow/features/${activeFeature}/${outputFile}`
    : '';

  const response: ContextResponse = {
    persona: persona || '',
    expertise,
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
