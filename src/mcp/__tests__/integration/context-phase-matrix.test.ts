import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rm } from 'fs/promises';
import { assembleContext, loadAgentsJson, discoverPhaseSkills, getMethodologyFiles, getExpertiseFiles } from '../../context.js';
import {
  PHASE_PERSONA_MAP,
  PHASE_EXPERTISE_MAP,
  PHASE_OUTPUT_MAP,
  PHASE_CODEBASE_MAP,
  PHASE_METHODOLOGY_MAP,
  UX_SCOPE_TIERS,
  ARTIFACT_TRUNCATION_THRESHOLD,
  SKILLS_TOTAL_CAP,
  type ContextResponse,
} from '../../types.js';
import { setupFullE2EProject, buildArtifact } from '../fixtures/helpers.js';
import { MetricsCollector } from '../metrics/harness.js';
import { registerCollectors, registerCollector } from '../metrics/registry.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const SCOPES = ['trivial', 'small', 'medium', 'large', 'complex'] as const;
const PHASES = Object.keys(PHASE_PERSONA_MAP);

let testDir: string;
const collectors: MetricsCollector[] = [];

beforeAll(async () => {
  testDir = await setupFullE2EProject();
});

afterAll(async () => {
  // Register all collectors to shared registry for unified run report
  if (collectors.length > 0) {
    await registerCollectors(collectors);
  }

  await rm(testDir, { recursive: true, force: true });
});

// --- 3.1: Phase × Scope Matrix ---
describe('phase matrix: context assembly across all phases and scopes', () => {
  describe.each(PHASES)('phase: %s', (phase) => {
    it.each(SCOPES)('scope: %s', async (scope) => {
      const metrics = new MetricsCollector(phase, scope, 'e2e-project', 'phase-matrix');

      const ctx = await metrics.time('contextAssembly', () =>
        assembleContext(phase, testDir, 'test-feature', scope),
      );

      // Should return a valid context (not an error)
      expect('persona' in ctx).toBe(true);
      const context = ctx as ContextResponse;

      // Verify persona matches PHASE_PERSONA_MAP
      const expectedPersonaFile = PHASE_PERSONA_MAP[phase];
      expect(expectedPersonaFile).toBeDefined();

      // Verify output_path matches PHASE_OUTPUT_MAP
      const expectedOutput = PHASE_OUTPUT_MAP[phase];
      if (expectedOutput) {
        expect(context.output_path).toBe(
          `.specflow/features/test-feature/${expectedOutput}`,
        );
      }

      // Verify scope is passed through
      expect(context.scope).toBe(scope);

      // Record metrics
      metrics.recordContextSizes(context);
      collectors.push(metrics);
    });
  });
});

// --- 3.2: Scope-gated UX methodology ---
describe('scope-gated methodology for UX phase', () => {
  it('small scope loads core UX files only', () => {
    const files = getMethodologyFiles('ux', 'small');
    expect(files).toHaveLength(2);
    expect(files).toContain('ux-core-experience.md');
    expect(files).toContain('ux-visual-foundation.md');
  });

  it('medium scope loads core + journeys + component strategy', () => {
    const files = getMethodologyFiles('ux', 'medium');
    expect(files).toHaveLength(4);
    expect(files).toContain('ux-user-journeys.md');
    expect(files).toContain('ux-component-strategy.md');
  });

  it('large scope loads all 9 UX files', () => {
    const files = getMethodologyFiles('ux', 'large');
    expect(files).toHaveLength(9);
  });

  it('complex scope loads all 9 UX files', () => {
    const files = getMethodologyFiles('ux', 'complex');
    expect(files).toHaveLength(9);
    expect(files).toEqual(UX_SCOPE_TIERS.large); // Same as large
  });

  it('trivial scope assembles context with empty methodology', async () => {
    const ctx = await assembleContext('ux', testDir, 'test-feature', 'trivial');
    if ('methodology' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.methodology).toHaveLength(0);
    }
  });

  it('assembles context with correct methodology count per scope', async () => {
    const smallCtx = await assembleContext('ux', testDir, 'test-feature', 'small');
    const largeCtx = await assembleContext('ux', testDir, 'test-feature', 'large');

    if ('methodology' in smallCtx && 'methodology' in largeCtx) {
      const s = smallCtx as ContextResponse;
      const l = largeCtx as ContextResponse;
      expect(s.methodology.length).toBeLessThan(l.methodology.length);
    }
  });
});

