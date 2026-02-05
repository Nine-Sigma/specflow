/**
 * @fileoverview Sliding window rate limit algorithm using Redis sorted sets
 * STORY: 1-3-sliding-window
 *
 * Implements:
 * - TC-03: Sliding window algorithm with Redis sorted sets
 * - TC-04: Atomic Lua script for ZADD, ZREMRANGEBYSCORE, ZCARD
 * - TC-08: Uses millisecond precision timestamps
 * - TC-09: Redis TIME for server-side timestamps
 * - SC-05: Key expiration via PEXPIRE
 * - FR-05: Sliding window accurate rate limiting
 * - AC-05: Window boundary respected (no stale requests counted)
 * - AC-06: Request count is accurate within window
 */

import type Redis from 'ioredis';
import { randomUUID } from 'crypto';

/**
 * Result of a rate limit check
 * STORY: 1-3-sliding-window
 * AC-02: Returns allowed (boolean), remaining (number), resetAt (timestamp)
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * TTL buffer added to window duration for key expiration
 * AC-04: Key TTL set to window + 10s buffer
 */
const TTL_BUFFER_SECONDS = 10;

/**
 * Lua script for atomic sliding window rate limit check
 * STORY: 1-3-sliding-window
 * AC-01: Implements ZADD, ZREMRANGEBYSCORE, ZCARD atomically
 *
 * Keys: [rate_limit_key]
 * Args: [window_ms, limit, now_ms, request_id, ttl_ms]
 *
 * Returns: [allowed (0|1), remaining, reset_at_ms]
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local request_id = ARGV[4]
local ttl_ms = tonumber(ARGV[5])

-- Remove expired entries (requests older than window)
local window_start = now_ms - window_ms
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current requests in window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Allow request: add to sorted set with timestamp as score
  redis.call('ZADD', key, now_ms, request_id)
  redis.call('PEXPIRE', key, ttl_ms)
  -- Return: allowed=1, remaining after this request, reset time
  return {1, limit - count - 1, window_start + window_ms}
else
  -- Deny request: get oldest entry for accurate reset time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_at
  if oldest[2] then
    reset_at = tonumber(oldest[2]) + window_ms
  else
    reset_at = now_ms + window_ms
  end
  return {0, 0, reset_at}
end
`;

/**
 * Interface for the sliding window checker
 */
export interface SlidingWindowChecker {
  /**
   * Check if a request is allowed under rate limits
   *
   * @param identifier - User or IP identifier (e.g., 'user:123' or 'ip:1.2.3.4')
   * @param endpoint - API endpoint path (e.g., '/api/search')
   * @param limit - Maximum requests allowed in window
   * @param windowSeconds - Window duration in seconds
   * @returns Rate limit check result
   */
  checkRateLimit(
    identifier: string,
    endpoint: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult>;
}

/**
 * Extended Redis interface with custom command
 */
interface RedisWithSlidingWindow extends Redis {
  slidingWindowCheck(
    key: string,
    windowMs: number,
    limit: number,
    nowMs: number,
    requestId: string,
    ttlMs: number
  ): Promise<[number, number, number]>;
}

/**
 * Create a sliding window rate limit checker
 * STORY: 1-3-sliding-window
 *
 * @param redis - ioredis client instance
 * @returns SlidingWindowChecker instance
 */
export function createSlidingWindowChecker(redis: Redis): SlidingWindowChecker {
  // Register the custom Lua command
  // AC-01: Lua script implements ZADD, ZREMRANGEBYSCORE, ZCARD atomically
  redis.defineCommand('slidingWindowCheck', {
    numberOfKeys: 1,
    lua: SLIDING_WINDOW_LUA,
  });

  const extendedRedis = redis as RedisWithSlidingWindow;

  return {
    async checkRateLimit(
      identifier: string,
      endpoint: string,
      limit: number,
      windowSeconds: number
    ): Promise<RateLimitResult> {
      // AC-03: Key format is ratelimit:{identifier}:{endpoint}
      const key = `ratelimit:${identifier}:${endpoint}`;

      // Convert window to milliseconds
      const windowMs = windowSeconds * 1000;

      // AC-04: Key TTL set to window + 10s buffer
      const ttlMs = windowMs + TTL_BUFFER_SECONDS * 1000;

      // AC-05: Uses Redis TIME for timestamps (not local clock)
      const timeResult = await redis.time();
      const seconds = parseInt(timeResult[0], 10);
      const microseconds = parseInt(timeResult[1], 10);
      const nowMs = seconds * 1000 + Math.floor(microseconds / 1000);

      // Generate unique request ID
      const requestId = `${nowMs}:${randomUUID()}`;

      // Execute atomic Lua script
      const [allowed, remaining, resetAt] = await extendedRedis.slidingWindowCheck(
        key,
        windowMs,
        limit,
        nowMs,
        requestId,
        ttlMs
      );

      // AC-02: Returns allowed (boolean), remaining (number), resetAt (timestamp)
      return {
        allowed: allowed === 1,
        remaining,
        resetAt,
      };
    },
  };
}

/**
 * Utility to generate rate limit key
 * Exported for testing and external use
 *
 * @param identifier - User or IP identifier
 * @param endpoint - API endpoint path
 * @returns Redis key string
 */
export function generateRateLimitKey(identifier: string, endpoint: string): string {
  return `ratelimit:${identifier}:${endpoint}`;
}
