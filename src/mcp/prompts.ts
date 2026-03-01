/**
 * Format conversion for SpecFlow prompt templates.
 *
 * Generates platform-specific prompt files from canonical templates:
 * - Claude Code: .claude/commands/sf-*.md (Task() syntax, no frontmatter)
 * - Copilot: .github/agents/sf-*.md (runSubagent() syntax, YAML frontmatter)
 */

/** All SpecFlow agent names for prompt generation */
export const AGENT_NAMES = [
  'analyst',
  'architect',
  'security',
  'cost',
  'ux',
  'tea',
  'dev',
  'dev-story',
  'qa',
  'review',
  'brainstorm',
] as const;

/** Phase names corresponding to each agent */
const AGENT_PHASE_MAP: Record<string, string> = {
  analyst: 'analyst',
  architect: 'architect',
  security: 'security',
  cost: 'cost',
  ux: 'ux',
  tea: 'tea',
  dev: 'dev-story',
  'dev-story': 'dev-story',
  qa: 'qa-verify',
  review: 'review',
  brainstorm: 'brainstorm',
};

/** MCP tools available to agents */
const AGENT_TOOLS = [
  'specflow_context',
  'specflow_state',
  'specflow_validate',
];

const COPILOT_EDITOR_TOOLS = [
  'editFiles',
  'fetchWebpage',
];

// ================================================================
// Canonical PM prompt template with {{SPAWN}} placeholders
// ================================================================

export const CANONICAL_PM_PROMPT = `You are the SpecFlow PM (John) — the orchestration brain for feature development.

## Your Role

You orchestrate the workflow by routing work to specialized agents, making routing decisions, and engaging the user only for big decisions. You do NOT perform agent work yourself — you delegate.

## Startup

1. Call \`specflow_state("resume")\` to check for in-progress work
2. If active workflow exists, pick up where it left off
3. If no workflow, greet the user and wait for a feature description

## Workflow Graph

\`\`\`
triage → scope → analyst → codebase-analysis → architect
  → [security + cost + ux] (parallel, scope-dependent)
  → tea (sequential, after pillars)
  → synthesis → execution-routing
  → [qa-tdd OR story-generation]
  → [dev-story waves] → checkpoint-dev → [drift-fix-dev]
  → [qa-verify waves] → checkpoint-qa → [drift-fix-qa]
  → review (parallel skills)
  → complete
\`\`\`

## Phase Execution Pattern

For each phase:
1. Call \`specflow_state("update", { phase: "<phase>", agent: "<agent>" })\` to record transition
2. {{SPAWN:phase}} — spawn the agent for this phase
3. Review the agent's output
4. Call \`specflow_state("complete", { phase: "<phase>" })\` to mark done
5. Route to next phase based on workflow graph

## Parallel Phases

### Post-Architect Pillars (scope-dependent)
Based on scope level, spawn applicable pillar agents in parallel:
- medium+: security, cost
- large+: security, cost, ux

{{SPAWN:parallel_pillars}}

### Dev Story Waves
Call \`specflow_state("next-wave")\` to get ready stories, then spawn all in parallel:

{{SPAWN:dev_wave}}

### QA Verification Waves
Same pattern as dev waves for QA tickets:

{{SPAWN:qa_wave}}

### Review Skills
Spawn review skills in parallel:

{{SPAWN:review}}

## Scope Assessment

After triage, assess scope:
| Level | Files | Pillars |
|-------|-------|---------|
| trivial | 1 | None |
| small | 1-3 | Testing only |
| medium | 3-10 | Security + Testing |
| large | 10+ | All pillars |
| complex | Many | All + Research |

Call \`specflow_state("update", { scope: "<level>", pillars: [...] })\` to record.

## Drift Detection

After dev and QA phases, call \`specflow_validate("<phase>")\` to check:
- Artifact exists and has quality content
- Requirement IDs are covered
- No invented identifiers

If validation fails, decide: re-run, escalate to user, or proceed with warning.

## User Engagement

Only engage the user for:
- Scope confirmation (medium+ features)
- Ambiguous requirements
- Drift decisions that need human judgment
- Final review sign-off

## State Commands

- \`specflow_state("start", { feature: "slug", description: "..." })\` — new feature
- \`specflow_state("update", { phase, agent, scope, pillars })\` — transition
- \`specflow_state("complete", { phase: "..." })\` — mark phase done
- \`specflow_state("resume")\` — session recovery
- \`specflow_state("stories")\` — sprint status
- \`specflow_state("next-wave")\` — next wave of stories
`;

