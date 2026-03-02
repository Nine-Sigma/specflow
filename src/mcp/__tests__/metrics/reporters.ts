import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { platform } from 'os';
import type { TestRunReport } from './harness.js';
import type { BaselineComparison } from './baseline.js';

const OUTPUT_DIR = 'test-results';

/**
 * Write a TestRunReport to test-results/ as per-run JSON.
 * Includes environment metadata (OS, Node version).
 */
export async function writeRunReport(report: TestRunReport): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `run-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  const output = {
    ...report,
    environment: {
      os: platform(),
      node: process.version,
      platform: process.env.CI ? 'ci' : 'local',
    },
  };

  await writeFile(filepath, JSON.stringify(output, null, 2));
  return filepath;
}

/**
 * Print a summary of the test run to console.
 */
export function printRunSummary(report: TestRunReport): void {
  const { summary } = report;
  console.log('\n--- E2E Test Metrics Summary ---');
  console.log(`  Total tests:       ${summary.totalTests}`);
  console.log(`  Avg context size:  ${summary.avgContextSize.toLocaleString()} chars`);
  console.log(`  Max context size:  ${summary.maxContextSize.toLocaleString()} chars`);
  console.log(`  Truncation events: ${summary.truncationEvents}`);
  console.log(`  Avg accuracy rate: ${(summary.avgAccuracyRate * 100).toFixed(1)}%`);
  console.log(`  Total duration:    ${summary.totalDurationMs}ms`);
  console.log('--------------------------------\n');
}

/**
 * Print baseline comparison results to console.
 */
export function printBaselineComparison(comparison: BaselineComparison): void {
  console.log('\n--- Baseline Comparison ---');

  if (comparison.failures.length === 0 && comparison.warnings.length === 0) {
    console.log('  All metrics within baseline thresholds.');
  }

  for (const warning of comparison.warnings) {
    console.log(`  [WARN] ${warning}`);
  }

  for (const failure of comparison.failures) {
    console.log(`  [FAIL] ${failure}`);
  }

  console.log(`  Result: ${comparison.passed ? 'PASSED' : 'FAILED'}`);
  console.log('---------------------------\n');
}
