/**
 * @fileoverview E2E tests for rate limiter middleware
 * QA TICKET: qa-e2e
 * TEA SPECS: E2E-01 through E2E-05
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock Redis for E2E tests (would use testcontainers in real setup)
const mockRedisClient = {
  defineCommand: vi.fn(),
  slidingWindowCheck: vi.fn(),
  time: vi.fn().mockResolvedValue([String(Math.floor(Date.now() / 1000)), '0']),
  quit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('../../lib/redis.js', () => ({
  getRedisClient: vi.fn(() => mockRedisClient),
  closeRedisConnection: vi.fn(),
}));

vi.mock('../../config/rate-limits.js', () => ({
  loadRateLimitConfig: vi.fn(() => ({
    defaults: { limit: 100, window: 60 },
    endpoints: {
      '/api/search': { limit: 20, window: 60 },
    },
    bypass: { roles: ['admin'] },
  })),
  getEndpointLimit: vi.fn((endpoint: string) => {
    if (endpoint === '/api/search') return { limit: 20, window: 60 };
    return { limit: 100, window: 60 };
  }),
}));

describe('Rate Limiter E2E Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: allow requests with 50 remaining
    mockRedisClient.slidingWindowCheck.mockResolvedValue([1, 49, Date.now() + 60000]);

    app = express();

    // Simulate auth middleware that sets user
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer admin-token') {
        (req as any).user = { id: 'admin-1', roles: ['admin'] };
      } else if (authHeader === 'Bearer user-token') {
        (req as any).user = { id: 'user-123', roles: ['user'] };
      }
      next();
    });

    const { createRateLimiter } = await import('./rate-limiter.js');
    app.use(createRateLimiter());

    app.get('/api/data', (req, res) => res.json({ data: 'success' }));
    app.get('/api/search', (req, res) => res.json({ results: [] }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  /**
   * E2E-01: Successful Request with Headers
   * TEA: Given user with 50/100 requests used
   *      When they make a request to /api/data
   *      Then response includes proper headers
   */
  it('E2E-01: should include rate limit headers on successful request', async () => {
    mockRedisClient.slidingWindowCheck.mockResolvedValue([1, 49, Date.now() + 60000]);

    const res = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer user-token');

    // AC-10, AC-11, AC-12: Headers present
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBe('100');
    expect(res.headers['x-ratelimit-remaining']).toBe('49');
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  /**
   * E2E-02: Rate Limited Request
   * TEA: Given user with 100/100 requests used
   *      When they make request 101
   *      Then response is 429 with proper body
   */
  it('E2E-02: should return 429 when rate limit exceeded', async () => {
    // Simulate limit exceeded
    mockRedisClient.slidingWindowCheck.mockResolvedValue([0, 0, Date.now() + 30000]);

    const res = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer user-token');

    // AC-01, AC-02, AC-03: 429 response with proper body
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      error: 'Too Many Requests',
      retryAfter: expect.any(Number),
    });
    expect(res.headers['retry-after']).toBeDefined();
  });

  /**
   * E2E-03: Per-Endpoint Limit
   * TEA: Given /api/search configured with 20 req/60s limit
   *      When user exceeds search limit but not default
   *      Then 429 for search, 200 for data
   */
  it('E2E-03: should apply per-endpoint limits', async () => {
    // First call to /api/search - limit exceeded
    mockRedisClient.slidingWindowCheck
      .mockResolvedValueOnce([0, 0, Date.now() + 30000]) // search: blocked
      .mockResolvedValueOnce([1, 99, Date.now() + 60000]); // data: allowed

    const searchRes = await request(app)
      .get('/api/search')
      .set('Authorization', 'Bearer user-token');

    const dataRes = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer user-token');

    // AC-07, AC-09: Different limits per endpoint
    expect(searchRes.status).toBe(429);
    expect(dataRes.status).toBe(200);
  });

  /**
   * E2E-04: Admin Bypass
   * TEA: Given user with admin role
   *      When they exceed normal rate limits
   *      Then response is 200 with bypass header
   */
  it('E2E-04: should bypass rate limit for admin users', async () => {
    // Even if Redis would deny, admin bypasses
    mockRedisClient.slidingWindowCheck.mockResolvedValue([0, 0, Date.now() + 30000]);

    const res = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer admin-token');

    // AC-13, AC-14: Admin bypass
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-bypass']).toBe('true');
  });

  /**
   * E2E-05: Retry-After Accuracy
   * TEA: Given user receives 429 with Retry-After
   *      Then Retry-After header is integer seconds
   */
  it('E2E-05: should include accurate Retry-After header', async () => {
    const resetAt = Date.now() + 45000; // 45 seconds from now
    mockRedisClient.slidingWindowCheck.mockResolvedValue([0, 0, resetAt]);

    const res = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer user-token');

    // AC-04: Retry-After is integer seconds
    expect(res.status).toBe(429);
    const retryAfter = parseInt(res.headers['retry-after'], 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(45);
  });
});

describe('Rate Limiter Integration Tests', () => {
  /**
   * IT-03: Redis Failure - Circuit Breaker (Fail-Open)
   * TEA: Given Redis is unavailable, request should proceed
   */
  it('IT-03/ST-04: should fail-open when Redis fails', async () => {
    // Force Redis error
    mockRedisClient.slidingWindowCheck.mockRejectedValue(new Error('Connection refused'));

    const app = express();
    const { createRateLimiter } = await import('./rate-limiter.js');
    app.use(createRateLimiter());
    app.get('/api/data', (req, res) => res.json({ data: 'success' }));

    const res = await request(app).get('/api/data');

    // AC-17: Fail-open behavior
    expect(res.status).toBe(200);
  });
});
