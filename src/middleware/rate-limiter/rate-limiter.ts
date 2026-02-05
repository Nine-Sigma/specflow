/**
 * @fileoverview Express rate limiter middleware
 * STORY: 2-2-middleware, 2-3-headers, 3-1-fail-open, 3-2-admin-bypass
 * FIX: C-01, M-01, m-01 from review v1
 */

import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../lib/redis.js';
import { loadRateLimitConfig, getEndpointLimit, type RateLimitConfig } from '../../config/rate-limits.js';
import { createSlidingWindowChecker } from './sliding-window.js';
import { resolveIdentifier } from './identifier.js';

// FIX m-01: Proper typing for request with user
interface RateLimitRequest extends Request {
  user?: { id: string; roles?: string[] };
}

// Circuit breaker constants
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30000;

/**
 * Create rate limiter middleware
 * STORY: 2-2-middleware
 */
export function createRateLimiter(config?: RateLimitConfig) {
  const rateLimitConfig = config ?? loadRateLimitConfig();
  const redis = getRedisClient();
  const checker = createSlidingWindowChecker(redis);

  // FIX M-01: Move circuit breaker state into closure (per-instance)
  let consecutiveFailures = 0;
  let circuitOpen = false;
  let circuitOpenedAt = 0;

  return async (req: Request, res: Response, next: NextFunction) => {
    // FIX m-01: Cast to properly typed request
    const typedReq = req as RateLimitRequest;

    try {
      // 3-2-admin-bypass: Check admin bypass
      const userRoles = typedReq.user?.roles ?? [];
      if (rateLimitConfig.bypass.roles.some(role => userRoles.includes(role))) {
        res.set('X-RateLimit-Bypass', 'true');
        console.log(JSON.stringify({ level: 'info', msg: 'rate limit bypassed', user: typedReq.user?.id }));
        return next();
      }

      // 3-1-fail-open: Check circuit breaker
      if (circuitOpen) {
        if (Date.now() - circuitOpenedAt > CIRCUIT_RESET_MS) {
          circuitOpen = false;
          consecutiveFailures = 0;
        } else {
          return next(); // Fail open
        }
      }

      // FIX C-01: Pass trustedProxies from config to resolveIdentifier
      const identifier = resolveIdentifier(typedReq, {
        trustedProxies: rateLimitConfig.trustedProxies ?? [],
      });
      const endpoint = req.path;
      const { limit, window } = getEndpointLimit(endpoint, rateLimitConfig);

      // 1-3-sliding-window: Check rate limit
      const result = await checker.checkRateLimit(identifier, endpoint, limit, window);
      consecutiveFailures = 0; // Reset on success

      // 2-3-headers: Set rate limit headers
      res.set('X-RateLimit-Limit', String(limit));
      res.set('X-RateLimit-Remaining', String(result.remaining));
      res.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        console.log(JSON.stringify({
          level: 'warn',
          msg: 'rate limit exceeded',
          identifier,
          endpoint,
          limit,
          requestId: req.headers['x-request-id']
        }));
        return res.status(429).json({ error: 'Too Many Requests', retryAfter });
      }

      next();
    } catch (error) {
      // 3-1-fail-open: Handle Redis failures
      consecutiveFailures++;
      console.error(JSON.stringify({
        level: 'warn',
        msg: 'rate limiter fail-open',
        error: (error as Error).message,
        alert: true
      }));

      if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
        circuitOpen = true;
        circuitOpenedAt = Date.now();
        console.error(JSON.stringify({ level: 'error', msg: 'circuit breaker opened', alert: true }));
      }

      next(); // Fail open - allow request
    }
  };
}
