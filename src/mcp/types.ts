/**
 * Phase-to-persona lookup table.
 * Maps workflow phases to persona markdown files in .specflow-lib/personas/
 */
export const PHASE_PERSONA_MAP: Record<string, string> = {
  triage: 'pm.md',
  scope: 'pm.md',
  analyst: 'analyst.md',
  'codebase-analysis': 'analyst.md',
  architect: 'architect.md',
  security: 'security.md',
  cost: 'cost.md',
  ux: 'ux-designer.md',
  tea: 'pm.md',
  synthesis: 'pm.md',
  'execution-routing': 'pm.md',
  'qa-tdd': 'qa.md',
  'story-generation': 'pm.md',
  'dev-story': 'dev.md',
  'checkpoint-dev': 'pm.md',
  'drift-fix-dev': 'dev.md',
  'qa-verify': 'qa.md',
  'checkpoint-qa': 'pm.md',
  'drift-fix-qa': 'qa.md',
  review: 'pm.md',
  brainstorm: 'pm.md',
  complete: 'pm.md',
};

/**
 * Phase-to-expertise mapping.
 * Lists expertise file paths (relative to .specflow-lib/expertise/) for each phase.
 */
export const PHASE_EXPERTISE_MAP: Record<string, string[]> = {
  triage: ['scoping/', 'discovery/'],
  scope: ['scoping/'],
  analyst: ['requirements/', 'synthesis/codebase-analysis.md'],
  'codebase-analysis': ['synthesis/codebase-analysis.md'],
  architect: ['architecture/'],
  security: [],  // Security expertise is in methodology, not expertise dir
  cost: [],
  ux: [],  // UX methodology is in .specflow-lib/methodology/ux-*
  tea: ['testing/'],
  synthesis: ['synthesis/', 'requirements/'],
  'execution-routing': [],
  'qa-tdd': ['testing/'],
  'story-generation': [],
  'dev-story': [],
  'checkpoint-dev': ['synthesis/requirements-lock.md'],
  'drift-fix-dev': [],
  'qa-verify': ['testing/'],
  'checkpoint-qa': ['synthesis/requirements-lock.md'],
  'drift-fix-qa': [],
  review: ['review/'],
  brainstorm: [],
  complete: [],
};

/**
 * Phase-to-artifacts mapping.
 * Lists artifact files (relative to feature directory) each phase needs to read.
 */
export const PHASE_ARTIFACTS_MAP: Record<string, string[]> = {
  triage: [],
  scope: ['0-triage.md'],
  analyst: ['0-triage.md', '0-scope.md'],
  'codebase-analysis': ['0-scope.md', '1-spec.md'],
  architect: ['1-spec.md', '1.5-codebase-constraints.md'],
  security: ['1-spec.md', '2-architecture.md'],
  cost: ['2-architecture.md'],
  ux: ['1-spec.md', '2-architecture.md'],
  tea: ['1-spec.md', '1.5-codebase-constraints.md', '2-architecture.md', '3-security.md', '4-cost.md', '1.6-ux-design.md'],
  synthesis: ['1-spec.md', '1.5-codebase-constraints.md', '2-architecture.md', '3-security.md', '4-cost.md', '1.6-ux-design.md', '5-test-plan.md'],
  'execution-routing': ['5-test-plan.md', '5-requirements-lock.md'],
  'qa-tdd': ['5-test-plan.md', '5-requirements-lock.md'],
  'story-generation': ['5-requirements-lock.md', '2-architecture.md'],
  'dev-story': ['5-requirements-lock.md', '2-architecture.md'],
  'checkpoint-dev': ['5-requirements-lock.md', '6-dev-output.md'],
  'drift-fix-dev': ['drift/checkpoint-dev.md'],
  'qa-verify': ['5-test-plan.md', '6-dev-output.md'],
  'checkpoint-qa': ['5-requirements-lock.md', '7-qa-output.md'],
  'drift-fix-qa': ['drift/checkpoint-qa.md'],
  review: ['1-spec.md', '2-architecture.md', '3-security.md', '5-requirements-lock.md', '5-test-plan.md', '6-dev-output.md', '7-qa-output.md'],
  brainstorm: ['0-triage.md'],
  complete: [],
};

/**
 * Phase-to-output-path mapping.
 * Maps each phase to its output artifact filename (relative to feature directory).
 */
export const PHASE_OUTPUT_MAP: Record<string, string> = {
  triage: '0-triage.md',
  scope: '0-scope.md',
  analyst: '1-spec.md',
  'codebase-analysis': '1.5-codebase-constraints.md',
  architect: '2-architecture.md',
  security: '3-security.md',
  cost: '4-cost.md',
  ux: '1.6-ux-design.md',
  tea: '5-test-plan.md',
  synthesis: '5-requirements-lock.md',
  'execution-routing': '',
  'qa-tdd': '5-qa-tests.md',
  'story-generation': '',
  'dev-story': '6-dev-output.md',
  'checkpoint-dev': 'drift/checkpoint-dev.md',
  'drift-fix-dev': '',
  'qa-verify': '7-qa-output.md',
  'checkpoint-qa': 'drift/checkpoint-qa.md',
  'drift-fix-qa': '',
  review: '8-review-output.md',
  brainstorm: '0.3-brainstorm.md',
  complete: '',
};

/** Phases that should run requirement-ID coverage checks */
export const REQUIREMENT_COVERAGE_PHASES = new Set([
  'dev-story',
  'qa-verify',
  'review',
]);

/** All valid phase names */
export const VALID_PHASES = new Set(Object.keys(PHASE_PERSONA_MAP));

/**
 * Validate a feature slug or path segment to prevent path traversal.
 * Rejects '..' segments, absolute paths, and non-slug characters.
 */
export function sanitizeSlug(input: string): string {
  if (input.includes('..') || input.startsWith('/') || input.startsWith('\\')) {
    throw new Error(`Invalid slug: "${input}"`);
  }
  return input;
}

/** Maximum artifact size before truncation (chars) */
export const ARTIFACT_TRUNCATION_THRESHOLD = 30_000;

/** Minimum content length for quality check (non-header chars) */
export const MIN_CONTENT_LENGTH = 50;

/**
 * Workflow state persisted to workflow-state.json
 */
export interface WorkflowState {
  feature: string;
  description: string;
  phase: string | null;
  last_agent: string | null;
  scope: string | null;
  pillars: string[];
  completed_phases: string[];
  last_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Context response from specflow_context tool
 */
export interface ContextResponse {
  persona: string;
  expertise: string[];
  artifacts: Record<string, string>;
  output_path: string;
  scope: string | null;
  warnings?: Array<{ type: string; message: string }>;
  truncated?: boolean;
}

/**
 * Validation response from specflow_validate tool
 */
export interface ValidationResponse {
  valid: boolean;
  checks: {
    artifact_exists: boolean;
    content_quality: boolean;
    requirement_coverage?: {
      covered: number;
      total: number;
      missing: string[];
      percentage: number;
    } | null;
  };
  findings: Array<{ type: string; id?: string; message: string }>;
}
