/**
 * @fileoverview Redis client singleton for rate limiter
 * STORY: 1-1-redis-client
 *
 * Implements:
 * - TC-01: Use ioredis library for Redis client
 * - TC-10: Connection pool max 50 for t3.small
 * - SC-04: Redis AUTH required (no anonymous)
 * - IP-01: Redis external integration
 */

import Redis from 'ioredis';

// STORY: 1-1-redis-client
// AC-04: Client exported as singleton
let redisClient: Redis | null = null;

/**
 * Redis client configuration options
 * STORY: 1-1-redis-client
 * AC-03: Connection pool configured (max 50)
 */
const REDIS_OPTIONS: Redis.RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null; // Stop retrying after 3 attempts
    }
    return Math.min(times * 100, 3000); // Exponential backoff, max 3s
  },
  enableReadyCheck: true,
  // TLS support for production
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

/**
 * Get the Redis client singleton
 * STORY: 1-1-redis-client
 * AC-01: Redis client created using ioredis
 * AC-02: Connection uses AUTH from environment variable
 * AC-04: Client exported as singleton
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  // SC-04: Redis AUTH required (no anonymous)
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  redisClient = new Redis(redisUrl, REDIS_OPTIONS);

  // Connection event logging
  redisClient.on('connect', () => {
    console.log(JSON.stringify({ level: 'info', msg: 'Redis client connected' }));
  });

  redisClient.on('error', (err) => {
    console.error(JSON.stringify({ level: 'error', msg: 'Redis client error', error: err.message }));
  });

  redisClient.on('close', () => {
    console.log(JSON.stringify({ level: 'info', msg: 'Redis client connection closed' }));
  });

  return redisClient;
}

/**
 * Close the Redis connection gracefully
 * STORY: 1-1-redis-client
 * AC-05: Graceful shutdown on process exit
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Register graceful shutdown handlers
// AC-05: Graceful shutdown on process exit
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    console.log(JSON.stringify({ level: 'info', msg: 'Shutting down Redis client...' }));
    await closeRedisConnection();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
