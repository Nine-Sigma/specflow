/**
 * @fileoverview Rate limit config loading and validation tests
 * STORY: 1-2-config-loading
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

describe('Rate Limit Config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // STORY: 1-2-config-loading
  // AC-01: Config loaded from config/rate-limits.json
  describe('AC-01: Config file loading', () => {
    it('should load config from config/rate-limits.json', async () => {
      const validConfig = {
        defaults: { limit: 100, window: 60 },
        endpoints: {},
        bypass: { roles: ['admin'] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');
      const config = loadRateLimitConfig();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rate-limits.json'),
        'utf-8'
      );
      // FIX: Include trustedProxies default from Zod schema
      expect(config).toEqual({ ...validConfig, trustedProxies: [] });
    });

    it('should throw if config file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow('Config file not found');
    });
  });

  // STORY: 1-2-config-loading
  // AC-02: Zod schema validates defaults.limit, defaults.window, endpoints, bypass.roles
  describe('AC-02: Zod schema validation', () => {
    it('should validate valid config with all fields', async () => {
      const validConfig = {
        defaults: { limit: 100, window: 60 },
        endpoints: {
          '/api/search': { limit: 20, window: 60 },
          '/api/expensive': { limit: 5, window: 300 },
        },
        bypass: { roles: ['admin', 'service'] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');
      const config = loadRateLimitConfig();

      expect(config.defaults.limit).toBe(100);
      expect(config.defaults.window).toBe(60);
      expect(config.endpoints['/api/search'].limit).toBe(20);
      expect(config.bypass.roles).toContain('admin');
    });

    it('should require defaults.limit to be positive', async () => {
      const invalidConfig = {
        defaults: { limit: -1, window: 60 },
        endpoints: {},
        bypass: { roles: [] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow();
    });

    it('should require defaults.window to be positive', async () => {
      const invalidConfig = {
        defaults: { limit: 100, window: 0 },
        endpoints: {},
        bypass: { roles: [] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow();
    });

    it('should validate endpoint configs have positive limits', async () => {
      const invalidConfig = {
        defaults: { limit: 100, window: 60 },
        endpoints: {
          '/api/bad': { limit: -5, window: 60 },
        },
        bypass: { roles: [] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow();
    });

    it('should require bypass.roles to be array of strings', async () => {
      const invalidConfig = {
        defaults: { limit: 100, window: 60 },
        endpoints: {},
        bypass: { roles: [123] }, // number instead of string
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow();
    });
  });

  // STORY: 1-2-config-loading
  // AC-03: Invalid config throws clear error at startup
  describe('AC-03: Clear error messages', () => {
    it('should throw descriptive error for invalid JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow(/Invalid JSON/i);
    });

    it('should throw descriptive error for missing required field', async () => {
      const invalidConfig = {
        defaults: { limit: 100 }, // missing window
        endpoints: {},
        bypass: { roles: [] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const { loadRateLimitConfig } = await import('./rate-limits.js');

      expect(() => loadRateLimitConfig()).toThrow(/window/i);
    });
  });

  // STORY: 1-2-config-loading
  // AC-04: Config exported as typed object
  describe('AC-04: Type exports', () => {
    it('should export RateLimitConfig type', async () => {
      const { rateLimitConfigSchema } = await import('./rate-limits.js');

      // Schema should exist and be a Zod schema
      expect(rateLimitConfigSchema).toBeDefined();
      expect(rateLimitConfigSchema.parse).toBeDefined();
    });

    it('should return strongly typed config object', async () => {
      const validConfig = {
        defaults: { limit: 100, window: 60 },
        endpoints: { '/api/test': { limit: 10, window: 30 } },
        bypass: { roles: ['admin'] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validConfig));

      const { loadRateLimitConfig, RateLimitConfig } = await import('./rate-limits.js');
      const config = loadRateLimitConfig();

      // TypeScript should infer correct types
      const limit: number = config.defaults.limit;
      const roles: string[] = config.bypass.roles;
      const endpoint = config.endpoints['/api/test'];

      expect(limit).toBe(100);
      expect(roles).toEqual(['admin']);
      expect(endpoint?.limit).toBe(10);
    });
  });
});