// ================================================================
// Thin agent prompt template
// ================================================================

export const THIN_AGENT_BODY = (phase: string) =>
  `1. Call \`specflow_context("${phase}")\` to get your persona, expertise, and feature artifacts
2. Adopt the persona and follow the methodology in the returned expertise
3. Write your analysis/output to the \`output_path\` specified in the context response
4. Call \`specflow_validate("${phase}")\` to verify your output
5. Report your findings summary back to the parent agent
`;

// ================================================================
// Platform-specific generators
// ================================================================

/**
 * Generate Claude Code PM prompt (Task() syntax, no frontmatter).
 */
export function generateClaudeCodePM(): string {
  return replaceSpawnPlaceholders(CANONICAL_PM_PROMPT, 'claude');
}

/**
 * Generate Copilot PM prompt (runSubagent() syntax, YAML frontmatter).
 */
export function generateCopilotPM(): string {
  const frontmatter = `---
tools:
  - agent
  - specflow_context
  - specflow_state
  - specflow_validate
  - editFiles
  - fetchWebpage
agents:
${AGENT_NAMES.map(a => `  - sf-${a}`).join('\n')}
---

`;

  return frontmatter + replaceSpawnPlaceholders(CANONICAL_PM_PROMPT, 'copilot');
}

function replaceSpawnPlaceholders(prompt: string, platform: 'claude' | 'copilot'): string {
  const spawn = platform === 'claude'
    ? (agent: string, phase: string, desc: string) =>
      `Task(subagent_type="general-purpose", prompt="Call specflow_context('${phase}') for context. ${desc}", description="${desc}")`
    : (agent: string, phase: string, desc: string) =>
      `runSubagent(agent="sf-${agent}", prompt="Call specflow_context('${phase}') for context. ${desc}")`;

  let result = prompt;

  result = result.replace('{{SPAWN:phase}}', `Spawn the agent:
\`\`\`
${spawn('<agent>', '<phase>', 'Execute <phase> phase')}
\`\`\``);

  result = result.replace('{{SPAWN:parallel_pillars}}', `Spawn pillar agents in parallel:
\`\`\`
${spawn('security', 'security', 'Security analysis')}
${spawn('cost', 'cost', 'Cost analysis')}
${spawn('ux', 'ux', 'UX design')}
\`\`\``);

  result = result.replace('{{SPAWN:dev_wave}}', `Spawn all stories in the wave:
\`\`\`
// For each story from next-wave:
${spawn('dev-story', 'dev-story', 'Implement story <id>')}
\`\`\``);

  result = result.replace('{{SPAWN:qa_wave}}', `Spawn QA tickets:
\`\`\`
${spawn('qa', 'qa-verify', 'Verify story <id>')}
\`\`\``);

  result = result.replace('{{SPAWN:review}}', `Spawn review skills:
\`\`\`
${spawn('review', 'review', 'Code review')}
\`\`\``);

  return result;
}

/**
 * Generate Claude Code thin agent prompt (body only, no frontmatter).
 */
export function generateClaudeCodeAgent(agentName: string): string {
  const phase = AGENT_PHASE_MAP[agentName] || agentName;
  return THIN_AGENT_BODY(phase);
}

/**
 * Generate Copilot thin agent prompt (YAML frontmatter + body).
 */
export function generateCopilotAgent(agentName: string): string {
  const phase = AGENT_PHASE_MAP[agentName] || agentName;
  const tools = [...AGENT_TOOLS, ...COPILOT_EDITOR_TOOLS];

  const frontmatter = `---
name: sf-${agentName}
user-invokable: false
tools:
${tools.map(t => `  - ${t}`).join('\n')}
---

`;

  return frontmatter + THIN_AGENT_BODY(phase);
}

/**
 * Extract routing logic from a PM prompt (strip frontmatter and spawn syntax).
 * Used for drift detection tests.
 */
export function extractRoutingLogic(prompt: string): string {
  // Strip YAML frontmatter
  let body = prompt.replace(/^---\n[\s\S]*?\n---\n\n?/, '');

  // Normalize spawn syntax differences — match entire call on the line
  body = body
    .replace(/^.*Task\(.*\).*$/gm, '{{SPAWN_LINE}}')
    .replace(/^.*runSubagent\(.*\).*$/gm, '{{SPAWN_LINE}}');

  return body;
}
