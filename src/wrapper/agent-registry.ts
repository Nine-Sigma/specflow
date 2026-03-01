import { z } from 'zod';

// Agent source types
// - bmad: BMAD method agents (via slash commands)
//- specflow: SpecFlow utilities (tracker operations)
// - custom: User-defined agents (npx or local prompts)
// - skill: External skills (SKILL.md entry point)
export const AgentSourceSchema = z.enum(['bmad', 'specflow', 'custom', 'skill']);
export type AgentSource = z.infer<typeof AgentSourceSchema>;

// Agent definition
export const AgentDefinitionSchema = z.object({
  source: AgentSourceSchema,
  invoke: z.string(),
  description: z.string().optional(),
  // SpecFlow context to inject before BMAD agent invocation
  specflowContext: z.string().optional(),
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// Agent registry map
export const AgentRegistrySchema = z.record(z.string(), AgentDefinitionSchema);
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;

// Agent context passed to runners
export interface AgentContext {
  workItem?: string;
  options?: Record<string, unknown>;
  cwd?: string;
  specflowContext?: string; // Injected by /sf:* wrappers
}

// Agent execution result
export interface AgentResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Default agent registry - ALL are BMAD agents (SpecFlow context added by wrappers)
export const defaultAgents: AgentRegistry = {
  // BMAD Core Agents
  analyst: { source: 'bmad', invoke: '/analyst', description: 'Product analysis' },
  architect: { source: 'bmad', invoke: '/architect', description: 'Architecture decisions' },
  pm: { source: 'bmad', invoke: '/pm', description: 'Project management' },
  dev: { source: 'bmad', invoke: '/dev', description: 'Development tasks' },
  qa: { source: 'bmad', invoke: '/qa', description: 'Quality assurance' },
  tea: { source: 'bmad', invoke: '/tea', description: 'Test architect' },

  // BMAD Cloud-Architecture Agents (SpecFlow pillars)
  security: { source: 'bmad', invoke: '/cloud-security', description: 'Security analysis (Jordan)' },
  cost: { source: 'bmad', invoke: '/cloud-cost', description: 'Cost estimation (Taylor)' },

  // BMAD Full Planning Path
  'product-brief': { source: 'bmad', invoke: '/product-brief', description: 'Initial product vision' },
  'create-prd': { source: 'bmad', invoke: '/create-prd', description: 'Create PRD from brief' },
  'create-architecture': {
    source: 'bmad',
    invoke: '/create-architecture',
    description: 'Create technical architecture',
  },
  'create-epics-and-stories': {
    source: 'bmad',
    invoke: '/create-epics-and-stories',
    description: 'Break down into epics and stories',
  },
  'sprint-planning': { source: 'bmad', invoke: '/sprint-planning', description: 'Plan sprint from backlog' },
  'create-story': { source: 'bmad', invoke: '/create-story', description: 'Create story details' },
  'dev-story': { source: 'bmad', invoke: '/dev-story', description: 'Develop a story' },
  'code-review': { source: 'bmad', invoke: '/code-review', description: 'Review code changes' },

  // Tracker Operations (SpecFlow utilities)
  issue: { source: 'specflow', invoke: 'src/trackers/index.ts', description: 'GitHub issue management' },
  pr: { source: 'specflow', invoke: 'src/trackers/index.ts', description: 'Pull request management' },
  sync: { source: 'specflow', invoke: 'src/trackers/index.ts', description: 'Sync with tracker' },
  scrum: { source: 'specflow', invoke: 'src/trackers/index.ts', description: 'Scrum ticket management' },
};
