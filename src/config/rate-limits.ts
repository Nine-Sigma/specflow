/**
 * @fileoverview Rate limit configuration loader with Zod validation
 * STORY: 1-2-config-loading
 *
 * Implements:
 * - TC-06: Zod validation for config schema
 * - FR-06: Per-endpoint configurable limits via JSON config
 * - FR-07: Default limit applies when endpoint not configured
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Zod schema for endpoint-specific rate limit config
 * STORY: 1-2-config-loading
 * AC-02: Zod schema validates endpoints
 */
const endpointConfigSchema = z.object({
  limit: z.number().positive('Endpoint limit must be positive'),
  window: z.number().positive('Endpoint window must be positive'),
});

/**
 * Zod schema for rate limit configuration
 * STORY: 1-2-config-loading
 * AC-02: Zod schema validates defaults.limit, defaults.window, endpoints, bypass.roles
 * AC-04: Config exported as typed object
 */
export const rateLimitConfigSchema = z.object({
  defaults: z.object({
    limit: z.number().positive('Default limit must be positive'),
    window: z.number().positive('Default window must be positive'),
  }),
  endpoints: z.record(z.string(), endpointConfigSchema).default({}),
  bypass: z.object({
    roles: z.array(z.string()),
  }),
  // FIX C-01: Add trustedProxies for X-Forwarded-For validation
  trustedProxies: z.array(z.string()).default([]),
});

/**
 * TypeScript type inferred from Zod schema
 * STORY: 1-2-config-loading
 * AC-04: Config exported as typed object
 */
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

/**
 * Default config file path
 */
const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'rate-limits.json');

/**
 * Cached config instance (singleton)
 */
let cachedConfig: RateLimitConfig | null = null;

/**
 * Load and validate rate limit configuration from JSON file
 * STORY: 1-2-config-loading
 * AC-01: Config loaded from config/rate-limits.json
 * AC-02: Zod schema validates config
 * AC-03: Invalid config throws clear error at startup
 * AC-04: Config exported as typed object
 *
 * @returns Validated rate limit configuration
 * @throws Error if config file not found, invalid JSON, or validation fails
 */
export function loadRateLimitConfig(configPath: string = CONFIG_PATH): RateLimitConfig {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // AC-01: Check if config file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  // Read config file
  const fileContent = fs.readFileSync(configPath, 'utf-8');

  // AC-03: Parse JSON with clear error
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${(error as Error).message}`);
  }

  // AC-02, AC-03: Validate with Zod schema
  const result = rateLimitConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid rate limit config: ${issues}`);
  }

  // Cache and return validated config
  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Clear cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get rate limit for a specific endpoint
 * Falls back to defaults if endpoint not configured
 *
 * @param endpoint - The endpoint path (e.g., '/api/search')
 * @param config - The rate limit config
 * @returns Rate limit settings for the endpoint
 */
export function getEndpointLimit(
  endpoint: string,
  config: RateLimitConfig
): { limit: number; window: number } {
  // Check for exact match first
  if (config.endpoints[endpoint]) {
    return config.endpoints[endpoint];
  }

  // Check for prefix match
  for (const [pattern, limits] of Object.entries(config.endpoints)) {
    if (endpoint.startsWith(pattern)) {
      return limits;
    }
  }

  // FR-07: Fall back to defaults
  return config.defaults;
}
