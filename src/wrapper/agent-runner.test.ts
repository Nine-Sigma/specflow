import { describe, it, expect, beforeAll } from 'vitest';
import { runAgent, loadCustomAgents, listAgents, getAgent } from './agent-runner.js';

describe('Agent Runner Integration', () => {
  beforeAll(async () => {
    await loadCustomAgents();
  });

  describe('listAgents', () => {
    it('returns all built-in agents', () => {
      const agents = listAgents();
      // Core BMAD agents
      expect(agents).toContain('analyst');
      expect(agents).toContain('pm');
      expect(agents).toContain('architect');
      expect(agents).toContain('dev');
      expect(agents).toContain('qa');
      expect(agents).toContain('tea');
      // SpecFlow pillar agents (BMAD cloud-architecture)
      expect(agents).toContain('security');
      expect(agents).toContain('cost');
      // Full planning path
      expect(agents).toContain('product-brief');
      expect(agents).toContain('create-prd');
      expect(agents).toContain('create-architecture');
      expect(agents).toContain('create-epics-and-stories');
      expect(agents).toContain('sprint-planning');
      expect(agents).toContain('create-story');
      expect(agents).toContain('dev-story');
      expect(agents).toContain('code-review');
      // SpecFlow utilities
      expect(agents).toContain('issue');
      expect(agents).toContain('pr');
      expect(agents).toContain('sync');
      expect(agents).toContain('scrum');
    });
  });

  describe('getAgent', () => {
    it('returns agent definition for BMAD agent', () => {
      const agent = getAgent('analyst');
      expect(agent).toBeDefined();
      expect(agent?.source).toBe('bmad');
      expect(agent?.invoke).toBe('/analyst');
    });

    it('returns agent definition for security agent', () => {
      const agent = getAgent('security');
      expect(agent).toBeDefined();
      expect(agent?.source).toBe('bmad');
      expect(agent?.invoke).toBe('/cloud-security');
    });

    it('returns agent definition for cost agent', () => {
      const agent = getAgent('cost');
      expect(agent).toBeDefined();
      expect(agent?.source).toBe('bmad');
      expect(agent?.invoke).toBe('/cloud-cost');
    });

    it('returns undefined for unknown agent', () => {
      expect(getAgent('nonexistent')).toBeUndefined();
    });
  });

  describe('runAgent', () => {
    it('handles BMAD agent via slash command delegation', async () => {
      const result = await runAgent('analyst', {});
      expect(result.success).toBe(true);
      expect(result.output).toContain('invoked via Claude Code slash command');
      expect(result.output).toContain('/analyst');
    });

    it('handles security agent (BMAD cloud-security)', async () => {
      const result = await runAgent('security', {});
      expect(result.success).toBe(true);
      expect(result.output).toContain('invoked via Claude Code slash command');
      expect(result.output).toContain('/cloud-security');
    });

    it('handles cost agent (BMAD cloud-cost)', async () => {
      const result = await runAgent('cost', {});
      expect(result.success).toBe(true);
      expect(result.output).toContain('invoked via Claude Code slash command');
      expect(result.output).toContain('/cloud-cost');
    });

    it('delegates BMAD agents without processing specflowContext', async () => {
      // BMAD agents are invoked via slash commands, context is handled by sf-*.md wrappers
      const result = await runAgent('security', {
        specflowContext: 'Output STRIDE table in SpecFlow format',
      });
      expect(result.success).toBe(true);
      expect(result.output).toContain('invoked via Claude Code slash command');
    });

    it('returns error for unknown agent', async () => {
      const result = await runAgent('nonexistent', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown agent');
      expect(result.error).toContain('nonexistent');
    });

  });
});
