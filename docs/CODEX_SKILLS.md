# Codex skills setup

Project skills are Git-versioned under `.agents/skills/`; global skills live under `~/.agents/skills/`. Codex sees skill names and descriptions for discovery, then loads only selected skill bodies. Use the narrowest relevant skill. Project rules, the target game's architecture and user instructions take precedence over generic examples. Future engine skills do not authorize migrating the seven current games.

## Pinned sources

| Scope | Skills | Source and revision | License |
| --- | --- | --- | --- |
| Project | `game-feel`, `game-ui-ux`, `audio-design`, `dialogue-systems`, `save-systems`, `input-systems`, `performance-optimization`, `create-game-assets`, `prototype-fast` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) at `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`; copied from matching directories under `skills/` | Apache-2.0; `.agents/skills/GAMEDEV_LICENSE.txt` |
| Project | `gsap-core`, `gsap-timeline` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) at `aed9cfd3277740755f6bfc1155c7aa645403b760`; copied from `skills/` | MIT; `.agents/skills/GSAP_LICENSE.txt` |
| Project | `camera-systems`, `game-ai`, `ai-behavior-trees-utility-ai`, `level-design`, `physics-tuning`, `procedural-gen`, `shader-programming` | Same GameDev revision, `skills/disciplines/<name>` | Apache-2.0 |
| Project | `phaser-core`, `phaser-arcade-physics`, `pixijs-rendering`, `threejs-scene-setup`, `threejs-materials-lighting`, `threejs-gltf-loading` | Same GameDev revision, `skills/web-engines/<name>` | Apache-2.0 |
| Project | `card-game`, `platformer`, `puzzle`, `visual-novel` | Same GameDev revision, `skills/genres/<name>` | Apache-2.0 |
| Project | `gsap-performance` | Same GreenSock revision, `skills/gsap-performance` | MIT |
| Project, custom | `mobile-first-game-ux`, `fast-game-prototyping`, `react-three-fiber-future` | Authored in this repository under `.agents/skills/` | Project-owned |
| Global | `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) at `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`, `skills/react-best-practices` | MIT, as declared in the repository README and skill metadata |
| Global | `web-design-guidelines` | Same Vercel revision, `skills/web-design-guidelines` | MIT, as declared in the repository README |
| Global | `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) at `2c5958ecac7cee2b583967a2c4981d0f4a75c579`, `skills/frontend-design` | Apache-2.0; `LICENSE.txt` in the skill |
| Global | `motion-design` | [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) at `f9a8a041b85185ee4881b3471d3415e939aac772`, `skills/motion-design` | MIT; copied `LICENSE.txt` |
| Global, custom | `fast-task-execution` | Canonical copy in `docs/codex-global-skills/fast-task-execution/`, installed in `~/.agents/skills/` | Project-owned |

Third-party files were reviewed and copied; no remote installer or skill script was executed. `create-game-assets` includes optional Python asset tools requiring Pillow only if used later. No application dependency was installed. Existing managed Codex plugins remain untouched.

## Second Windows laptop

Clone this repository at the intended branch to obtain all project skills and the canonical global `fast-task-execution` source. To reproduce third-party global skills, run these PowerShell commands in a temporary directory after checking that the destination names do not already exist:

```powershell
git clone https://github.com/vercel-labs/agent-skills.git vercel-agent-skills
git -C vercel-agent-skills checkout 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62
git clone https://github.com/anthropics/skills.git anthropic-skills
git -C anthropic-skills checkout 2c5958ecac7cee2b583967a2c4981d0f4a75c579
git clone https://github.com/LottieFiles/motion-design-skill.git lottie-motion
git -C lottie-motion checkout f9a8a041b85185ee4881b3471d3415e939aac772
$analystCheckout = Read-Host 'Path to The Analyst checkout'
New-Item -ItemType Directory -Force "$HOME/.agents/skills" | Out-Null
Copy-Item vercel-agent-skills/skills/react-best-practices "$HOME/.agents/skills/react-best-practices" -Recurse
Copy-Item vercel-agent-skills/skills/web-design-guidelines "$HOME/.agents/skills/web-design-guidelines" -Recurse
Copy-Item anthropic-skills/skills/frontend-design "$HOME/.agents/skills/frontend-design" -Recurse
Copy-Item lottie-motion/skills/motion-design "$HOME/.agents/skills/motion-design" -Recurse
Copy-Item lottie-motion/LICENSE "$HOME/.agents/skills/motion-design/LICENSE.txt"
Copy-Item (Join-Path $analystCheckout 'docs/codex-global-skills/fast-task-execution') "$HOME/.agents/skills/fast-task-execution" -Recurse
```