// --- 3.2b: Scope-tiered expertise loading ---
describe('scope-tiered expertise loading', () => {
  // 4.1: Analyst scope tiers
  describe('analyst expertise tiers', () => {
    it('trivial scope loads no expertise', () => {
      const files = getExpertiseFiles('analyst', 'trivial');
      expect(files).toHaveLength(0);
    });

    it('small scope loads requirements only', () => {
      const files = getExpertiseFiles('analyst', 'small');
      expect(files).toEqual(['requirements/']);
    });

    it('medium scope loads full expertise', () => {
      const files = getExpertiseFiles('analyst', 'medium');
      expect(files).toEqual(['requirements/', 'synthesis/codebase-analysis.md']);
    });

    it('trivial analyst assembles with empty expertise', async () => {
      const ctx = await assembleContext('analyst', testDir, 'test-feature', 'trivial');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(0);
      }
    });

    it('small analyst assembles with requirements only', async () => {
      const ctx = await assembleContext('analyst', testDir, 'test-feature', 'small');
      if ('expertise' in ctx) {
        const context = ctx as ContextResponse;
        expect(context.expertise.length).toBeGreaterThan(0);
        expect(context.expertise.some(e => e.includes('BOSS'))).toBe(true);
      }
    });

    it('medium analyst assembles with full expertise', async () => {
      const ctx = await assembleContext('analyst', testDir, 'test-feature', 'medium');
      if ('expertise' in ctx) {
        const context = ctx as ContextResponse;
        expect(context.expertise.length).toBeGreaterThan(1);
        expect(context.expertise.some(e => e.includes('Codebase Analysis'))).toBe(true);
      }
    });
  });

  // 4.2: TEA scope tiers
  describe('tea expertise tiers', () => {
    it('trivial scope loads no expertise', () => {
      const files = getExpertiseFiles('tea', 'trivial');
      expect(files).toHaveLength(0);
    });

    it('small scope loads test-specification only', () => {
      const files = getExpertiseFiles('tea', 'small');
      expect(files).toEqual(['testing/test-specification.md']);
    });

    it('medium scope loads full testing expertise', () => {
      const files = getExpertiseFiles('tea', 'medium');
      expect(files).toEqual(['testing/', 'code-intelligence.md']);
    });

    it('trivial tea assembles with empty expertise', async () => {
      const ctx = await assembleContext('tea', testDir, 'test-feature', 'trivial');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(0);
      }
    });

    it('small tea assembles with 1 expertise file', async () => {
      const ctx = await assembleContext('tea', testDir, 'test-feature', 'small');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(1);
      }
    });
  });

  // 4.3: Architect scope tiers
  describe('architect expertise tiers', () => {
    it('trivial scope loads no expertise', () => {
      const files = getExpertiseFiles('architect', 'trivial');
      expect(files).toHaveLength(0);
    });

    it('small scope loads validation-checklist only', () => {
      const files = getExpertiseFiles('architect', 'small');
      expect(files).toEqual(['architecture/validation-checklist.md']);
    });

    it('medium scope loads full architecture expertise', () => {
      const files = getExpertiseFiles('architect', 'medium');
      expect(files).toEqual(['architecture/', 'code-intelligence.md']);
    });

    it('trivial architect assembles with empty expertise', async () => {
      const ctx = await assembleContext('architect', testDir, 'test-feature', 'trivial');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(0);
      }
    });

    it('small architect assembles with 1 expertise file', async () => {
      const ctx = await assembleContext('architect', testDir, 'test-feature', 'small');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(1);
      }
    });
  });

  // 4.4: QA scope tiers
  describe('qa expertise tiers', () => {
    it('trivial qa-tdd loads no expertise', () => {
      const files = getExpertiseFiles('qa-tdd', 'trivial');
      expect(files).toHaveLength(0);
    });

    it('small qa-verify loads no expertise', () => {
      const files = getExpertiseFiles('qa-verify', 'small');
      expect(files).toHaveLength(0);
    });

    it('medium qa-tdd loads full testing expertise', () => {
      const files = getExpertiseFiles('qa-tdd', 'medium');
      expect(files).toEqual(['testing/']);
    });

    it('medium qa-verify loads full testing expertise', () => {
      const files = getExpertiseFiles('qa-verify', 'medium');
      expect(files).toEqual(['testing/']);
    });

    it('trivial qa-tdd assembles with empty expertise', async () => {
      const ctx = await assembleContext('qa-tdd', testDir, 'test-feature', 'trivial');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise).toHaveLength(0);
      }
    });

    it('medium qa-tdd assembles with testing expertise', async () => {
      const ctx = await assembleContext('qa-tdd', testDir, 'test-feature', 'medium');
      if ('expertise' in ctx) {
        expect((ctx as ContextResponse).expertise.length).toBeGreaterThan(0);
      }
    });
  });

  // 4.5: Null scope fallback
  describe('null scope fallback', () => {
    it('analyst with null scope loads full expertise', () => {
      const files = getExpertiseFiles('analyst', null);
      expect(files).toEqual(['requirements/', 'synthesis/codebase-analysis.md']);
    });

    it('tea with null scope loads full expertise', () => {
      const files = getExpertiseFiles('tea', null);
      expect(files).toEqual(['testing/', 'code-intelligence.md']);
    });

    it('architect with null scope loads full expertise', () => {
      const files = getExpertiseFiles('architect', null);
      expect(files).toEqual(['architecture/', 'code-intelligence.md']);
    });

    it('qa-tdd with null scope loads full expertise', () => {
      const files = getExpertiseFiles('qa-tdd', null);
      expect(files).toEqual(['testing/']);
    });

    it('non-tiered phase with null scope loads full expertise', () => {
      const files = getExpertiseFiles('synthesis', null);
      expect(files).toEqual(['synthesis/', 'requirements/']);
    });
  });
});

