import { describe, it, expect } from 'vitest';
import {
  generateClaudeCodePM,
  generateCopilotPM,
  generateClaudeCodeAgent,
  generateCopilotAgent,
  extractRoutingLogic,
  AGENT_NAMES,
} from './prompts.js';

describe('PM prompt generation', () => {
  it('generates Claude Code PM without frontmatter', () => {
    const prompt = generateClaudeCodePM();
    expect(prompt).not.toMatch(/^---/);
    expect(prompt).toContain('SpecFlow PM');
    expect(prompt).toContain('Task(');
    expect(prompt).not.toContain('runSubagent(');
  });

  it('generates Copilot PM with YAML frontmatter', () => {
    const prompt = generateCopilotPM();
    expect(prompt).toMatch(/^---/);
    expect(prompt).toContain('tools:');
    expect(prompt).toContain('agents:');
    expect(prompt).toContain('runSubagent(');
    expect(prompt).not.toContain('Task(');
  });

  it('Copilot PM frontmatter lists all agent names', () => {
    const prompt = generateCopilotPM();
    for (const agent of AGENT_NAMES) {
      expect(prompt).toContain(`sf-${agent}`);
    }
  });

  it('Copilot PM frontmatter includes required tools', () => {
    const prompt = generateCopilotPM();
    expect(prompt).toContain('- agent');
    expect(prompt).toContain('- specflow_context');
    expect(prompt).toContain('- specflow_state');
    expect(prompt).toContain('- specflow_validate');
    expect(prompt).toContain('- specflow_codebase');
    expect(prompt).toContain('- specflow_impact');
  });

  it('PM prompts have no remaining placeholders', () => {
    expect(generateClaudeCodePM()).not.toContain('{{SPAWN');
    expect(generateCopilotPM()).not.toContain('{{SPAWN');
  });

  it('Claude PM prompt contains specflow_execute_wave for dev/qa/pillars', () => {
    const prompt = generateClaudeCodePM();
    expect(prompt).toContain('specflow_execute_wave({ type: "dev" })');
    expect(prompt).toContain('specflow_execute_wave({ type: "qa" })');
    expect(prompt).toContain('specflow_execute_wave({ type: "pillars" })');
  });

  it('Claude PM prompt retains Task() fallback after wave references', () => {
    const prompt = generateClaudeCodePM();
    expect(prompt).toContain('Task(');
    expect(prompt).toContain('fall back to');
  });

  it('Copilot PM prompt contains specflow_execute_wave for dev/qa/pillars', () => {
    const prompt = generateCopilotPM();
    expect(prompt).toContain('specflow_execute_wave({ type: "dev" })');
    expect(prompt).toContain('specflow_execute_wave({ type: "qa" })');
    expect(prompt).toContain('specflow_execute_wave({ type: "pillars" })');
  });

  it('Copilot PM prompt retains runSubagent() fallback after wave references', () => {
    const prompt = generateCopilotPM();
    expect(prompt).toContain('runSubagent(');
    expect(prompt).toContain('fall back to');
  });
});

describe('thin agent prompt generation', () => {
  it('generates Claude Code agent without frontmatter', () => {
    const prompt = generateClaudeCodeAgent('security');
    expect(prompt).not.toMatch(/^---/);
    expect(prompt).toContain('specflow_context("security")');
    expect(prompt).toContain('specflow_validate("security")');
  });

  it('generates Copilot agent with YAML frontmatter', () => {
    const prompt = generateCopilotAgent('security');
    expect(prompt).toMatch(/^---/);
    expect(prompt).toContain('name: sf-security');
    expect(prompt).toContain('user-invokable: false');
    expect(prompt).toContain('specflow_context');
  });

  it('Copilot agent frontmatter includes code intelligence tools', () => {
    const prompt = generateCopilotAgent('architect');
    expect(prompt).toContain('- specflow_codebase');
    expect(prompt).toContain('- specflow_impact');
  });

  it('agent body is identical across platforms', () => {
    for (const agent of AGENT_NAMES) {
      const claudeBody = generateClaudeCodeAgent(agent);
      const copilotFull = generateCopilotAgent(agent);
      // Strip frontmatter from Copilot version
      const copilotBody = copilotFull.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
      expect(copilotBody).toBe(claudeBody);
    }
  });

  it('generates all defined agents', () => {
    for (const agent of AGENT_NAMES) {
      const claude = generateClaudeCodeAgent(agent);
      expect(claude.length).toBeGreaterThan(0);
      expect(claude).toContain('specflow_context');

      const copilot = generateCopilotAgent(agent);
      expect(copilot).toContain(`name: sf-${agent}`);
    }
  });
});

describe('PM prompt: start_or_resume', () => {
  it('Claude Code PM uses start_or_resume instead of start', () => {
    const prompt = generateClaudeCodePM();
    expect(prompt).toContain('start_or_resume');
    expect(prompt).not.toMatch(/specflow_state\("start",/);
  });

  it('Copilot PM uses start_or_resume instead of start', () => {
    const prompt = generateCopilotPM();
    expect(prompt).toContain('start_or_resume');
    expect(prompt).not.toMatch(/specflow_state\("start",/);
  });
});

describe('drift detection', () => {
  it('routing logic is identical after stripping platform-specific syntax', () => {
    const claudeLogic = extractRoutingLogic(generateClaudeCodePM());
    const copilotLogic = extractRoutingLogic(generateCopilotPM());
    expect(claudeLogic).toBe(copilotLogic);
  });

  it('extractRoutingLogic strips frontmatter', () => {
    const withFrontmatter = '---\ntools:\n  - test\n---\n\n# Content here';
    const extracted = extractRoutingLogic(withFrontmatter);
    expect(extracted).not.toContain('tools:');
    expect(extracted).toContain('# Content here');
  });

  it('extractRoutingLogic normalizes spawn syntax', () => {
    const claudeCode = 'Task(subagent_type="general-purpose", prompt="test", description="test")';
    const copilot = 'runSubagent(agent="sf-test", prompt="test")';
    expect(extractRoutingLogic(claudeCode)).toBe(extractRoutingLogic(copilot));
  });
});
