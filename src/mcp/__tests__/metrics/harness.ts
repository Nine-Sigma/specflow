import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { platform, version as nodeVersion } from 'os';

/**
 * Performance timing metrics for individual operations.
 */
export interface TimingMetrics {
  contextAssemblyMs?: number;
  stateTransitionMs?: number;
  validationMs?: number;
  codebaseIndexMs?: number;
  impactAnalysisMs?: number;
  totalWorkflowMs?: number;
  [key: string]: number | undefined;
}

/**
 * Context size breakdown by component (chars).
 */
export interface ContextSizeMetrics {
  persona: number;
  expertise: number;
  methodology: number;
  artifacts: number;
  skills: number;
  codebase: number;
  total: number;
}

/**
 * Truncation event tracking.
 */
export interface TruncationMetrics {
  artifactsTruncated: boolean;
  skillsCapped: boolean;
  codebaseTruncated: boolean;
  impactTruncated: boolean;
  warnings: string[];
}

/**
 * Code intelligence accuracy measurements.
 */
export interface CodeIntelAccuracyMetrics {
  symbolsExpected: number;
  symbolsFound: number;
  precision: number;
  recall: number;
  accuracyRate: number; // F1 score: 2 * (precision * recall) / (precision + recall)
  falsePositives: number;
  missedSymbols: string[];
}

/**
 * Validation coverage metrics.
 */
export interface ValidationMetrics {
  requirementsCovered: number;
  requirementsTotal: number;
  coverageRate: number;
  unknownReferences: string[];
}

/**
 * Complete test metrics for a single test run entry.
 */
export interface TestMetrics {
  name: string;
  phase: string;
  scope: string | null;
  fixture: string;
  timing: TimingMetrics;
  contextSizes: Partial<ContextSizeMetrics>;
  truncation: Partial<TruncationMetrics>;
  codeIntelAccuracy: Partial<CodeIntelAccuracyMetrics>;
  validation: Partial<ValidationMetrics>;
  timestamp: string;
}

/**
 * Full run report structure written to test-results/.
 */
export interface TestRunReport {
  run_id: string;
  environment: {
    os: string;
    node: string;
    platform: 'ci' | 'local';
  };
  tests: TestMetrics[];
  summary: {
    totalTests: number;
    avgContextSize: number;
    maxContextSize: number;
    truncationEvents: number;
    avgAccuracyRate: number;
    totalDurationMs: number;
  };
}

/**
 * Lightweight metrics collector for E2E and integration tests.
 * Wraps test operations, captures timing/size data, and exports to JSON.
 */
export class MetricsCollector {
  private metrics: TestMetrics;
  private startTime: number;

