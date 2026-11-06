# Codex skills setup

Project skills are Git-versioned under `.agents/skills/`. Codex discovers their `SKILL.md` entry points from a repository checkout. Load a skill only for its stated trigger; project rules in `AGENTS.md` and the existing game architecture take precedence over generic examples.

## Pinned sources

| Scope | Skills | Source and revision | License |
| --- | --- | --- | --- |
| Project | `game-feel`, `game-ui-ux`, `audio-design`, `dialogue-systems`, `save-systems`, `input-systems`, `performance-optimization`, `create-game-assets`, `prototype-fast` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) at `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`; copied from matching directories under `skills/` | Apache-2.0; `.agents/skills/GAMEDEV_LICENSE.txt` |
| Project | `gsap-core`, `gsap-timeline` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) at `aed9cfd3277740755f6bfc1155c7aa645403b760`; copied from `skills/` | MIT; `.agents/skills/GSAP_LICENSE.txt` |
| Global | `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) at `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`, `skills/react-best-practices` | MIT, as declared in the repository README and skill metadata |
| Global | `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) at `2c5958ecac7cee2b583967a2c4981d0f4a75c579`, `skills/frontend-design` | Apache-2.0; `LICENSE.txt` in the skill |

The global skills are installed in the current user's `~/.agents/skills/`; they are not committed to this repository. Existing official/bundled Codex skills remain in their managed directories. The third-party skills were copied as source files; no installer or skill script was executed. `create-game-assets` includes optional Python tools that require Pillow if used later.

## Second Windows laptop

Clone this repository at the intended branch to obtain all project skills. To reproduce the two global skills, run these PowerShell commands in a temporary working directory after checking that the destination names do not already exist:

```powershell
git clone https://github.com/vercel-labs/agent-skills.git vercel-agent-skills
git -C vercel-agent-skills checkout 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62
git clone https://github.com/anthropics/skills.git anthropic-skills
git -C anthropic-skills checkout 2c5958ecac7cee2b583967a2c4981d0f4a75c579
New-Item -ItemType Directory -Force "$HOME/.agents/skills" | Out-Null
Copy-Item vercel-agent-skills/skills/react-best-practices "$HOME/.agents/skills/react-best-practices" -Recurse
Copy-Item anthropic-skills/skills/frontend-design "$HOME/.agents/skills/frontend-design" -Recurse
```

Restart or start a new Codex chat after installing global skills so their names and descriptions are discovered. Check `SKILL.md` in each destination. If the laptop already has a skill of the same name, compare it before replacing it.

## Workflow and selection

For a narrow task, use `docs/GAME_REGISTRY.md` or the map in `docs/PROJECT_CONTEXT.md`, then open only the affected source and direct dependencies. `AGENTS.md` defines FAST, STANDARD and CRITICAL verification. The default local Codex configuration inspected on 2026-11-07 was `gpt-6-sol` with `model_reasoning_effort = "medium"`; this task did not change the global model or effort. For an isolated simple task, a lower effort may be selected per chat if the Codex UI supports it. Keep medium or higher for ambiguous, cross-boundary and critical work. No measured latency improvement is claimed from this choice.

Use `react-best-practices` for React performance work, `frontend-design` for new or substantially redesigned UI, and project skills for the matching game discipline. Follow project-specific save, routing, dialogue and asset rules before generic skill examples. Existing game-studio, CodeRabbit and Superpowers plugins already provide engine, review and debugging workflows; they were not duplicated here.

Use the GSAP skills only where the affected game already uses GSAP or the task explicitly chooses it. Keep Framer Motion or CSS where those are the existing implementation; a skill's library preference is not a migration instruction.

## Scope decisions

`puzzle`, `visual-novel` and `level-design` were reviewed but not installed: their grid puzzle or full-game/level workflows do not fit a current scoped implementation need. Vercel `composition-patterns` was skipped because it includes React 19 guidance while this project uses React 18; `web-design-guidelines` and Anthropic `webapp-testing` duplicate existing review/testing workflows. Unity, Unreal, Godot, Roblox, Phaser, Pixi and Three.js engine skills were skipped because no installed game uses those engines. The existing Superpowers package was left managed by Codex; its broad mandatory workflows were not copied into the project or global skill directory. No custom skill was needed because `AGENTS.md` and the selected skills cover the requested situations without extra routing overhead.

GreenSock `gsap-react` was not installed because its examples introduce `@gsap/react`, which this project does not depend on. `gsap-performance` overlaps the installed game performance guidance. Motion's newer agent kit targets the `motion` package; the project currently depends on `framer-motion`, so it was not copied without a version-specific review.
