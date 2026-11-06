# Game registry

Single source of truth for which games exist: `src/features/discovery/catalog.ts` (`GAME_CATALOG`). The hub, public showcase, plans and admin statistics (`src/features/admin-stats/labels.ts`) all read it, so a new game appears everywhere once it is added there and has a route in `src/App.tsx`.

| # | id | Title | Route | Tier | Source | Assets | Save | Targeted tests |
|---|---|---|---|---|---|---|---|---|
| 1 | `problem-framing` | اسأل صح | `/play` | free | `src/components/game/`, `src/lib/pf-*` | `src/assets/` | localStorage checkpoints; completion submitted to backend | `tests/round-persistence.test.ts`, `tests/game-progress.test.mts` |
| 2 | `reward-decision` | قرار التكريم | `/games/reward-decision` | annual | `src/features/reward-decision/` | `src/features/reward-decision/assets/`, `public/__l5e/` | feature save controller (localStorage) | `tests/reward-decision*.test.ts` |
| 3 | `behind-the-dots` | ورا النقط | `/games/behind-the-dots` | annual | `src/features/behind-the-dots/`, `src/pages/BehindTheDotsRoute.tsx` | `public/assets/behind-dots/` | per-user localStorage | `npm test` (v6 + audio), `tests/e2e/behind-the-dots.spec.ts` |
| 4 | `crack-the-code` | الشفرة الأخيرة | `/games/crack-the-code` | annual | `src/pages/CrackTheCodeRoute.tsx`, `public/crack-the-code/` (iframe) | `public/crack-the-code/assets/` | per-user localStorage, v1→v2 migration | `tests/crack-the-code-save-migration.test.cjs`, `tests/crack-the-code/` |
| 5 | `decision-matrix` | مصفوفة القرار | `/games/decision-matrix` | annual | `src/pages/DecisionMatrixRoute.tsx`, `public/decision-matrix/` (iframe) | `public/decision-matrix/assets/` | per-user localStorage | `tests/decision-matrix-integration.test.mjs` |
| 6 | `investigation-file` | ملف تحت التحقيق | `/games/investigation-file` | annual | `src/pages/InvestigationFileRoute.tsx`, `public/investigation-file/` (iframe) | `public/investigation-file/assets/` | per-user localStorage | `tests/investigation-file-integration.test.mjs`, `tests/e2e/investigation-file.spec.ts` |
| 7 | `team-performance` | أداء الفريق | `/games/team-performance` | annual | `src/features/team-performance/` | Lovable asset pointers + `/assets/behind-dots/audio/` | none (session only; mute pref `tp-muted`) | none yet |

All games require sign-in and a completed profile. Tier is display/plan mapping only — it does not grant or restrict access.

## Adding a game
1. Add an entry to `GAME_CATALOG`.
2. Add a protected route in `src/App.tsx`.
3. Add a row here and a line in `docs/CURRENT_STATE.md`.
