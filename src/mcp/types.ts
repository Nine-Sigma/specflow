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
  'codebase-analysis': ['synthesis/codebase-analysis.md', 'code-intelligence.md'],
  architect: ['architecture/', 'code-intelligence.md'],
  security: [],  // Security expertise is in methodology, not expertise dir
  cost: [],
  ux: [],  // UX methodology is in .specflow-lib/methodology/ux-*
  tea: ['testing/', 'code-intelligence.md'],
  synthesis: ['synthesis/', 'requirements/'],
  'execution-routing': [],
  'qa-tdd': ['testing/'],
  'story-generation': [],
  'dev-story': ['code-intelligence.md'],
  'checkpoint-dev': ['synthesis/requirements-lock.md', 'code-intelligence.md'],
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
  'codebase-analysis': ['0-scope.md'],
  architect: ['1-spec.md', '1.5-codebase-constraints.md'],
  security: ['1-spec.md', '2-architecture.md'],
  cost: ['2-architecture.md'],
  ux: ['1-spec.md', '2-architecture.md'],
  tea: ['1-spec.md', '1.5-codebase-constraints.md', '2-architecture.md', '3-security.md', '4-cost.md', '1.6-ux-design.md'],
  synthesis: ['1-spec.md', '1.5-codebase-constraints.md', '2-architecture.md', '3-security.md', '4-cost.md', '1.6-ux-design.md', '5-test-plan.md'],
  'execution-routing': ['5-test-plan.md', '5-requirements-lock.md'],
  'qa-tdd': ['5-test-plan.md', '5-requirements-lock.md'],
  'story-generation': ['5-requirements-lock.md', '2-architecture.md'],
  'dev-story': ['5-requirements-lock.md', '2-architecture.md', '1-spec.md'],
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

/**
 * Phase-to-methodology mapping.
 * Lists methodology file paths (relative to .specflow-lib/methodology/) for phases
 * that need domain framework files (separate from agent expertise).
 */
export const PHASE_METHODOLOGY_MAP: Record<string, string[]> = {
  triage: ['scope-assessment.md'],
  scope: ['scope-assessment.md'],
  security: ['stride-framework.md'],
  cost: ['cost-methodology.md'],
  ux: [
    'ux-accessibility.md',
    'ux-component-strategy.md',
    'ux-consistency-patterns.md',
    'ux-core-experience.md',
    'ux-design-systems.md',
    'ux-discovery.md',
    'ux-emotional-design.md',
    'ux-user-journeys.md',
    'ux-visual-foundation.md',
  ],
  brainstorm: ['brainstorming-techniques.md'],
};

/**
 * Phase-to-skill-capability mapping.
 * Maps workflow phases to the capability flags used to discover matching skills.
 */
export const PHASE_SKILL_CAPABILITIES: Record<string, string[]> = {
  review: ['review-capable'],
  security: ['security-capable'],
};

/** Scope ordering for scope comparison */
export const SCOPE_ORDER = ['trivial', 'small', 'medium', 'large', 'complex'] as const;

/** Maximum total skills payload size (chars) */
export const SKILLS_TOTAL_CAP = 50_000;

/**
 * UX methodology files loaded per scope tier.
 * Matches SpecFlow's proportional ceremony model.
 */
export const UX_SCOPE_TIERS: Record<string, string[]> = {
  trivial: [],
  small: ['ux-core-experience.md', 'ux-visual-foundation.md'],
  medium: [
    'ux-core-experience.md',
    'ux-visual-foundation.md',
    'ux-user-journeys.md',
    'ux-component-strategy.md',
  ],
  large: [
    'ux-accessibility.md',
    'ux-component-strategy.md',
    'ux-consistency-patterns.md',
    'ux-core-experience.md',
    'ux-design-systems.md',
    'ux-discovery.md',
    'ux-emotional-design.md',
    'ux-user-journeys.md',
    'ux-visual-foundation.md',
  ],
  complex: [
    'ux-accessibility.md',
    'ux-component-strategy.md',
    'ux-consistency-patterns.md',
    'ux-core-experience.md',
    'ux-design-systems.md',
    'ux-discovery.md',
    'ux-emotional-design.md',
    'ux-user-journeys.md',
    'ux-visual-foundation.md',
  ],
};

/**
 * Lookup mapping phase names to their scope-tier expertise maps.
 * Phases not in this map use PHASE_EXPERTISE_MAP directly.
 */
export const EXPERTISE_TIER_MAPS: Record<string, Record<string, string[]>> = {
  analyst: {
    trivial: [],
    small: ['requirements/'],
    medium: ['requirements/', 'synthesis/codebase-analysis.md'],
    large: ['requirements/', 'synthesis/codebase-analysis.md'],
    complex: ['requirements/', 'synthesis/codebase-analysis.md'],
  },
  tea: {
    trivial: [],
    small: ['testing/test-specification.md'],
    medium: ['testing/', 'code-intelligence.md'],
    large: ['testing/', 'code-intelligence.md'],
    complex: ['testing/', 'code-intelligence.md'],
  },
  architect: {
    trivial: [],
    small: ['architecture/validation-checklist.md'],
    medium: ['architecture/', 'code-intelligence.md'],
    large: ['architecture/', 'code-intelligence.md'],
    complex: ['architecture/', 'code-intelligence.md'],
  },
  'qa-tdd': {
    trivial: [],
    small: [],
    medium: ['testing/'],
    large: ['testing/'],
    complex: ['testing/'],
  },
  'qa-verify': {
    trivial: [],
    small: [],
    medium: ['testing/'],
    large: ['testing/'],
    complex: ['testing/'],
  },
};

