import { writeFile, mkdir, readdir, readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { platform } from 'os';
import type { MetricsCollector, TestMetrics, TestRunReport } from './harness.js';
import { writeRunReport, printRunSummary, printBaselineComparison } from './reporters.js';
import { loadBaseline, compareToBaseline } from './baseline.js';

/**
 * Directory where test suites write pending collector data.
 * The globalTeardown reads from here and builds the unified report.
 */
const PENDING_DIR = join('test-results', '.pending');

/**
 * Register a collector by writing its metrics to the pending directory.
 * Works across forked processes since it uses the filesystem.
 */
export async function registerCollector(collector: MetricsCollector): Promise<void> {
  await mkdir(PENDING_DIR, { recursive: true });
  const metrics = collector.getMetrics();
  const filename = `${metrics.phase}-${metrics.scope ?? 'null'}-${metrics.fixture}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await writeFile(join(PENDING_DIR, filename), JSON.stringify(metrics, null, 2));
}

/**
 * Register multiple collectors at once.
 */
export async function registerCollectors(collectors: MetricsCollector[]): Promise<void> {
  await Promise.all(collectors.map(c => registerCollector(c)));
}

/**
 * Clean stale pending data from a previous run.
 * Called at global setup time to ensure a fresh start.
 */
export async function cleanPending(): Promise<void> {
  await rm(PENDING_DIR, { recursive: true, force: true });
}

/**
 * Clean stale reports from test-results/.
 * Keeps baseline.json + 3 most recent run-*.json, deletes everything else.
 */
export async function cleanStaleReports(): Promise<void> {
  const outputDir = 'test-results';
  let files: string[];
  try {
    files = await readdir(outputDir);
  } catch {
    return; // Directory doesn't exist yet
  }

  // Identify run report files (sorted by mtime, newest first)
  const runFiles: Array<{ name: string; mtime: number }> = [];
  const toDelete: string[] = [];

  for (const file of files) {
    if (file === 'baseline.json' || file === '.pending') continue;

    const filepath = join(outputDir, file);
    if (file.startsWith('run-') && file.endsWith('.json')) {
      try {
        const s = await stat(filepath);
        runFiles.push({ name: file, mtime: s.mtimeMs });
      } catch {
        toDelete.push(filepath);
      }
    } else if (file.endsWith('.json')) {
      // Individual collector exports — clean up
      toDelete.push(filepath);
    }
  }

  // Sort by mtime descending, keep 3 most recent
  runFiles.sort((a, b) => b.mtime - a.mtime);
  for (const rf of runFiles.slice(3)) {
    toDelete.push(join(outputDir, rf.name));
  }

  // Delete stale files
  for (const filepath of toDelete) {
    await rm(filepath, { force: true });
  }
}

/**
 * Global teardown function for vitest.e2e.config.ts.
 * Reads all pending collector data, builds a unified run report, and writes it.
 */
export async function globalTeardown(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(PENDING_DIR);
  } catch {
    return;
  }

  if (files.length === 0) return;

  const metrics: TestMetrics[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const content = await readFile(join(PENDING_DIR, file), 'utf8');
    metrics.push(JSON.parse(content) as TestMetrics);
  }

  if (metrics.length === 0) return;

  const report = buildRunReportFromMetrics(metrics);
  const filepath = await writeRunReport(report);
  printRunSummary(report);

  // Baseline comparison
  const baseline = await loadBaseline();
  if (baseline) {
    const comparison = compareToBaseline(report, baseline);
    printBaselineComparison(comparison);
  } else {
    console.log('\n  [INFO] No baseline.json found — skipping baseline comparison.');
    console.log('  Run tests and copy a run-*.json to test-results/baseline.json to enable.\n');
  }

  console.log(`Unified run report written to: ${filepath}`);

  await rm(PENDING_DIR, { recursive: true, force: true });
}

/**
 * Build a run report directly from deserialized TestMetrics.
 */
function buildRunReportFromMetrics(tests: TestMetrics[]): TestRunReport {
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