  constructor(phase: string, scope: string | null = null, fixture = 'default', suite?: string) {
    this.startTime = Date.now();
    this.metrics = {
      name: suite
        ? `${suite}/${fixture !== 'default' ? fixture + '/' : ''}${phase}/${scope ?? 'null'}`
        : `${fixture !== 'default' ? fixture + '/' : ''}${phase}/${scope ?? 'null'}`,
      phase,
      scope,
      fixture,
      timing: {},
      contextSizes: {},
      truncation: {},
      codeIntelAccuracy: {},
      validation: {},
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Time an async operation and record it under the given key.
   */
  async time<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const elapsed = performance.now() - start;
    this.metrics.timing[key] = Math.round(elapsed * 100) / 100;
    return result;
  }

  /**
   * Record context size breakdown from a ContextResponse.
   */
  recordContextSizes(ctx: {
    persona?: string;
    expertise?: string[];
    methodology?: string[];
    artifacts?: Record<string, string>;
    skills?: Array<{ name: string; content: string }>;
    codebase?: unknown;
  }): void {
    const persona = ctx.persona?.length ?? 0;
    const expertise = ctx.expertise?.reduce((s, e) => s + e.length, 0) ?? 0;
    const methodology = ctx.methodology?.reduce((s, m) => s + m.length, 0) ?? 0;
    const artifacts = ctx.artifacts
      ? Object.values(ctx.artifacts).reduce((s, a) => s + a.length, 0)
      : 0;
    const skills = ctx.skills?.reduce((s, sk) => s + sk.content.length, 0) ?? 0;
    const codebase = ctx.codebase ? JSON.stringify(ctx.codebase).length : 0;

    this.metrics.contextSizes = {
      persona,
      expertise,
      methodology,
      artifacts,
      skills,
      codebase,
      total: persona + expertise + methodology + artifacts + skills + codebase,
    };
  }

  /**
   * Record code intelligence accuracy against a ground-truth manifest.
   */
  recordCodeIntelAccuracy(
    expected: string[],
    found: string[],
  ): void {
    const expectedSet = new Set(expected);
    const foundSet = new Set(found);

    const matched = expected.filter(s => foundSet.has(s));
    const missed = expected.filter(s => !foundSet.has(s));
    const falsePositives = found.filter(s => !expectedSet.has(s));

    const precision = found.length > 0 ? matched.length / found.length : 1;
    const recall = expected.length > 0 ? matched.length / expected.length : 1;
    const f1 = precision + recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    this.metrics.codeIntelAccuracy = {
      symbolsExpected: expected.length,
      symbolsFound: found.length,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      accuracyRate: Math.round(f1 * 1000) / 1000,
      falsePositives: falsePositives.length,
      missedSymbols: missed,
    };
  }

  /**
   * Record truncation events.
   */
  recordTruncation(data: Partial<TruncationMetrics>): void {
    this.metrics.truncation = { ...this.metrics.truncation, ...data };
  }

  /**
   * Record validation coverage.
   */
  recordValidation(data: Partial<ValidationMetrics>): void {
    this.metrics.validation = { ...this.metrics.validation, ...data };
  }

  /**
   * Get the collected metrics.
   */
  getMetrics(): TestMetrics {
    return { ...this.metrics };
  }

  /**
   * Export metrics to a JSON file in test-results/.
   */
  async export(outputDir = 'test-results'): Promise<string> {
    const totalMs = Date.now() - this.startTime;
    this.metrics.timing.totalWorkflowMs = totalMs;

    await mkdir(outputDir, { recursive: true });
    const filename = `${this.metrics.phase}-${this.metrics.scope ?? 'null'}-${Date.now()}.json`;
    const filepath = join(outputDir, filename);
    await writeFile(filepath, JSON.stringify(this.metrics, null, 2));
    return filepath;
  }
}

/**
 * Aggregate multiple MetricsCollector results into a TestRunReport.
 */
export function buildRunReport(collectors: MetricsCollector[]): TestRunReport {
  const tests = collectors.map(c => c.getMetrics());
  const contextSizes = tests
    .map(t => t.contextSizes.total ?? 0)
    .filter(s => s > 0);

  const accuracyRates = tests
    .map(t => t.codeIntelAccuracy.accuracyRate)
    .filter((r): r is number => r !== undefined);

  const truncationEvents = tests.filter(
    t =>
      t.truncation.artifactsTruncated ||
      t.truncation.skillsCapped ||
      t.truncation.codebaseTruncated ||
      t.truncation.impactTruncated,
  ).length;

  const totalDurationMs = tests.reduce(
    (s, t) => s + (t.timing.totalWorkflowMs ?? 0),
    0,
  );

  return {
    run_id: new Date().toISOString(),
    environment: {
      os: platform(),
      node: process.version,
      platform: process.env.CI ? 'ci' : 'local',
    },
    tests,
    summary: {
      totalTests: tests.length,
      avgContextSize:
        contextSizes.length > 0
          ? Math.round(contextSizes.reduce((a, b) => a + b, 0) / contextSizes.length)
          : 0,
      maxContextSize: contextSizes.length > 0 ? Math.max(...contextSizes) : 0,
      truncationEvents,
      avgAccuracyRate:
        accuracyRates.length > 0
          ? Math.round((accuracyRates.reduce((a, b) => a + b, 0) / accuracyRates.length) * 100) / 100
          : 1,
      totalDurationMs: Math.round(totalDurationMs),
    },
  };
}
