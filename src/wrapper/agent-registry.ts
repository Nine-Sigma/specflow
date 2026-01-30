import { z } from 'zod';

// Agent source types
export const AgentSourceSchema = z.enum(['bmad', 'ralph', 'specflow', 'custom']);
export type AgentSource = z.infer<typeof AgentSourceSchema>;

// Agent definition
export const AgentDefinitionSchema = z.object({
  source: AgentSourceSchema,
  invoke: z.string(),
  description: z.string().optional(),
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// Agent registry map
export const AgentRegistrySchema = z.record(z.string(), AgentDefinitionSchema);
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;

// Agent context passed to runners
export interface AgentContext {
  workItem?: string;
  options?: Record<string, unknown>;
}

// Agent execution result
export interface AgentResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Placeholder - will be populated in 10-04
export const agents: AgentRegistry = {};
