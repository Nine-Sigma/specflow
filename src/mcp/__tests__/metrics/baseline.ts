import { readFile } from 'fs/promises';
import { join } from 'path';
import type { TestRunReport } from './harness.js';

const BASELINE_PATH = join('test-results', 'baseline.json');

export interface BaselineComparison {
  passed: boolean;
  warnings: string[];
  failures: string[];
}

/**
 * Load baseline.json from test-results/.
 * Returns null if baseline doesn't exist yet.
 */
export async function loadBaseline(): Promise<TestRunReport | null> {
  try {
    const content = await readFile(BASELINE_PATH, 'utf8');
    return JSON.parse(content) as TestRunReport;
  } catch {
    return null;
  }
}

/**
 * Compare a current test run against the baseline.
 *
 * Thresholds:
 * - Context sizes: warn if >10% growth from baseline
 * - Accuracy rate: fail if drops below 0.85
 * - Truncation events: warn if new truncation events appear
 * - Timing: informational only (too noisy for hard thresholds)
 */
export function compareToBaseline(
  current: TestRunReport,
  baseline: TestRunReport,
): BaselineComparison {
  const warnings: string[] = [];
  const failures: string[] = [];

  // Context size regression check (+10%)
  if (baseline.summary.avgContextSize > 0) {
    const growth =
      (current.summary.avgContextSize - baseline.summary.avgContextSize) /
      baseline.summary.avgContextSize;
    if (growth > 0.1) {
      warnings.push(
        `Context size grew ${(growth * 100).toFixed(1)}% ` +
          `(${baseline.summary.avgContextSize} → ${current.summary.avgContextSize})`,
      );
    }
  }

  if (baseline.summary.maxContextSize > 0) {
    const maxGrowth =
      (current.summary.maxContextSize - baseline.summary.maxContextSize) /
      baseline.summary.maxContextSize;
    if (maxGrowth > 0.1) {
      warnings.push(
        `Max context size grew ${(maxGrowth * 100).toFixed(1)}% ` +
          `(${baseline.summary.maxContextSize} → ${current.summary.maxContextSize})`,
      );
    }
  }

  // Accuracy rate drop check
  if (current.summary.avgAccuracyRate < 0.85) {
    failures.push(
      `Accuracy rate dropped below 0.85: ${current.summary.avgAccuracyRate.toFixed(2)} ` +
        `(baseline: ${baseline.summary.avgAccuracyRate.toFixed(2)})`,
    );
  }

  // New truncation events check
  if (current.summary.truncationEvents > baseline.summary.truncationEvents) {
    const newEvents =
      current.summary.truncationEvents - baseline.summary.truncationEvents;
    warnings.push(
      `${newEvents} new truncation event(s) detected ` +
        `(${baseline.summary.truncationEvents} → ${current.summary.truncationEvents})`,
    );
  }

  // Per-test context size checks
  for (const currentTest of current.tests) {
    const baselineTest = baseline.tests.find(t => t.name === currentTest.name);
    if (!baselineTest) continue;

    const currentSize = currentTest.contextSizes.total ?? 0;
    const baselineSize = baselineTest.contextSizes.total ?? 0;

    if (baselineSize > 0 && currentSize > 0) {
      const testGrowth = (currentSize - baselineSize) / baselineSize;
      if (testGrowth > 0.1) {
        warnings.push(
          `[${currentTest.name}] Context size grew ${(testGrowth * 100).toFixed(1)}% ` +
            `(${baselineSize} → ${currentSize})`,
        );
      }
    }
  }

  return {
    passed: failures.length === 0,
    warnings,
    failures,
  };
}
