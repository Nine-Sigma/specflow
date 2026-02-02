/**
 * Review skill discovery and detection types
 * Phase 19: Skill Triggers + Content Detection
 */

export interface TriggerConfig {
  files?: string[];
  patterns?: string[];
}

export interface ReviewSkill {
  name: string;
  source: 'skill' | 'internal';
  path: string;
  triggers: TriggerConfig;
  scopeMinimum?: 'trivial' | 'small' | 'medium' | 'large' | 'complex';
  pillarBinding?: string;
}

export interface DetectionResult {
  skill: ReviewSkill;
  matched: boolean;
  matchReason: 'file_pattern' | 'code_pattern' | 'scope_minimum' | 'pillar_binding' | 'none';
  matchedPattern?: string;
  matchedFile?: string;
}

export interface DetectionContext {
  changedFiles: string[];
  fileContents: Map<string, string>;
  scope: 'trivial' | 'small' | 'medium' | 'large' | 'complex';
  selectedPillars: string[];
}

export interface DiscoveryResult {
  skills: ReviewSkill[];
  errors: Array<{ path: string; error: string }>;
}
