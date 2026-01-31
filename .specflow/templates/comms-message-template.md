<!--
COMMS Message Template
======================
Filename: {your-agent}-to-{target}-{NNN}.md (e.g., dev-to-architect-001.md)
Location: .specflow/features/{slug}/COMMS/

Purpose: Async inter-agent communication for blocking questions.
Only use when answer is NOT available in existing numbered outputs (1-7).

Status values:
- pending: Awaiting response from target agent
- resolved: Target agent provided answer
- escalated: Target couldn't resolve, needs PM/user

Priority values:
- normal: Standard routing
- urgent: Route immediately (rare - only for blocking security/correctness issues)

blocks field: Set to your agent name if you cannot proceed without answer.
              Leave empty if you can continue with other work.

Filename convention:
- Sequence number is 3 digits, zero-padded (001, 002, 003)
- Count existing {you}-to-{target}-*.md files to determine next number
-->

---
from: ${sender-agent}
to: ${target-agent}
timestamp: ${iso-timestamp}
status: pending
priority: normal
blocks: ${sender-agent-if-blocking}
---

# Question from ${sender-agent} to ${target-agent}

## Question

${Clear question that cannot be answered from existing numbered outputs}

## Context

${Relevant excerpts from outputs you've read - provide enough context that target agent doesn't need to re-read everything}

## Options I See

${Your analysis of possible answers - shows you've thought about it}

1. **Option A** - ${description}
2. **Option B** - ${description}

## Response

<!-- Filled by target agent when status changes to resolved -->
