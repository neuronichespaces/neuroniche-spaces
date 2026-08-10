# NeuroNiche agent roster — operating logic

Ten narrow, single-purpose subagents live in this folder. **The pattern that produces high-quality output is a chain of adversarial specialist passes, not one agent doing everything.** Never delegate a whole feature to one agent and call it done — build, then run it through the review agents relevant to what changed, in order, before shipping.

## The two agent classes

**Build agents** (write code/content):
- `spatial-rendering-engineer` — Babylon.js engine, 2D/3D layers
- `ux-interaction-designer` — flow and hierarchy (proposes; doesn't implement)
- `funding-research` — AU funding data accuracy
- `neuroinclusive-research` — evidence-aligned template content
- `neuroaffirming-copywriter` — user-facing copy

**Adversarial review agents** (find problems in already-written work, don't build):
- `a11y-auditor` — WCAG 2.2 AA
- `non-clinical-content-reviewer` — diagnostic/therapeutic overreach
- `legal-ip-reviewer` — competitor-copying, trademark misuse
- `privacy-security-reviewer` — APP compliance, PII leakage, secrets
- `qa-edge-case-tester` — functional edge cases, real breakage

## Standard chain, by change type

- **UI/spatial change** → `spatial-rendering-engineer` (or `ux-interaction-designer` for flow-only) → `a11y-auditor` → `qa-edge-case-tester`
- **Any user-facing copy** → `neuroaffirming-copywriter` → `non-clinical-content-reviewer` → `legal-ip-reviewer` (only if it touches competitor research or named frameworks)
- **Funding data change** → `funding-research` → `privacy-security-reviewer` (only if new fields touch org/individual data)
- **New template/design guidance** → `neuroinclusive-research` → `legal-ip-reviewer` → `non-clinical-content-reviewer`

A review agent that finds nothing says so in one line — it does not manufacture findings to look thorough. A build agent that gets findings back fixes them and, if the fix is non-trivial, re-runs the same review agent rather than assuming the fix is correct.

## Running it

- **Standalone Claude Code CLI:** dispatch via the `Agent` tool with the relevant `subagent_type`, in the order above. Each pass is a separate call so review agents see the finished diff, not an in-progress one.
- **This repo's actual harness (not the standalone CLI):** the `Agent` tool here only resolves a fixed roster (`ecc:*`, `gsd:*`, and a handful of built-ins) — it does **not** scan `.claude/agents/` for project-defined subagents, so `Agent(subagent_type: "spatial-rendering-engineer")` (or any name above) **hard-errors**. Confirmed 2026-08-10, not a transient bug.
  **Workaround — read-and-embody, not dispatch:** open the matched agent's `.md` file with `Read`, then follow its instructions inline as that persona, as a distinct reasoning pass (build persona first, then each relevant adversarial-review persona), before finishing. State explicitly which persona(s) you adopted. A `UserPromptSubmit` hook in `.claude/settings.json` reinjects this reminder every prompt so the screening step can't be silently skipped.
- **Claude Projects (non-code work):** one project per agent, its system prompt = this file's content, run manually build → review in sequence.
- **Orchestration tools (CrewAI/Gumloop):** only worth it once you're running this chain often enough that manual sequencing is the bottleneck — not needed to start.
