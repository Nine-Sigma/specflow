# PM Elicitation Guide

When to use advanced elicitation techniques with users.

## Decision Tree: When to Engage User

```
Is this a big decision?
│
├─ Scope >= large? ──────────────────────────→ YES → Engage user
├─ Security pillar on auth/payment/PII? ─────→ YES → Engage user
├─ Multiple valid approaches with trade-offs? → YES → Engage user
├─ Agent flagged uncertainty? ───────────────→ YES → Evaluate, maybe engage
├─ Requirements ambiguous? ──────────────────→ YES → Engage user
├─ Cost exceeds $X/month? ───────────────────→ YES → Engage user
│
└─ None of the above? ───────────────────────→ NO → PM decides, proceed
```

## Technique Selection by Situation

### When Scope is Unclear

**Use: 5 Whys Deep Dive**

Ask "why" repeatedly to drill to root cause:
1. "Why do you need this feature?"
2. "Why is that important?"
3. "Why can't users do X instead?"
4. "Why would that not work?"
5. "Why is that the constraint?"

**Outcome:** Clear understanding of actual need vs. perceived solution

---

### When Requirements Conflict

**Use: Stakeholder Round Table**

Frame the conflict as multiple perspectives:
- "From the user's perspective, they want..."
- "From the business perspective, we need..."
- "From the technical perspective, the constraint is..."
- "How do we balance these?"

**Outcome:** Aligned understanding of trade-offs

---

### When Risk is High

**Use: Pre-Mortem Analysis**

> "Imagine it's 3 months from now and this feature failed spectacularly. What went wrong?"

Walk through failure scenarios:
- Technical failure
- User rejection
- Security incident
- Compliance issue
- Resource constraint

**Outcome:** Proactive risk identification and mitigation

---

### When Architecture Has Multiple Valid Paths

**Use: Architecture Decision Record (ADR) Format**

Present as structured decision:
```
## Decision: {topic}

### Context
{Why we need to decide this}

### Options Considered
1. **Option A**: {description}
   - Pros: {benefits}
   - Cons: {drawbacks}

2. **Option B**: {description}
   - Pros: {benefits}
   - Cons: {drawbacks}

### Recommendation
{Which option and why}

### Your Call
Which approach should we take?
```

**Outcome:** Informed user decision with documented rationale

---

### When Innovation is Needed

**Use: First Principles Analysis**

Strip away assumptions:
1. "What do we know for certain about this problem?"
2. "What are we assuming that might not be true?"
3. "If we started from scratch, how would we solve this?"
4. "What's the simplest possible solution?"

**Outcome:** Creative solutions beyond conventional approaches

---

### When User is Stuck

**Use: What If Scenarios**

Explore radical possibilities:
- "What if we had unlimited budget?"
- "What if we only had one week?"
- "What if the opposite were true?"
- "What if we didn't build this at all?"

**Outcome:** Breaks through analysis paralysis

---

### When Validating Understanding

**Use: Critique and Refine**

Summarize and validate:
1. "Here's what I understand: {summary}"
2. "The key requirements are: {list}"
3. "The main constraints are: {list}"
4. "What am I missing or getting wrong?"

**Outcome:** Confirmed shared understanding

## Quick Reference: Top 10 Techniques

| Situation | Technique | One-liner |
|-----------|-----------|-----------|
| Unclear scope | 5 Whys | Drill to root cause |
| Conflicting needs | Stakeholder Round Table | Balance perspectives |
| High risk | Pre-Mortem | Imagine future failure |
| Multiple options | ADR Format | Structure the decision |
| Need innovation | First Principles | Strip assumptions |
| User stuck | What If Scenarios | Explore radical options |
| Validate understanding | Critique and Refine | Summarize and check |
| Technical decision | Red Team vs Blue Team | Adversarial analysis |
| Complex system | Tree of Thoughts | Multiple reasoning paths |
| Quick sanity check | Occam's Razor | Simplest explanation |

## How to Present to User

**DO:**
- Frame as collaborative exploration
- Present options with trade-offs
- Ask open-ended questions
- Summarize and confirm understanding
- Make your recommendation clear

**DON'T:**
- Overwhelm with too many questions
- Present without recommendation
- Use jargon without explanation
- Skip the "why" behind options
- Force a decision without context

## Example User Engagement

```markdown
## Scope Confirmation: Add Password Reset

I've assessed this as **medium scope** based on:
- 5-7 files touched (email service, auth controller, UI)
- New external service integration (email provider)
- Security-adjacent (auth flow)

This means we'll do:
- Standard spec (8-12 acceptance criteria)
- Standard architecture (API contracts, flow diagram)
- Light security review (key risks)
- Basic cost estimate

**Does this feel right for what you're building?**

- [Approve] Proceed with medium scope
- [Adjust] I think this should be {smaller/larger}
- [Discuss] I have questions about the approach
```
