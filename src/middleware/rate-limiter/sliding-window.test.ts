/**
 * @fileoverview Tests for sliding window rate limit algorithm
 * STORY: 1-3-sliding-window
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Redis from 'ioredis';

// We'll test with a mock Redis client
describe('SlidingWindowRateLimiter', () => {
  let mockRedis: {
    defineCommand: ReturnType<typeof vi.fn>;
    slidingWindowCheck: ReturnType<typeof vi.fn>;
    time: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedis = {
      defineCommand: vi.fn(),
      slidingWindowCheck: vi.fn(),
      time: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return allowed=true when under limit', async () => {
      // Arrange: Mock Redis TIME and Lua script result
      // Redis TIME returns [seconds, microseconds]
      mockRedis.time.mockResolvedValue(['1707000000', '123456']);
      // Lua returns [allowed, remaining, resetAt]
      mockRedis.slidingWindowCheck.mockResolvedValue([1, 99, 1707000060000]);

      const { checkRateLimit, createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Act
      const result = await checker.checkRateLimit('user:123', '/api/data', 100, 60);

      // Assert - AC-02: Returns allowed (boolean), remaining (number), resetAt (timestamp)
      expect(result).toEqual({
        allowed: true,
        remaining: 99,
        resetAt: 1707000060000,
      });
    });

    it('should return allowed=false when limit exceeded', async () => {
      // Arrange
      mockRedis.time.mockResolvedValue(['1707000000', '500000']);
      mockRedis.slidingWindowCheck.mockResolvedValue([0, 0, 1707000045000]);

      const { createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Act
      const result = await checker.checkRateLimit('user:456', '/api/search', 20, 60);

      // Assert
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        resetAt: 1707000045000,
      });
    });

    it('should use correct key format - AC-03', async () => {
      // Arrange
      mockRedis.time.mockResolvedValue(['1707000000', '0']);
      mockRedis.slidingWindowCheck.mockResolvedValue([1, 50, 1707000060000]);

      const { createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Act
      await checker.checkRateLimit('user:789', '/api/expensive', 5, 300);

      // Assert - AC-03: Key format is ratelimit:{identifier}:{endpoint}
      expect(mockRedis.slidingWindowCheck).toHaveBeenCalledWith(
        'ratelimit:user:789:/api/expensive', // key
        expect.any(Number), // window_ms
        expect.any(Number), // limit
        expect.any(Number), // now_ms
        expect.any(String), // request_id
        expect.any(Number)  // ttl_ms
      );
    });

    it('should set TTL to window + 10s buffer - AC-04', async () => {
      // Arrange
      mockRedis.time.mockResolvedValue(['1707000000', '0']);
      mockRedis.slidingWindowCheck.mockResolvedValue([1, 99, 1707000060000]);

      const { createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Act
      await checker.checkRateLimit('user:123', '/api/data', 100, 60); // 60s window

      // Assert - AC-04: TTL = window + 10s buffer = 70000ms
      const ttlArg = mockRedis.slidingWindowCheck.mock.calls[0][5];
      expect(ttlArg).toBe(70000); // 60000 + 10000
    });

    it('should use Redis TIME for timestamps - AC-05', async () => {
      // Arrange: Redis time is 1707000000 seconds + 500000 microseconds
      mockRedis.time.mockResolvedValue(['1707000000', '500000']);
      mockRedis.slidingWindowCheck.mockResolvedValue([1, 99, 1707000060000]);

      const { createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Act
      await checker.checkRateLimit('ip:1.2.3.4', '/api/data', 100, 60);

      // Assert - AC-05: Uses Redis TIME (1707000000500 ms = 1707000000s * 1000 + 500000/1000)
      const nowMsArg = mockRedis.slidingWindowCheck.mock.calls[0][3];
      expect(nowMsArg).toBe(1707000000500);
    });
  });

  describe('Lua script registration', () => {
    it('should register custom command on creation', async () => {
      const { createSlidingWindowChecker } = await import('./sliding-window.js');

      createSlidingWindowChecker(mockRedis as unknown as Redis);

      // Assert - AC-01: Lua script implements atomic operations
      expect(mockRedis.defineCommand).toHaveBeenCalledWith(
        'slidingWindowCheck',
        expect.objectContaining({
          numberOfKeys: 1,
          lua: expect.stringContaining('ZADD'),
        })
      );
      expect(mockRedis.defineCommand).toHaveBeenCalledWith(
        'slidingWindowCheck',
        expect.objectContaining({
          lua: expect.stringContaining('ZREMRANGEBYSCORE'),
        })
      );
      expect(mockRedis.defineCommand).toHaveBeenCalledWith(
        'slidingWindowCheck',
        expect.objectContaining({
          lua: expect.stringContaining('ZCARD'),
        })
      );
    });
  });

  describe('RateLimitResult type', () => {
    it('should match expected interface', async () => {
      mockRedis.time.mockResolvedValue(['1707000000', '0']);
      mockRedis.slidingWindowCheck.mockResolvedValue([1, 50, 1707000060000]);

      const { createSlidingWindowChecker } = await import('./sliding-window.js');
      const checker = createSlidingWindowChecker(mockRedis as unknown as Redis);

      const result = await checker.checkRateLimit('user:123', '/api/data', 100, 60);

      // Type assertion to verify interface
      const typed: { allowed: boolean; remaining: number; resetAt: number } = result;
      expect(typeof typed.allowed).toBe('boolean');
      expect(typeof typed.remaining).toBe('number');
      expect(typeof typed.resetAt).toBe('number');
    });
  });
});
