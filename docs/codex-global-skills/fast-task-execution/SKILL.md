---
name: fast-task-execution
description: Scope and execute a coding task efficiently when the user asks for a faster, focused implementation workflow or reports repeated exploration, tests, screenshots, or debugging loops. Use across development projects; project rules take priority.
---

# Fast task execution

Choose the smallest workflow that can complete the request safely. Follow the current project's instructions and preserve its security and deployment boundaries.

| Mode | Typical change | Work and verification |
| --- | --- | --- |
| FAST | Clear, isolated copy, style, UI or small code edit | Locate the owner file and direct dependencies, implement directly, run the smallest relevant check. |
| STANDARD | Behavior, flow, integration or moderate refactor | Trace the affected path, implement, run type/build and targeted tests; inspect UI once if visual risk warrants it. |
| CRITICAL | Security, auth, payments, persistence migration, production data or broad compatibility | Identify trust boundaries and rollback concerns, use broader validation proportional to risk, honor explicit approvals. |

Start with the task's completion condition. Search the narrowest known area first; use repository maps or filename search only when the owner is unknown. Read relevant context once and expand only when evidence points elsewhere. Do not create a planning document for a clear FAST task.

When a check fails, capture the first actionable error, form one cause hypothesis and test it. After a fix, rerun the affected check. If repeated attempts produce no new evidence, stop the loop, report the blocker and the last useful result. Avoid repeated full suites, browser screenshots and documentation browsing without a new question to answer.

Finish with the changed files, checks actually run, and any remaining risk or blocker in a short report. This skill changes task discipline; it does not promise measured speed gains or waive necessary tests.