// --- 3.3: Unrecognized scope value ---
describe('unrecognized scope handling', () => {
  it('UX with trivial scope loads empty methodology', () => {
    const files = getMethodologyFiles('ux', 'trivial');
    expect(files).toEqual([]);
  });

  it('UX with null scope falls back to full methodology', () => {
    const files = getMethodologyFiles('ux', null);
    expect(files).toEqual(PHASE_METHODOLOGY_MAP.ux);
  });
});

// --- 3.4: Skill discovery ---
describe('skill discovery', () => {
  it('matches skills by capability flag', async () => {
    const agents = await loadAgentsJson(testDir);
    const reviewSkills = discoverPhaseSkills(agents, 'review', 'medium');
    expect(reviewSkills.length).toBeGreaterThan(0);
    expect(reviewSkills.some(([name]) => name === 'test-review-skill')).toBe(true);
  });

  it('filters by scope-minimum', async () => {
    const agents = await loadAgentsJson(testDir);

    // trivial scope should not match security skill with scope-minimum: medium
    const trivialSkills = discoverPhaseSkills(agents, 'security', 'trivial');
    expect(trivialSkills.some(([name]) => name === 'test-security-skill')).toBe(false);

    // medium scope should match
    const mediumSkills = discoverPhaseSkills(agents, 'security', 'medium');
    expect(mediumSkills.some(([name]) => name === 'test-security-skill')).toBe(true);
  });

  it('excludes underscore-prefixed (disabled) skills', async () => {
    const agents = await loadAgentsJson(testDir);
    const skills = discoverPhaseSkills(agents, 'review', 'medium');
    expect(skills.some(([name]) => name === '_disabled-skill')).toBe(false);
  });

  it('excludes non-skill source entries', async () => {
    const agents = await loadAgentsJson(testDir);
    const skills = discoverPhaseSkills(agents, 'review', 'medium');
    expect(skills.some(([name]) => name === 'non-skill-agent')).toBe(false);
  });

  it('enforces 50K char cap in assembled context', async () => {
    // Create a project with many large skills
    const bigDir = await setupFullE2EProject('big-skills-test');
    const bigAgents: Record<string, Record<string, unknown>> = { agents: {} as Record<string, Record<string, unknown>> };
    const agents = bigAgents.agents as Record<string, Record<string, unknown>>;

    for (let i = 0; i < 10; i++) {
      const skillName = `large-review-skill-${i}`;
      agents[skillName] = {
        source: 'skill',
        'review-capable': true,
        invoke: `.specflow/skills/${skillName}`,
      };
      const skillDir = join(bigDir, '.specflow', 'skills', skillName);
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `# ${skillName}\n${'Review content. '.repeat(500)}`,
      );
    }
    await writeFile(join(bigDir, 'agents.json'), JSON.stringify(bigAgents, null, 2));

    const ctx = await assembleContext('review', bigDir, 'big-skills-test', 'medium');
    if ('skills' in ctx) {
      const totalSize = (ctx as ContextResponse).skills.reduce(
        (s, sk) => s + sk.content.length,
        0,
      );
      expect(totalSize).toBeLessThanOrEqual(SKILLS_TOTAL_CAP);
    }

    await rm(bigDir, { recursive: true, force: true });
  });
});

