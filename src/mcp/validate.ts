import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import {
  PHASE_OUTPUT_MAP,
  VALID_PHASES,
  REQUIREMENT_COVERAGE_PHASES,
  MIN_CONTENT_LENGTH,
  SCOPE_CONTENT_THRESHOLDS,
  sanitizeSlug,
  type ValidationResponse,
} from './types.js';

/**
 * Validate the artifact output for a given phase.
 *
 */
export async function validateArtifact(
  phase: string,
  projectRoot: string,
  activeFeature: string | null,
  scope?: string | null,
): Promise<ValidationResponse | { error: string }> {
  if (!VALID_PHASES.has(phase)) {
    return { error: `Unknown phase: "${phase}"` };
  }

  if (!activeFeature) {
    return { error: 'No active feature' };
  }

  const outputFile = PHASE_OUTPUT_MAP[phase];
  if (!outputFile) {
    // Phases with no output (execution-routing, story-generation, etc.)
    return {
      valid: true,
      checks: { artifact_exists: true, content_quality: true },
      findings: [],
    };
  }

  const featureDir = join(projectRoot, '.specflow', 'features', sanitizeSlug(activeFeature)); // nosemgrep: path-join-resolve-traversal
  const artifactPath = join(featureDir, outputFile); // nosemgrep: path-join-resolve-traversal
  const findings: Array<{ type: string; id?: string; message: string }> = [];

  // Check 1: Artifact existence
  const exists = await fileExists(artifactPath);

  if (!exists) {
    return {
      valid: false,
      checks: { artifact_exists: false, content_quality: false },
      findings: [{ type: 'missing_artifact', message: `Expected output file not found: ${outputFile}` }],
    };
  }

  // Check 2: Content quality (scope-aware threshold)
  const content = await readFile(artifactPath, 'utf8');
  const nonHeaderContent = extractNonHeaderContent(content);
  const minLength = (scope && SCOPE_CONTENT_THRESHOLDS[scope]) || MIN_CONTENT_LENGTH;
  const contentQuality = nonHeaderContent.length >= minLength;

  if (!contentQuality) {
    findings.push({
      type: 'low_quality',
      message: `Artifact has insufficient non-header content (${nonHeaderContent.length} chars, minimum ${minLength})`,
    });
  }

  // Check 3: Requirement-ID coverage (phase-aware)
  let requirementCoverage: ValidationResponse['checks']['requirement_coverage'] = undefined;

  if (REQUIREMENT_COVERAGE_PHASES.has(phase)) {
    const lockPath = join(featureDir, '5-requirements-lock.md'); // nosemgrep: path-join-resolve-traversal

    try {
      const lockContent = await readFile(lockPath, 'utf8');
      const sourceIds = extractRequirementIds(lockContent);
      const referencedIds = extractRequirementIds(content);

      // Normalize both sets
      const normalizedSource = new Set(sourceIds.map(normalizeId));
      const normalizedRefs = new Set(referencedIds.map(normalizeId));

      const total = normalizedSource.size;
      const covered = [...normalizedSource].filter(id => normalizedRefs.has(id)).length;
      const missing = [...normalizedSource].filter(id => !normalizedRefs.has(id));

      requirementCoverage = {
        covered,
        total,
        missing,
        percentage: total > 0 ? Math.round((covered / total) * 100) : 100,
      };

      // Check 4: Cross-artifact consistency — flag invented IDs
      const inventedIds = [...normalizedRefs].filter(id => {
        // Only flag if it looks like a requirement ID but isn't in source
        return !normalizedSource.has(id) && /^(FR|AC|TC|SC)-\d+$/.test(id);
      });

      for (const id of inventedIds) {
        findings.push({
          type: 'unknown_reference',
          id,
          message: `Referenced identifier not found in requirements-lock`,
        });
      }
    } catch {
      // requirements-lock doesn't exist
      findings.push({
        type: 'missing_requirements_lock',
        message: '5-requirements-lock.md not found — requirement coverage check skipped',
      });
      requirementCoverage = null;
    }
  }

  const valid = contentQuality && findings.filter(f => f.type !== 'missing_requirements_lock').length === 0;

  return {
    valid,
    checks: {
      artifact_exists: true,
      content_quality: contentQuality,
      requirement_coverage: requirementCoverage,
    },
    findings,
  };
}

/**
 * Extract non-header content from markdown (strip lines starting with #).
 */
function extractNonHeaderContent(content: string): string {
  return content
    .split('\n')
    .filter(line => !line.startsWith('#'))
    .join('\n')
    .trim();
}

/**
 * Extract requirement IDs (FR-*, AC-*, TC-*, SC-*) from text.
 */
function extractRequirementIds(content: string): string[] {
  const regex = /\b(FR|AC|TC|SC)-(\d+)\b/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[0]);
  }
  return ids;
}

/**
 * Normalize a requirement ID to zero-padded format.
 * FR-1 → FR-01, FR-01 → FR-01
 */
function normalizeId(id: string): string {
  const match = id.match(/^(FR|AC|TC|SC)-(\d+)$/);
  if (!match) return id;
  const num = parseInt(match[2], 10);
  return `${match[1]}-${num.toString().padStart(2, '0')}`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