Enter that laptop's checkout path at the prompt. Restart or start a new Codex chat after installing global skills. Check `SKILL.md` in each destination. If a skill already exists with the same name, compare it before replacing it.

## Workflow and selection

For a narrow task, use `docs/GAME_REGISTRY.md` or `docs/PROJECT_CONTEXT.md`, then read affected source and direct dependencies. `AGENTS.md` defines FAST, STANDARD and CRITICAL checks. Global `fast-task-execution` applies when efficient execution or repeated work is the concern. The local Codex configuration inspected on 2026-11-07 was `gpt-6-sol` at `medium` reasoning and was not changed. Lower effort per chat for clear, low-risk work remains optional; no latency gain has been measured. Skills change task discipline, not Codex runtime speed.

Use `mobile-first-game-ux` for game screen composition, RTL, touch and viewport problems at 360×740, 390×844 and 430×932. Use `game-ui-ux` for broad HUD/menu architecture. Global `frontend-design` supports new design direction, `web-design-guidelines` an explicit UI/accessibility review, and `motion-design` animation timing and choreography. The Vercel review skill fetches current rules when invoked; it does not run on every edit.

Use `fast-game-prototyping` when an approved case study becomes a playable mini-game; `prototype-fast`, `game-feel`, asset and input skills add depth only where needed. Phaser, PixiJS, Three.js and R3F skills apply only after that stack is chosen for a task. The original `react-three-fiber-future` skill follows [R3F's compatibility guidance](https://github.com/pmndrs/react-three-fiber): R3F 8 pairs with React 18, R3F 9 with React 19. No engine package was added. The installed managed Game Studio `sprite-pipeline` remains available on this laptop; portable project guidance covers sprite sheets through `create-game-assets`, `phaser-core` and `pixijs-rendering`.

Use GSAP skills where GSAP is already used or selected; keep Framer Motion or CSS where already used. Existing Superpowers debugging, CodeRabbit review and Game Studio playtest skills cover specialized quality workflows without duplicate global installs. Preserve the existing game's art direction, save behavior and platform boundaries.

## Scope decisions

The pinned current GameDev catalog has **77 specialized skills plus one router**. All categories were inventoried: 15 cross-engine disciplines, 6 browser-engine skills, 9 genres, 4 workflows, and 43 desktop/other-engine skills. All browser-engine skills are installed, with selected disciplines and genres useful for future educational, story and interactive games. Desktop engine skills assume Unity, Unreal, Godot, Roblox or other native stacks and were skipped. `fps-shooter`, `roguelike`, `rpg`, `survival-crafting` and `tower-defense` add full-game systems without a planned use; publishing and jam workflows do not improve coding tasks. They remain available at the pinned source if a future game needs them.

The GameDev router was reviewed and skipped: its broad trigger applies to nearly every game task, its references include uninstalled catalog paths, and its engine suggestions could add unnecessary work. Codex discovers the focused skill entry points directly. Vercel `composition-patterns` includes React 19 patterns while this project uses React 18; Anthropic `webapp-testing` duplicates existing Playwright/Game Studio checks; GreenSock `gsap-react` assumes an absent `@gsap/react` package; Motion's newer agent kit targets a different package generation from the current `framer-motion`. Reconsider these for a specific future task rather than installing them by default.
