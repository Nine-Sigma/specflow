/**
 * Vitest global setup file that exports setup and teardown functions.
 * Setup cleans stale pending data and old reports; teardown produces the unified run report.
 */
import { cleanPending, cleanStaleReports, globalTeardown } from './registry.js';

export async function setup() {
  await cleanPending();
  await cleanStaleReports();
}

export function teardown() {
  return globalTeardown();
}
