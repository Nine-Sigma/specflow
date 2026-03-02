import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { resolveProjectRoot } from './root.js';
import { assembleContext } from './context.js';
import { handleState } from './state.js';
import { validateArtifact } from './validate.js';
import { VALID_PHASES } from './types.js';
import { handleCodebase, handleImpact } from './intel/index.js';
import { executeWave } from './wave-executor.js';

/**
 * Start the SpecFlow MCP server.
 * stdio transport by default; --port enables HTTP/SSE.
 */
export async function startServer(options: { port?: number } = {}): Promise<McpServer> {
  const server = new McpServer(
    {
      name: 'specflow',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Resolve project root once at startup
  let projectRoot: string | null = null;

  async function getProjectRoot(): Promise<string> {
    if (!projectRoot) {
      projectRoot = await resolveProjectRoot();
    }
    if (!projectRoot) {
      throw new Error('No SpecFlow project found. Run `npx specflow init` to initialize.');
    }
    return projectRoot;
  }

  // Helper to get active feature from state
  async function getActiveFeature(root: string): Promise<string | null> {
    const state = await handleState('read', undefined, root);
    return (state.feature as string) || null;
  }

  async function getScope(root: string): Promise<string | null> {
    const state = await handleState('read', undefined, root);
    return (state.scope as string) || null;
  }

  // --- Tool: specflow_context ---
  server.tool(
    'specflow_context',
    'Get scoped context (persona, expertise, artifacts) for a workflow phase',
    {
      phase: z.string().describe(`Workflow phase name (${[...VALID_PHASES].join(', ')})`),
      strict: z.boolean().optional().describe('When true, missing required artifacts return an error instead of a warning'),
    },
    async ({ phase, strict }) => {
      const root = await getProjectRoot();
      const activeFeature = await getActiveFeature(root);
      const scope = await getScope(root);
      const result = await assembleContext(phase, root, activeFeature, scope, strict ? { strict } : undefined);

      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // --- Tool: specflow_state ---
  server.tool(
    'specflow_state',
    'Read/write workflow state and sprint-status',
    {
      action: z.enum(['read', 'start', 'start_or_resume', 'update', 'complete', 'resume', 'stories', 'waves', 'next-wave'])
        .describe('State action to perform'),
      data: z.record(z.unknown()).optional()
        .describe('Data payload for the action (required for start, update, complete, stories)'),
    },
    async ({ action, data }) => {
      const root = await getProjectRoot();
      const result = await handleState(action, data, root);

      if ('error' in result && result.error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // --- Tool: specflow_validate ---
  server.tool(
    'specflow_validate',
    'Validate phase output artifact (existence, quality, requirement coverage)',
    {
      phase: z.string().describe(`Workflow phase to validate`),
    },
    async ({ phase }) => {
      const root = await getProjectRoot();
      const activeFeature = await getActiveFeature(root);
      const scope = await getScope(root);
      const result = await validateArtifact(phase, root, activeFeature, scope);

      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // --- Tool: specflow_codebase ---
  server.tool(
    'specflow_codebase',
    'Query codebase structure: scan project, list symbols, trace dependencies, detect patterns',
    {
      action: z.enum(['scan', 'symbols', 'dependencies', 'patterns', 'reindex', 'warmup'])
        .describe('Query action to perform'),
      params: z.record(z.unknown()).optional()
        .describe('Action-specific parameters (e.g., { path: "src/", kind: "function" } for symbols)'),
    },
    async ({ action, params }) => {
      const root = await getProjectRoot();
      const result = await handleCodebase(action, params, root);

      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // --- Tool: specflow_impact ---
  server.tool(
    'specflow_impact',
    'Analyze blast radius: find all code affected by changing a symbol',
    {
      symbol: z.string().describe('Symbol name or partial match (e.g. "OrderService.createOrder" or "createOrder")'),
      depth: z.number().optional().default(2).describe('How many levels of callers to traverse (default: 2)'),
    },
    async ({ symbol, depth }) => {
      const root = await getProjectRoot();
      const result = await handleImpact(symbol, depth, root);

      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // --- Tool: specflow_execute_wave ---
  server.tool(
    'specflow_execute_wave',
    'Execute a wave of parallel CLI agents (dev stories, QA tickets, or pillar agents) with git worktree isolation',
    {
      type: z.enum(['dev', 'qa', 'pillars', 'cleanup']).describe('Wave type: dev (story wave), qa (verification wave), pillars (security/cost/ux), cleanup (remove orphaned worktrees)'),
      cli: z.string().optional().describe('CLI override (claude or copilot). Auto-detected if omitted'),
      timeout_ms: z.number().optional().default(600000).describe('Per-process timeout in milliseconds (default: 600000 = 10 min)'),
      max_concurrent: z.number().optional().default(5).describe('Maximum concurrent processes (default: 5)'),
    },
    async (params) => {
      const root = await getProjectRoot();
      const activeFeature = await getActiveFeature(root);
      const scope = await getScope(root);
      const result = await executeWave(params, root, activeFeature, scope);

      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  // Start transport
  if (options.port) {
    // HTTP/SSE transport
    const http = await import('http');
    const httpServer = http.createServer();

    const transports = new Map<string, SSEServerTransport>();

    httpServer.on('request', async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${options.port}`);

      if (url.pathname === '/sse') {
        const transport = new SSEServerTransport('/messages', res);
        transports.set(transport.sessionId, transport);
        await server.connect(transport);
      } else if (url.pathname === '/messages') {
        const sessionId = url.searchParams.get('sessionId');
        const transport = sessionId ? transports.get(sessionId) : undefined;
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.writeHead(400);
          res.end('Invalid session');
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Error: Port ${options.port} is already in use`);
          process.exit(1);
        }
        reject(err);
      });
      httpServer.listen(options.port, () => {
        console.error(`SpecFlow MCP server listening on port ${options.port}`);
        resolve();
      });
    });
  } else {
    // stdio transport (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  return server;
}
