import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Node version preflight check', () => {
  const cliSource = readFileSync(join(import.meta.dirname, 'cli.ts'), 'utf8');

  it('cli.ts contains Node version check before imports', () => {
    const checkIndex = cliSource.indexOf('process.versions.node');
    const commanderIndex = cliSource.indexOf("from 'commander'");
    expect(checkIndex).toBeGreaterThan(-1);
    expect(checkIndex).toBeLessThan(commanderIndex);
  });

  it('cli.ts checks for Node >= 20', () => {
    expect(cliSource).toContain('nodeMajor < 20');
  });

  it('cli.ts provides install guidance on failure', () => {
    expect(cliSource).toContain('nodejs.org');
    expect(cliSource).toContain('nvm/fnm');
  });
});
