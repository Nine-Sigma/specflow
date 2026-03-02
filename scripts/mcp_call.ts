import { appendFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

interface Args {
  tool?: string;
  rawArgs?: string;
  logPath?: string;
}

function parseArgs(argv: string[]): Args {
  const result: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--tool') {
      result.tool = argv[++i];
    } else if (token === '--args') {
      result.rawArgs = argv[++i];
    } else if (token === '--log') {
      result.logPath = argv[++i];
    }
  }
  return result;
}

async function appendLog(logPath: string | undefined, entry: unknown): Promise<void> {
  if (!logPath) return;
  const absolute = resolve(logPath); // nosemgrep: path-join-resolve-traversal
  await mkdir(dirname(absolute), { recursive: true });
  await appendFile(absolute, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const { tool, rawArgs, logPath } = parseArgs(process.argv.slice(2));
  if (!tool) {
    console.error('Usage: tsx scripts/mcp_call.ts --tool <name|tools/list> [--args \'{"k":"v"}\'] [--log path]');
    process.exit(2);
  }

  let parsedArgs: Record<string, unknown> = {};
  if (rawArgs) {
    try {
      parsedArgs = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch (err) {
      console.error(`Invalid JSON for --args: ${(err as Error).message}`);
      process.exit(2);
    }
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('node_modules/tsx/dist/cli.mjs'), 'src/cli.ts', 'serve'],
    cwd: process.cwd(),
    stderr: 'pipe',
  });

  const client = new Client({ name: 'specflow-mcp-e2e-runner', version: '1.0.0' });
  const stderrLines: string[] = [];
  const stderrStream = transport.stderr;
  if (stderrStream) {
    stderrStream.on('data', chunk => {
      stderrLines.push(String(chunk));
    });
  }

  const startedAt = new Date().toISOString();
  await client.connect(transport);

  let response: unknown;
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
  if (stderrLines.length > 0) {
    process.stderr.write(stderrLines.join(''));
  }

  await transport.close();
}

main().catch(async (err: unknown) => {
  console.error((err as Error).stack || (err as Error).message);
  process.exit(1);
});