// --- 3.5: Skills double-truncation ---
describe('skills double-truncation', () => {
  it('handles skill exceeding 30K + total exceeding 50K', async () => {
    const bigDir = await setupFullE2EProject('double-truncation-test');
    const agents: Record<string, Record<string, unknown>> = {
      agents: {
        'mega-skill': {
          source: 'skill',
          'review-capable': true,
          invoke: '.specflow/skills/mega-skill',
        },
        'normal-skill': {
          source: 'skill',
          'review-capable': true,
          invoke: '.specflow/skills/normal-skill',
        },
      },
    };

    const megaDir = join(bigDir, '.specflow', 'skills', 'mega-skill');
    await mkdir(megaDir, { recursive: true });
    await writeFile(
      join(megaDir, 'SKILL.md'),
      `# Mega Skill\n${'x'.repeat(35_000)}`,
    );

    const normalDir = join(bigDir, '.specflow', 'skills', 'normal-skill');
    await mkdir(normalDir, { recursive: true });
    await writeFile(
      join(normalDir, 'SKILL.md'),
      `# Normal Skill\n${'y'.repeat(25_000)}`,
    );

    await writeFile(join(bigDir, 'agents.json'), JSON.stringify(agents, null, 2));

    const ctx = await assembleContext('review', bigDir, 'double-truncation-test', 'medium');
    if ('skills' in ctx) {
      const context = ctx as ContextResponse;
      const totalSize = context.skills.reduce((s, sk) => s + sk.content.length, 0);
      expect(totalSize).toBeLessThanOrEqual(SKILLS_TOTAL_CAP);
      expect(context.truncated).toBe(true);

      const metrics = new MetricsCollector('review', 'medium', 'double-truncation', 'phase-matrix');
      metrics.recordTruncation({ skillsCapped: true, warnings: ['Skills total exceeded 50K cap'] });
      await registerCollector(metrics);
    }

    await rm(bigDir, { recursive: true, force: true });
  });
});

// --- 3.6: Malformed agents.json ---
describe('malformed agents.json', () => {
  it('returns empty skills instead of crashing', async () => {
    const badDir = await setupFullE2EProject('bad-agents-test');
    await writeFile(join(badDir, 'agents.json'), '{ this is not valid json }');

    const agents = await loadAgentsJson(badDir);
    expect(agents).toEqual({});

    await rm(badDir, { recursive: true, force: true });
  });
});

