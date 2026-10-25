# Gameplay, learning, synthetic data, and endings
## Core loop
Narrative beat -> notebook chart with 12 dots -> user taps EXACTLY ONE of `up/down/none` (three buttons) within 20 seconds -> evaluate exactly once -> show correct/wrong/timeout physical response -> earn page/evidence even if incorrect (marked as corrected) -> next round -> 4-evidence final plan. Buttons are never a slope slider. Replays can vary dots via seeded RNG but preserve relationship and plausibility. Correct = 3 points; four rounds => max 12. Wrong or timeout loses 1 of 3 hearts. Pause freezes countdown. Tutorial has no timer/heart penalty and can be skipped on replay.

## Challenge truth table
| ID | X | Y | Direction | Plausibility |
| C1 | temperature °C, e.g. 17–39 | cups sold, e.g. 15–95 | UP | hotter days tend to sell more; scatter, not perfect |
| C2 | customers per hour, e.g. 8–55 | mean wait minutes, e.g. 2–24 | UP | higher traffic associated with longer wait |
| C3 | prepared cups, e.g. 50–120 | sold cups, e.g. 25–80 | NONE | **every sold <= prepared**, broad overlapping prep amounts across varying demand; abs Pearson r <=0.15 |
| C4 | mean wait minutes, e.g. 2–22 | purchase completion %, e.g. 40–96 | DOWN | waiting associated with fewer completing purchase; all % in [0,100] |

For generated cases: 12 distinct daily/hourly observations as labelled, sorted X; ensure Y is integer where appropriate, scientifically honest. Check `pearson` and `patternFor` thresholds; target C1/C2 +0.70..+0.92, C3 abs <=0.15, C4 -0.92..-0.70. Verify every seed in a representative seeded test batch (>=100 seeds), no infinite rejection loop; deterministic fallback must also satisfy constraints. `No clear trend` means no visible *linear association in these observations*, not zero effect or causal impossibility. All stories and axes must reflect the new data, not old V5 'early prep/wait' or 'balloons/sales'.

## Learning design
Explain X and Y with a single day card and a physical point; reveal other points; teach overall direction via three tap choices; give error-specific hints and retry. Never introduce Pearson r as prerequisite. In main challenges, user discovers evidence rather than receiving answer beforehand. Feedback shows correct direction and why, with brief correlation-vs-causation disclaimer in evidence book or end.

## Hearts and fairness decision
Approved aim: show 4 challenges and final plan even after 3 hearts are lost, to preserve full learning. Proposed implementation: at 0 hearts transition to `practiceAfterCapture` (Glitch wins the chase visibly), remaining rounds untimed and without score; finish with evidence recap and **Glitch outcome** regardless of plan, with retry. Mark this as a deliberate V5 behavior change; current V5 ends immediately at 0 hearts. If owner prefers immediate ending, ask before changing, but do NOT silently keep V5 3-round early termination. Define reducer tests for both paths.

## Final plan
A: `نزود الكمية بنفس المقدار كل يوم علشان ما نخلصش.` -> unsupported -> Glitch ending.
B: `نقدّر الطلب حسب الجو، ونستعد لأوقات الزحمة، ونسرّع الخدمة ونراجع النتيجة.` -> supported.
C: `نثبت الكمية ونركز بس على تقليل الهالك، من غير ما نغير الخدمة.` -> incomplete -> Glitch ending.
The correct plan is B (V5 correct was A, MUST update code and tests). Outcome: perfect iff all 4 correct, hearts >0, B. Saved iff hearts >0, B, some errors. Glitch iff wrong plan or chase loss. No misleading guarantee of sales improvement; present as a better evidence-informed experiment.

## Score, saves, replay
Use versioned save migration from V5, never interpret V5 3-case completion as valid V6 4-case completion. Preserve user-scoped keys/ownership and mute/tutorial history. On reload recover stable scene and timer policy without exploiting resets. All answer/timeout handlers idempotent; no repeated heart loss. No cross-user save leakage. Evidence and scene state must be serializable; don't persist animation frames as game truth.
