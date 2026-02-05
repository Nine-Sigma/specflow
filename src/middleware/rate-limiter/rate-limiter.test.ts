/**
 * @fileoverview Tests for rate limiter middleware
 * STORIES: 2-2-middleware, 2-3-headers, 3-1-fail-open, 3-2-admin-bypass
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../lib/redis.js', () => ({
  getRedisClient: vi.fn(() => ({
    defineCommand: vi.fn(),
    slidingWindowCheck: vi.fn().mockResolvedValue([1, 99, Date.now() + 60000]),
    time: vi.fn().mockResolvedValue([String(Math.floor(Date.now() / 1000)), '0']),
  })),
}));

vi.mock('../../config/rate-limits.js', () => ({
  loadRateLimitConfig: vi.fn(() => ({
    defaults: { limit: 100, window: 60 },
    endpoints: {},
    bypass: { roles: ['admin'] },
  })),
  getEndpointLimit: vi.fn(() => ({ limit: 100, window: 60 })),
}));

describe('createRateLimiter', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      path: '/api/data',
      ip: '127.0.0.1',
      headers: {},
    };
    mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it('should allow requests under limit', async () => {
    const { createRateLimiter } = await import('./rate-limiter.js');
    const middleware = createRateLimiter();

    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
  });

  it('should set rate limit headers on response', async () => {
    const { createRateLimiter } = await import('./rate-limiter.js');
    const middleware = createRateLimiter();

    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });

  it('should bypass rate limit for admin users', async () => {
    mockReq.user = { id: 'admin-1', roles: ['admin'] };

    const { createRateLimiter } = await import('./rate-limiter.js');
    const middleware = createRateLimiter();

    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Bypass', 'true');
    expect(mockNext).toHaveBeenCalled();
  });
});