/**
 * Phase-to-codebase enrichment mapping.
 * Maps phases to the codebase fields they receive, which artifact to extract
 * symbol references from, and whether auto-reindex is enabled.
 */
export interface PhaseCodebaseConfig {
  fields: Array<'scan' | 'symbols' | 'impact' | 'patterns'>;
  artifactSource?: string;  // artifact file to extract symbol references from
  autoReindex?: boolean;
}

export const PHASE_CODEBASE_MAP: Record<string, PhaseCodebaseConfig> = {
  'codebase-analysis': {
    fields: ['scan', 'symbols', 'patterns'],
  },
  architect: {
    fields: ['impact'],
    artifactSource: '1.5-codebase-constraints.md',
  },
  tea: {
    fields: ['impact'],
    artifactSource: '2-architecture.md',
  },
  'dev-story': {
    fields: ['impact'],
    artifactSource: '2-architecture.md',
  },
  'checkpoint-dev': {
    fields: ['impact'],
    artifactSource: '6-dev-output.md',
    autoReindex: true,
  },
  'drift-fix-dev': {
    fields: ['impact'],
    artifactSource: '6-dev-output.md',
  },
  'qa-verify': {
    fields: ['impact'],
    artifactSource: '6-dev-output.md',
  },
  'checkpoint-qa': {
    fields: ['impact'],
    artifactSource: '7-qa-output.md',
    autoReindex: true,
  },
  'drift-fix-qa': {
    fields: ['impact'],
    artifactSource: '7-qa-output.md',
  },
};

/**
 * Phase-to-secondary-outputs mapping.
 * Lists additional artifacts a phase produces beyond its primary output_path.
 */
export const PHASE_SECONDARY_OUTPUTS: Record<string, string[]> = {
  analyst: ['1.5-codebase-constraints.md'],
};

/** Phases that should run requirement-ID coverage checks */
export const REQUIREMENT_COVERAGE_PHASES = new Set([
  'dev-story',
  'qa-verify',
  'review',
]);

/**
 * Phase prerequisite mapping.
 * Lists phases that should be completed before entering each phase.
 * Advisory only — does not block transitions.
 */
export const PHASE_PREREQUISITES: Record<string, string[]> = {
  scope: ['triage'],
  analyst: ['scope'],
  'codebase-analysis': ['scope'],
  architect: ['analyst'],
  security: ['analyst'],
  cost: ['architect'],
  ux: ['analyst'],
  tea: ['architect'],
  synthesis: ['analyst', 'architect'],
  'execution-routing': ['synthesis'],
  'qa-tdd': ['synthesis'],
  'story-generation': ['synthesis'],
  'dev-story': ['synthesis'],
  'checkpoint-dev': ['dev-story'],
  'drift-fix-dev': ['checkpoint-dev'],
  'qa-verify': ['dev-story'],
  'checkpoint-qa': ['qa-verify'],
  'drift-fix-qa': ['checkpoint-qa'],
  review: ['qa-verify'],
};

/**
 * Phase-to-required-artifacts mapping.
 * Lists artifacts that MUST be present for a phase to proceed in strict mode.
 * Missing required artifacts produce errors (not warnings) when strict=true.
 */
export const PHASE_REQUIRED_ARTIFACTS: Record<string, string[]> = {
  'dev-story': ['5-requirements-lock.md'],
  'qa-verify': ['5-requirements-lock.md', '6-dev-output.md'],
  'checkpoint-dev': ['5-requirements-lock.md'],
  'checkpoint-qa': ['5-requirements-lock.md'],
  review: ['6-dev-output.md'],
};

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

/** Scope-aware content quality thresholds */
export const SCOPE_CONTENT_THRESHOLDS: Record<string, number> = {
  trivial: 50,
  small: 100,
  medium: 300,
  large: 500,
  complex: 500,
};

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
  methodology: string[];
  skills: Array<{ name: string; content: string }>;
  artifacts: Record<string, string>;
  output_path: string;
  secondary_outputs?: string[];
  scope: string | null;
  warnings?: Array<{ type: string; message: string }>;
  truncated?: boolean;
  codebase?: {
    scan?: import('./intel/types.js').TechStackSummary;
    symbols?: import('./intel/types.js').SymbolSummary[];
    impact?: import('./intel/types.js').ImpactSummary[];
    patterns?: import('./intel/types.js').PatternInfo[];
  };
  codebase_truncated?: boolean;
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
