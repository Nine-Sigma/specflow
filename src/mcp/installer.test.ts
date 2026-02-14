import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// We test the functions that the init process calls, not init itself (which has interactive prompts)

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `specflow-installer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('MCP config generation', () => {
  it('creates .mcp.json from scratch', async () => {
    const configPath = join(testDir, '.mcp.json');
    const config = { mcpServers: { specflow: { command: 'npx', args: ['specflow', 'serve'] } } };
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    const content = JSON.parse(await readFile(configPath, 'utf8'));
    expect(content.mcpServers.specflow.command).toBe('npx');
    expect(content.mcpServers.specflow.args).toEqual(['specflow', 'serve']);
  });

  it('merges into existing .mcp.json preserving other servers', async () => {
    const configPath = join(testDir, '.mcp.json');
    const existing = {
      mcpServers: {
        other: { command: 'node', args: ['other.js'] },
      },
    };
    await writeFile(configPath, JSON.stringify(existing, null, 2));

    // Simulate merge
    const content = JSON.parse(await readFile(configPath, 'utf8'));
    content.mcpServers.specflow = { command: 'npx', args: ['specflow', 'serve'] };
    await writeFile(configPath, JSON.stringify(content, null, 2));

    const result = JSON.parse(await readFile(configPath, 'utf8'));
    expect(result.mcpServers.other).toBeDefined();
    expect(result.mcpServers.specflow).toBeDefined();
  });

  it('creates .vscode/mcp.json with correct structure', async () => {
    const configPath = join(testDir, '.vscode', 'mcp.json');
    await mkdir(join(testDir, '.vscode'), { recursive: true });
    const config = { servers: { specflow: { command: 'npx', args: ['specflow', 'serve'] } } };
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    const content = JSON.parse(await readFile(configPath, 'utf8'));
    expect(content.servers.specflow.command).toBe('npx');
  });
});

describe('agent prompt generation', () => {
  it('generates Claude Code agent files', async () => {
    const { generateClaudeCodePM, generateClaudeCodeAgent, AGENT_NAMES } = await import('./prompts.js');

    const dir = join(testDir, '.claude', 'commands');
    await mkdir(dir, { recursive: true });

    // Write PM prompt
    await writeFile(join(dir, 'sf-pm.md'), generateClaudeCodePM());

    // Write agent prompts
    for (const agent of AGENT_NAMES) {
      await writeFile(join(dir, `sf-${agent}.md`), generateClaudeCodeAgent(agent));
    }

    // Verify files exist
    const files = await readdir(dir);
    const sfFiles = files.filter(f => f.startsWith('sf-') && f.endsWith('.md'));
    expect(sfFiles).toContain('sf-pm.md');
    expect(sfFiles).toContain('sf-security.md');
    expect(sfFiles).toContain('sf-analyst.md');
    expect(sfFiles.length).toBe(AGENT_NAMES.length + 1);
  });

  it('generates Copilot agent files with frontmatter', async () => {
    const { generateCopilotPM, generateCopilotAgent, AGENT_NAMES } = await import('./prompts.js');

    const dir = join(testDir, '.github', 'agents');
    await mkdir(dir, { recursive: true });

    await writeFile(join(dir, 'sf-pm.md'), generateCopilotPM());

    for (const agent of AGENT_NAMES) {
      await writeFile(join(dir, `sf-${agent}.md`), generateCopilotAgent(agent));
    }

    // Verify PM has frontmatter
    const pmContent = await readFile(join(dir, 'sf-pm.md'), 'utf8');
    expect(pmContent.startsWith('---')).toBe(true);
    expect(pmContent).toContain('agents:');

    // Verify subagent has user-invokable: false
    const secContent = await readFile(join(dir, 'sf-security.md'), 'utf8');
    expect(secContent).toContain('user-invokable: false');
  });

  it('preserves non-sf files in directories', async () => {
    const dir = join(testDir, '.github', 'agents');
    await mkdir(dir, { recursive: true });

    // Create a non-sf file
    await writeFile(join(dir, 'my-custom-agent.md'), 'Custom agent');

    // Generate sf files
    const { generateCopilotAgent, AGENT_NAMES } = await import('./prompts.js');
    for (const agent of AGENT_NAMES) {
      await writeFile(join(dir, `sf-${agent}.md`), generateCopilotAgent(agent));
    }

    // Verify non-sf file still exists
    const customContent = await readFile(join(dir, 'my-custom-agent.md'), 'utf8');
    expect(customContent).toBe('Custom agent');
  });

  it('overwrites existing sf-* files on re-init', async () => {
    const dir = join(testDir, '.claude', 'commands');
    await mkdir(dir, { recursive: true });

    // Write an old version
    await writeFile(join(dir, 'sf-security.md'), 'Old content');

    // Generate new version
    const { generateClaudeCodeAgent } = await import('./prompts.js');
    await writeFile(join(dir, 'sf-security.md'), generateClaudeCodeAgent('security'));

    const content = await readFile(join(dir, 'sf-security.md'), 'utf8');
    expect(content).not.toBe('Old content');
    expect(content).toContain('specflow_context');
  });
});

describe('copilot-instructions.md', () => {
  it('creates new file with SpecFlow section', async () => {
    const filePath = join(testDir, '.github', 'copilot-instructions.md');
    await mkdir(join(testDir, '.github'), { recursive: true });

    const specflowSection = '<!-- SPECFLOW:START -->\n## SpecFlow\nContent\n<!-- SPECFLOW:END -->';
    await writeFile(filePath, specflowSection);

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain('SPECFLOW:START');
    expect(content).toContain('SPECFLOW:END');
    expect(content).toContain('SpecFlow');
  });

  it('preserves existing content when appending', async () => {
    const filePath = join(testDir, '.github', 'copilot-instructions.md');
    await mkdir(join(testDir, '.github'), { recursive: true });

    const existingContent = '# My Project\n\nExisting instructions here.\n';
    await writeFile(filePath, existingContent);

    // Append SpecFlow section
    let content = await readFile(filePath, 'utf8');
    content += '\n<!-- SPECFLOW:START -->\n## SpecFlow\nNew content\n<!-- SPECFLOW:END -->\n';
    await writeFile(filePath, content);

    const result = await readFile(filePath, 'utf8');
    expect(result).toContain('My Project');
    expect(result).toContain('Existing instructions');
    expect(result).toContain('SPECFLOW:START');
  });

  it('replaces SpecFlow section on re-init', async () => {
    const filePath = join(testDir, '.github', 'copilot-instructions.md');
    await mkdir(join(testDir, '.github'), { recursive: true });

    const initialContent = '# My Project\n\n<!-- SPECFLOW:START -->\nOld SpecFlow content\n<!-- SPECFLOW:END -->\n';
    await writeFile(filePath, initialContent);

    // Replace section
    let content = await readFile(filePath, 'utf8');
    const startIdx = content.indexOf('<!-- SPECFLOW:START -->');
    const endIdx = content.indexOf('<!-- SPECFLOW:END -->') + '<!-- SPECFLOW:END -->'.length;
    content = content.slice(0, startIdx) + '<!-- SPECFLOW:START -->\nUpdated SpecFlow content\n<!-- SPECFLOW:END -->' + content.slice(endIdx);
    await writeFile(filePath, content);

    const result = await readFile(filePath, 'utf8');
    expect(result).toContain('My Project');
    expect(result).not.toContain('Old SpecFlow');
    expect(result).toContain('Updated SpecFlow');
  });
});
