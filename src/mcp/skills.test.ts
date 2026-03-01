import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  discoverPhaseSkills,
  loadSkillContent,
  loadAgentsJson,
  getMethodologyFiles,
  assembleContext,
} from './context.js';

let testDir: string;

async function setupTestProject(): Promise<string> {
  const dir = join(tmpdir(), `specflow-skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(dir, '.specflow', 'features'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'personas'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'expertise', 'review'), { recursive: true });
  await mkdir(join(dir, '.specflow-lib', 'methodology'), { recursive: true });

  // Write persona files
  await writeFile(join(dir, '.specflow-lib', 'personas', 'pm.md'), '# John — PM\nOrchestrator persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'security.md'), '# Jordan — Security\nSecurity persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'analyst.md'), '# Mary — Analyst\nRequirements persona');
  await writeFile(join(dir, '.specflow-lib', 'personas', 'ux-designer.md'), '# Sally — UX\nUX persona');

  // Write expertise files
  await writeFile(join(dir, '.specflow-lib', 'expertise', 'review', 'index.md'), '## Review\ncontent');

  // Write STATE.md
  await writeFile(join(dir, '.specflow', 'STATE.md'), '# Project State\n\nNot started');

  return dir;
}

beforeEach(async () => {
  testDir = await setupTestProject();
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// --- discoverPhaseSkills ---

describe('discoverPhaseSkills', () => {
  it('matches review-capable skills for review phase', () => {
    const agents = {
      'code-review': {
        source: 'skill',
        invoke: '.specflow/skills/code-review',
        'review-capable': true,
      },
      'other-skill': {
        source: 'skill',
        invoke: '.specflow/skills/other',
      },
    };

    const result = discoverPhaseSkills(agents, 'review', 'medium');
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('code-review');
  });

  it('matches security-capable skills for security phase', () => {
    const agents = {
      'app-sec': {
        source: 'skill',
        invoke: '.specflow/skills/app-sec',
        'security-capable': true,
      },
    };

    const result = discoverPhaseSkills(agents, 'security', 'medium');
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('app-sec');
  });

  it('excludes underscore-prefixed entries', () => {
    const agents = {
      '_test_skill': {
        source: 'skill',
        invoke: '.specflow/skills/test',
        'review-capable': true,
      },
      'real-skill': {
        source: 'skill',
        invoke: '.specflow/skills/real',
        'review-capable': true,
      },
    };

    const result = discoverPhaseSkills(agents, 'review', 'medium');
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('real-skill');
  });

  it('excludes non-skill source entries', () => {
    const agents = {
      'custom-agent': {
        source: 'custom',
        invoke: '.specflow/agents/custom.md',
        'review-capable': true,
      },
    };

    const result = discoverPhaseSkills(agents, 'review', 'medium');
    expect(result).toHaveLength(0);
  });

  it('filters by scope-minimum', () => {
    const agents = {
      'small-scope': {
        source: 'skill',
        invoke: '.specflow/skills/small',
        'review-capable': true,
        'scope-minimum': 'small',
      },
      'medium-scope': {
        source: 'skill',
        invoke: '.specflow/skills/medium',
        'review-capable': true,
        'scope-minimum': 'medium',
      },
    };

    // trivial scope should exclude both small-scope and medium-scope
    const trivialResult = discoverPhaseSkills(agents, 'review', 'trivial');
    expect(trivialResult).toHaveLength(0);

    // small scope should include small-scope but exclude medium-scope
    const smallResult = discoverPhaseSkills(agents, 'review', 'small');
    expect(smallResult).toHaveLength(1);
    expect(smallResult[0][0]).toBe('small-scope');

    // medium scope should include both
    const mediumResult = discoverPhaseSkills(agents, 'review', 'medium');
    expect(mediumResult).toHaveLength(2);
  });

  it('includes skills without scope-minimum regardless of scope', () => {
    const agents = {
      'no-min': {
        source: 'skill',
        invoke: '.specflow/skills/no-min',
        'review-capable': true,
      },
    };

    const result = discoverPhaseSkills(agents, 'review', 'trivial');
    expect(result).toHaveLength(1);
  });

  it('returns empty for phases with no skill mapping', () => {
    const agents = {
      'some-skill': {
        source: 'skill',
        invoke: '.specflow/skills/some',
        'review-capable': true,
      },
    };

    const result = discoverPhaseSkills(agents, 'analyst', 'medium');
    expect(result).toHaveLength(0);
  });

  it('returns empty for empty agents object', () => {
    const result = discoverPhaseSkills({}, 'review', 'medium');
    expect(result).toHaveLength(0);
  });
});

// --- loadSkillContent ---

describe('loadSkillContent', () => {
  it('loads SKILL.md from relative path', async () => {
    const skillDir = join(testDir, '.specflow', 'skills', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# Test Skill\nSkill content here');

    const content = await loadSkillContent('.specflow/skills/test-skill', testDir);
    expect(content).toBe('# Test Skill\nSkill content here');
  });

  it('loads SKILL.md from absolute path', async () => {
    const skillDir = join(testDir, '.specflow', 'skills', 'abs-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# Absolute Skill\nContent');

    const content = await loadSkillContent(skillDir, testDir);
    expect(content).toBe('# Absolute Skill\nContent');
  });

  it('returns null for missing SKILL.md', async () => {
    const content = await loadSkillContent('.specflow/skills/nonexistent', testDir);
    expect(content).toBeNull();
  });

  it('strips YAML frontmatter', async () => {
    const skillDir = join(testDir, '.specflow', 'skills', 'fm-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: test\ndescription: A test skill\n---\n# Body Content\nActual skill content',
    );

    const content = await loadSkillContent('.specflow/skills/fm-skill', testDir);
    expect(content).toBe('# Body Content\nActual skill content');
    expect(content).not.toContain('---');
  });

  it('handles content without frontmatter', async () => {
    const skillDir = join(testDir, '.specflow', 'skills', 'no-fm');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# No Frontmatter\nJust content');

    const content = await loadSkillContent('.specflow/skills/no-fm', testDir);
    expect(content).toBe('# No Frontmatter\nJust content');
  });
});

// --- loadAgentsJson ---

describe('loadAgentsJson', () => {
  it('loads and parses agents.json', async () => {
    await writeFile(
      join(testDir, 'agents.json'),
      JSON.stringify({
        agents: {
          'test-skill': { source: 'skill', invoke: '.specflow/skills/test' },
        },
      }),
    );

    const agents = await loadAgentsJson(testDir);
    expect(agents['test-skill']).toBeDefined();
    expect(agents['test-skill'].source).toBe('skill');
  });

  it('returns empty object for missing agents.json', async () => {
    const agents = await loadAgentsJson(testDir);
    expect(Object.keys(agents)).toHaveLength(0);
  });
});

// --- getMethodologyFiles ---

describe('getMethodologyFiles', () => {
  it('returns STRIDE for security phase', () => {
    const files = getMethodologyFiles('security', 'medium');
    expect(files).toEqual(['stride-framework.md']);
  });

  it('returns cost methodology for cost phase', () => {
    const files = getMethodologyFiles('cost', 'medium');
    expect(files).toEqual(['cost-methodology.md']);
  });

  it('returns brainstorming techniques for brainstorm phase', () => {
    const files = getMethodologyFiles('brainstorm', null);
    expect(files).toEqual(['brainstorming-techniques.md']);
  });

  it('returns empty for phases without methodology', () => {
    const files = getMethodologyFiles('analyst', null);
    expect(files).toEqual([]);
  });

  it('scope-gates UX: small loads 2 files', () => {
    const files = getMethodologyFiles('ux', 'small');
    expect(files).toHaveLength(2);
    expect(files).toContain('ux-core-experience.md');
    expect(files).toContain('ux-visual-foundation.md');
  });

  it('scope-gates UX: medium loads 4 files', () => {
    const files = getMethodologyFiles('ux', 'medium');
    expect(files).toHaveLength(4);
    expect(files).toContain('ux-core-experience.md');
    expect(files).toContain('ux-visual-foundation.md');
    expect(files).toContain('ux-user-journeys.md');
    expect(files).toContain('ux-component-strategy.md');
  });

  it('scope-gates UX: large loads all 9 files', () => {
    const files = getMethodologyFiles('ux', 'large');
    expect(files).toHaveLength(9);
  });

  it('scope-gates UX: complex loads all 9 files', () => {
    const files = getMethodologyFiles('ux', 'complex');
    expect(files).toHaveLength(9);
  });

  it('scope-gates UX: null scope loads all 9 files (safe default)', () => {
    const files = getMethodologyFiles('ux', null);
    expect(files).toHaveLength(9);
  });
});

// --- Methodology loading in assembleContext ---

describe('methodology loading in assembleContext', () => {
  it('loads STRIDE methodology for security phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });
    await writeFile(
      join(testDir, '.specflow-lib', 'methodology', 'stride-framework.md'),
      '# STRIDE Framework\nThreat modeling methodology',
    );

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    expect('methodology' in result).toBe(true);
    if ('methodology' in result && !('error' in result)) {
      expect(result.methodology).toHaveLength(1);
      expect(result.methodology[0]).toContain('STRIDE');
    }
  });

  it('methodology is separate from expertise', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });
    await writeFile(
      join(testDir, '.specflow-lib', 'methodology', 'stride-framework.md'),
      '# STRIDE\nMethodology content',
    );

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      // Expertise should be empty for security (it has [] in PHASE_EXPERTISE_MAP)
      expect(result.expertise).toHaveLength(0);
      // Methodology should have STRIDE
      expect(result.methodology).toHaveLength(1);
    }
  });

  it('warns about missing methodology files', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });
    // Don't create stride-framework.md

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.type === 'methodology_missing')).toBe(true);
    }
  });

  it('returns empty methodology for phases without mapping', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('analyst', testDir, featureSlug, null);
    if (!('error' in result)) {
      expect(result.methodology).toEqual([]);
    }
  });
});

// --- Integration: skill loading in assembleContext ---

describe('skill loading in assembleContext', () => {
  it('loads review-capable skills for review phase', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    // Create a review-capable skill
    const skillDir = join(testDir, '.specflow', 'skills', 'code-review');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: code-review\n---\n# Code Review\nReview checklist content',
    );

    // Create agents.json with review-capable skill
    await writeFile(
      join(testDir, 'agents.json'),
      JSON.stringify({
        agents: {
          'code-review': {
            source: 'skill',
            invoke: '.specflow/skills/code-review',
            'review-capable': true,
          },
        },
      }),
    );

    const result = await assembleContext('review', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('code-review');
      expect(result.skills[0].content).toContain('Code Review');
      expect(result.skills[0].content).not.toContain('---');
    }
  });

  it('returns empty skills for phases without skill mapping', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('analyst', testDir, featureSlug, null);
    if (!('error' in result)) {
      expect(result.skills).toEqual([]);
    }
  });

  it('returns empty skills when no agents.json exists', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    const result = await assembleContext('review', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      expect(result.skills).toEqual([]);
    }
  });

  it('warns about missing SKILL.md', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });

    // Create agents.json pointing to nonexistent skill
    await writeFile(
      join(testDir, 'agents.json'),
      JSON.stringify({
        agents: {
          'missing-skill': {
            source: 'skill',
            invoke: '.specflow/skills/missing',
            'review-capable': true,
          },
        },
      }),
    );

    const result = await assembleContext('review', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      expect(result.skills).toEqual([]);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.type === 'skill_missing')).toBe(true);
    }
  });
});

// --- Integration: security phase with methodology ---

describe('security phase integration', () => {
  it('returns STRIDE in methodology array, not expertise', async () => {
    const featureSlug = 'test-feature';
    await mkdir(join(testDir, '.specflow', 'features', featureSlug), { recursive: true });
    await writeFile(
      join(testDir, '.specflow-lib', 'methodology', 'stride-framework.md'),
      '# STRIDE\nSpoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege',
    );

    const result = await assembleContext('security', testDir, featureSlug, 'medium');
    if (!('error' in result)) {
      // Methodology should have STRIDE
      expect(result.methodology.length).toBeGreaterThan(0);
      expect(result.methodology[0]).toContain('STRIDE');

      // Expertise should NOT have STRIDE
      const expertiseJoined = result.expertise.join('\n');
      expect(expertiseJoined).not.toContain('STRIDE');
    }
  });
});
