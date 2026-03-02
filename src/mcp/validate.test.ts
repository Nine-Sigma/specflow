import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateArtifact } from './validate.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-validate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(testDir, '.specflow', 'features', 'test-feat'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function writeArtifact(filename: string, content: string) {
  return writeFile(join(testDir, '.specflow', 'features', 'test-feat', filename), content);
}

describe('scope-aware validation thresholds', () => {
  it('trivial scope uses 50 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(50));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'trivial');
    expect('valid' in result && result.valid).toBe(true);
  });

  it('small scope uses 100 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(60));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'small');
    expect('checks' in result && result.checks.content_quality).toBe(false);
  });

  it('small scope passes with sufficient content', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(100));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'small');
    expect('checks' in result && result.checks.content_quality).toBe(true);
  });

  it('medium scope uses 300 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(200));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'medium');
    expect('checks' in result && result.checks.content_quality).toBe(false);
  });

  it('large scope uses 500 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(400));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'large');
    expect('checks' in result && result.checks.content_quality).toBe(false);
  });

  it('complex scope uses 500 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(500));
    const result = await validateArtifact('analyst', testDir, 'test-feat', 'complex');
    expect('checks' in result && result.checks.content_quality).toBe(true);
  });

  it('no scope defaults to 50 char threshold (backward compatible)', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(50));
    const result = await validateArtifact('analyst', testDir, 'test-feat');
    expect('valid' in result && result.valid).toBe(true);
  });

  it('null scope defaults to 50 char threshold', async () => {
    await writeArtifact('1-spec.md', '# Spec\n' + 'x'.repeat(50));
    const result = await validateArtifact('analyst', testDir, 'test-feat', null);
    expect('valid' in result && result.valid).toBe(true);
  });
});