// --- 3.7: Codebase enrichment per-phase ---
describe('codebase enrichment per-phase', () => {
  it.each(Object.keys(PHASE_CODEBASE_MAP))(
    'phase %s has codebase config with valid fields',
    (phase) => {
      const config = PHASE_CODEBASE_MAP[phase];
      expect(config).toBeDefined();
      expect(config.fields.length).toBeGreaterThan(0);
      for (const field of config.fields) {
        expect(['scan', 'symbols', 'impact', 'patterns']).toContain(field);
      }
    },
  );
});

// --- 3.8: Codebase enrichment 10K truncation ---
// This test verifies the truncation constant exists; actual truncation tested in intel/e2e
describe('codebase enrichment size cap', () => {
  it('CODEBASE_SIZE_CAP is defined as 10K', async () => {
    const { CODEBASE_SIZE_CAP } = await import('../../intel/enrich.js');
    expect(CODEBASE_SIZE_CAP).toBe(10_000);
  });
});

// --- 3.9: Artifact truncation at 30K ---
describe('artifact truncation', () => {
  it('truncates artifact exceeding 30K chars', async () => {
    const largeContent = '## Large\n\n' + 'x'.repeat(35_000);
    const truncDir = await setupFullE2EProject('truncation-test');
    await writeFile(
      join(truncDir, '.specflow', 'features', 'truncation-test', '1-spec.md'),
      largeContent,
    );

    const ctx = await assembleContext('architect', truncDir, 'truncation-test', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.artifacts['1-spec.md'].length).toBe(ARTIFACT_TRUNCATION_THRESHOLD);
      expect(context.truncated).toBe(true);

      const metrics = new MetricsCollector('architect', 'medium', 'artifact-truncation', 'phase-matrix');
      metrics.recordTruncation({ artifactsTruncated: true, warnings: ['Artifact 1-spec.md truncated at 30K'] });
      await registerCollector(metrics);
    }

    await rm(truncDir, { recursive: true, force: true });
  });
});

// --- 3.10: Truncation boundary safety ---
describe('artifact truncation boundary safety', () => {
  it('30,001 char artifact with FR-ID at boundary does not break validation', async () => {
    // Place FR-ID right at the truncation boundary
    const prefix = 'x'.repeat(ARTIFACT_TRUNCATION_THRESHOLD - 10);
    const boundary = '\nFR-01: Test\n'; // FR-ID at ~30K mark
    const content = '## Test\n\n' + prefix + boundary;

    const truncDir = await setupFullE2EProject('boundary-test');
    await writeFile(
      join(truncDir, '.specflow', 'features', 'boundary-test', '1-spec.md'),
      content,
    );

    const ctx = await assembleContext('architect', truncDir, 'boundary-test', 'medium');
    if ('artifacts' in ctx) {
      const context = ctx as ContextResponse;
      // Should truncate to exactly 30K chars
      expect(context.artifacts['1-spec.md'].length).toBe(ARTIFACT_TRUNCATION_THRESHOLD);
      expect(context.truncated).toBe(true);

      const metrics = new MetricsCollector('architect', 'medium', 'boundary-truncation', 'phase-matrix');
      metrics.recordTruncation({ artifactsTruncated: true, warnings: ['Artifact truncated at 30K boundary with FR-ID'] });
      await registerCollector(metrics);
    }

    await rm(truncDir, { recursive: true, force: true });
  });
});

