import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--tool') result.tool = argv[++i];
    else if (token === '--args') result.rawArgs = argv[++i];
    else if (token === '--log') result.logPath = argv[++i];
  }
  return result;
}

async function appendLog(logPath, entry) {
  if (!logPath) return;
  const absolute = resolve(logPath);
  await mkdir(dirname(absolute), { recursive: true });
  await appendFile(absolute, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function main() {
  const { tool, rawArgs, logPath } = parseArgs(process.argv.slice(2));
  if (!tool) {
    console.error('Usage: node scripts/mcp_call.mjs --tool <name|tools/list> [--args \'{"k":"v"}\'] [--log path]');
    process.exit(2);
  }

  let parsedArgs = {};
  if (rawArgs) {
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (err) {
      console.error(`Invalid JSON for --args: ${err.message}`);
      process.exit(2);
    }
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', resolve('src/cli.ts'), 'serve'],
    cwd: process.cwd(),
    stderr: 'pipe',
  });

  const client = new Client({ name: 'specflow-mcp-e2e-runner', version: '1.0.0' });
  const stderrLines = [];
  const stderrStream = transport.stderr;
  if (stderrStream) {
    stderrStream.on('data', chunk => {
      stderrLines.push(String(chunk));
    });
  }

  const startedAt = new Date().toISOString();
  await client.connect(transport);

  let response;
  if (tool === 'tools/list') {
    response = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  } else {
    response = await client.request(
      {
        method: 'tools/call',
        params: {
          name: tool,
          arguments: parsedArgs,
        },
      },
      CallToolResultSchema,
    );
  }

  const finishedAt = new Date().toISOString();
  await appendLog(logPath, {
    started_at: startedAt,
    finished_at: finishedAt,
    tool,
    args: parsedArgs,
    response,
    stderr: stderrLines.join(''),
  });

  process.stdout.write(JSON.stringify(response, null, 2));
  process.stdout.write('\n');
  if (stderrLines.length > 0) process.stderr.write(stderrLines.join(''));

  await transport.close();
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
