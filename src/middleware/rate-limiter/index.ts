/**
 * @fileoverview Rate limiter middleware - main export
 * STORIES: 2-2-middleware, 2-3-headers, 3-1-fail-open, 3-2-admin-bypass
 */

export { createRateLimiter } from './rate-limiter.js';
export { resolveIdentifier } from './identifier.js';
export { createSlidingWindowChecker } from './sliding-window.js';
export type { RateLimitResult } from './sliding-window.js';