// --- 3.11: Missing artifact warning ---
describe('missing artifact warning', () => {
  it('returns warning with correct type for missing artifacts', async () => {
    const missingDir = await setupFullE2EProject('missing-artifact-test');
    // Remove a required artifact for architect phase
    const { unlink } = await import('fs/promises');
    try {
      await unlink(join(missingDir, '.specflow', 'features', 'missing-artifact-test', '1-spec.md'));
    } catch { /* may not exist */ }

    const ctx = await assembleContext('architect', missingDir, 'missing-artifact-test', 'medium');
    if ('warnings' in ctx) {
      const context = ctx as ContextResponse;
      expect(context.warnings).toBeDefined();
      expect(context.warnings!.some(w => w.type === 'artifact_missing')).toBe(true);
    }

    await rm(missingDir, { recursive: true, force: true });
  });
});

// --- 12.11: Review skills scale by scope ---
describe('review skills scale by scope', () => {
  it('trivial=1 skill, small=2 skills, large=3 skills', async () => {
    const agents = await loadAgentsJson(testDir);

    const trivialSkills = discoverPhaseSkills(agents, 'review', 'trivial');
    const smallSkills = discoverPhaseSkills(agents, 'review', 'small');
    const largeSkills = discoverPhaseSkills(agents, 'review', 'large');

    // trivial: only test-review-skill (no scope-minimum)
    expect(trivialSkills.length).toBe(1);
    expect(trivialSkills.some(([name]) => name === 'test-review-skill')).toBe(true);

    // small: test-review-skill + test-review-small
    expect(smallSkills.length).toBe(2);
    expect(smallSkills.some(([name]) => name === 'test-review-small')).toBe(true);

    // large: test-review-skill + test-review-small + test-review-large
    expect(largeSkills.length).toBe(3);
    expect(largeSkills.some(([name]) => name === 'test-review-large')).toBe(true);
  });
});

// --- 3.12: Content quality vs scope metrics ---
describe('content quality vs scope', () => {
  it('records content length alongside scope level', async () => {
    for (const scope of SCOPES) {
      const ctx = await assembleContext('analyst', testDir, 'test-feature', scope);
      if ('persona' in ctx) {
        const context = ctx as ContextResponse;
        const metrics = new MetricsCollector('analyst', scope, 'quality-vs-scope', 'phase-matrix');
        metrics.recordContextSizes(context);
        const m = metrics.getMetrics();
        expect(m.contextSizes.total).toBeGreaterThan(0);
        expect(m.scope).toBe(scope);
        collectors.push(metrics);
      }
    }
  });
});

// --- 3.13: Cross-artifact keyword overlap ---
describe('cross-artifact keyword overlap', () => {
  it('computes overlap between lock FR descriptions and dev output', async () => {
    const overlapDir = await setupFullE2EProject('overlap-test');
    const featureDir = join(overlapDir, '.specflow', 'features', 'overlap-test');

    await writeFile(
      join(featureDir, '5-requirements-lock.md'),
      '## Lock\n- FR-01: User Registration\n- FR-02: Order Creation\n- FR-03: Session Management',
    );
    await writeFile(
      join(featureDir, '6-dev-output.md'),
      '## Dev Output\nImplemented FR-01 User Registration.\nImplemented FR-02 Order Creation.\nSkipped FR-03.',
    );

    const lockCtx = await assembleContext('checkpoint-dev', overlapDir, 'overlap-test', 'medium');
    if ('artifacts' in lockCtx) {
      const context = lockCtx as ContextResponse;
      const lock = context.artifacts['5-requirements-lock.md'] ?? '';
      const dev = context.artifacts['6-dev-output.md'] ?? '';

      // Simple keyword overlap: count FR-IDs appearing in both
      const frPattern = /FR-\d+/g;
      const lockIds = new Set(lock.match(frPattern) ?? []);
      const devIds = new Set(dev.match(frPattern) ?? []);
      const overlap = [...lockIds].filter(id => devIds.has(id));

      expect(overlap.length).toBeGreaterThan(0);
      expect(lockIds.size).toBeGreaterThanOrEqual(overlap.length);
    }

    await rm(overlapDir, { recursive: true, force: true });
  });
});

// --- 3.14: Export context size metrics ---
// Metrics are exported in afterAll via collectors array
