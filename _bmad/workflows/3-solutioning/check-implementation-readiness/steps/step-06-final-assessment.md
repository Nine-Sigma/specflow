---
name: 'step-06-final-assessment'
description: 'Compile final assessment and polish the readiness report'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/3-solutioning/implementation-readiness'

# File References
thisStepFile: './step-06-final-assessment.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

<!--
BMAD Methodology IDs exposed in this file:
- readiness-checklist: Final assessment and recommendation format

SpecFlow agents reference via: {file}#methodology-id
-->

# Step 6: Final Assessment

<bmad-orchestration>

## STEP GOAL:

To provide a comprehensive summary of all findings and give the report a final polish, ensuring clear recommendations and overall readiness status.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- NEVER generate content without user input
- CRITICAL: Read the complete step file before taking any action
- You are at the final step - complete the assessment
- YOU ARE A FACILITATOR, not a content generator
- YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- You are delivering the FINAL ASSESSMENT
- Your findings are objective and backed by evidence
- Provide clear, actionable recommendations
- Success is measured by value of findings

### Step-Specific Rules:

- Compile and summarize all findings
- Don't soften the message - be direct
- Provide specific examples for problems
- Add final section to the report

## EXECUTION PROTOCOLS:

- Review all findings from previous steps
- Add summary and recommendations
- Determine overall readiness status
- Complete and present final report

## FINAL ASSESSMENT PROCESS:

### 1. Initialize Final Assessment

"Completing **Final Assessment**.

I will now:

1. Review all findings from previous steps
2. Provide a comprehensive summary
3. Add specific recommendations
4. Determine overall readiness status"

### 2. Review Previous Findings

Check the {outputFile} for sections added by previous steps:

- File and FR Validation findings
- UX Alignment issues
- Epic Quality violations

</bmad-orchestration>

<bmad-methodology id="readiness-checklist">

## Implementation Readiness Assessment

### Overall Readiness Status

Determine one of:
- **READY**: All critical requirements covered, no blocking issues
- **NEEDS WORK**: Some issues require attention before implementation
- **NOT READY**: Critical gaps prevent implementation

### Critical Issues Requiring Immediate Action

List issues that must be addressed before proceeding:
- [Specific blocking issue 1]
- [Specific blocking issue 2]

### Recommended Next Steps

Provide actionable recommendations:
1. [Specific action item 1]
2. [Specific action item 2]
3. [Specific action item 3]

### Assessment Summary

Format: "This assessment identified [X] issues across [Y] categories. Address the critical issues before proceeding to implementation."

### Evidence Required

For each finding:
- Document source (which artifact, which section)
- Specific gap or issue
- Impact level (critical/high/medium)
- Recommended resolution

</bmad-methodology>

<bmad-orchestration>

### 4. Complete the Report

- Ensure all findings are clearly documented
- Verify recommendations are actionable
- Add date and assessor information
- Save the final report

### 5. Present Completion

Display:
"**Implementation Readiness Assessment Complete**

Report generated: {outputFile}

The assessment found [number] issues requiring attention. Review the detailed report for specific findings and recommendations."

## WORKFLOW COMPLETE

The implementation readiness workflow is now complete. The report contains all findings and recommendations for the user to consider.

Implementation Readiness complete. Read fully and follow: `_bmad/core/tasks/bmad-help.md` with argument `implementation readiness`.

---

## SYSTEM SUCCESS/FAILURE METRICS

### SUCCESS:

- All findings compiled and summarized
- Clear recommendations provided
- Readiness status determined
- Final report saved

### FAILURE:

- Not reviewing previous findings
- Incomplete summary
- No clear recommendations

</bmad-orchestration>
