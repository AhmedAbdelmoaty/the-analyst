# Game registry

Source of truth: `src/features/discovery/catalog.ts` (`GAME_CATALOG`). Hub, landing showcase, plans and admin statistics (`src/features/admin-stats/labels.ts`) all read it. All games require sign-in + completed profile; `tier` is display/plan mapping only and never grants access.

| # | id | Arabic name | Route | Tier |
|---|---|---|---|---|
| 1 | `problem-framing` | اسأل صح | `/play` | free |
| 2 | `reward-decision` | قرار التكريم | `/games/reward-decision` | annual |
| 3 | `behind-the-dots` | ورا النقط | `/games/behind-the-dots` | annual |
| 4 | `crack-the-code` | الشفرة الأخيرة | `/games/crack-the-code` | annual |
| 5 | `decision-matrix` | مصفوفة القرار | `/games/decision-matrix` | annual |
| 6 | `investigation-file` | ملف تحت التحقيق | `/games/investigation-file` | annual |
| 7 | `team-performance` | أداء الفريق | `/games/team-performance` | annual |
| 8 | `profit-paradox` | مفارقة الربح | `/games/profit-paradox` | annual |

## 1. اسأل صح — Problem Framing
- Source: `src/components/game/`, `src/contexts/PFGameContext.tsx`, `src/lib/pf-*`.
- Assets: `src/assets/` (characters, results).
- Save: localStorage checkpoints + timer; completion submitted to backend.
- Tests: `tests/round-persistence.test.ts`, `tests/game-progress.test.mts`.

## 2. قرار التكريم — Reward Decision
- Source: `src/features/reward-decision/` (own save controller and sound provider).
- Assets: `src/features/reward-decision/assets/`, `public/__l5e/` (local copies of Lovable asset pointers).
- Save: feature localStorage save. Server v3 evaluation only behind `SERVER_V3_EVALUATION_ENABLED`.
- Tests: `tests/reward-decision*.test.ts`.

## 3. ورا النقط — Behind the Dots
- Source: `src/features/behind-the-dots/`, `src/pages/BehindTheDotsRoute.tsx`.
- Assets: `public/assets/behind-dots/` (sprites loaded by string path from `v6/`).
- Save: per-user localStorage.
- Tests: `npm test` (v6 + audio), `tests/behind-the-dots*.test.*`, `tests/e2e/behind-the-dots.spec.ts`.

## 4. الشفرة الأخيرة — Crack the Code
- Source: `src/pages/CrackTheCodeRoute.tsx` + static iframe `public/crack-the-code/`.
- Save: per-user localStorage; v1→v2 migration keeps legacy save.
- Tests: `tests/crack-the-code-save-migration.test.cjs`, `npm --prefix tests/crack-the-code test`.

## 5. مصفوفة القرار — Decision Matrix
- Source: `src/pages/DecisionMatrixRoute.tsx` + static iframe `public/decision-matrix/` ([handoff](DECISION_MATRIX_HANDOFF_AR.md)).
- Assets: `public/decision-matrix/assets/` (+ voices).
- Save: per-user localStorage.
- Tests: `node --test tests/decision-matrix-integration.test.mjs`.

## 6. ملف تحت التحقيق — Investigation File
- Source: `src/pages/InvestigationFileRoute.tsx` + static iframe `public/investigation-file/` ([handoff](INVESTIGATION_FILE_HANDOFF_AR.md)).
- Assets: `public/investigation-file/assets/` (employee sprites loaded dynamically), `public/investigation-file/audio/`.
- Save: per-user localStorage (display progress only).
- Tests: `node --test tests/investigation-file-integration.test.mjs`, `tests/e2e/investigation-file.spec.ts`.

## 7. أداء الفريق — Team Performance
- Source: `src/features/team-performance/`, `src/pages/TeamPerformanceRoute.tsx`.
- Assets: character images via Lovable asset pointers; sounds reuse `/investigation-file/audio/`, wrong answer uses `/assets/behind-dots/audio/wrong.ogg`.
- Save: none (session only); mute preference `tp-muted`.
- Constraints: answers are shuffled each round; a win requires choosing Team B in the final comparison.
- Tests: none yet.

## 8. مفارقة الربح — The Profit Paradox
- Source: `src/features/profit-paradox/`, `src/pages/ProfitParadoxRoute.tsx`.
- Assets: user-supplied character poses plus four matching edited expressions in `public/profit-paradox/characters/`; office scene and reference-inspired controls are code-native UI, and charts/report use live data. Asset origin is recorded beside the sprites.
- Save: separate per-user localStorage checkpoint (`profit-paradox-v1`) and mute preference (`pp-muted`); no backend scoring or entitlement changes.
- Tests: `tests/profit-paradox.test.mts`.

## Adding a game
1. Add an entry to `GAME_CATALOG`.
2. Add a protected route in `src/App.tsx`.
3. Add a section here and update `CURRENT_STATE.md`.
