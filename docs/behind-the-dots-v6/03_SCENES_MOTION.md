# Scene direction, camera, animation, transitions
Times are starting targets for tuning, not exact hardcoded delays. Scene transitions must be interruptible, state-driven and skip-safe. Shared 2D stage with layered parallax; camera transforms inside a fixed responsive viewport, NEVER scale the entire app or cause cropped faces.

| Beat | Focus / visual | Character acting | Transition | Input |
|---|---|---|---|---|
| Cover | wide cart and market | Leila serving, Dotty peek, Glitch sneak | ~500ms camera ease toward cart | Start |
| Leila speaks | medium Leila, others visible subdued | worried glance, arm/face pose | 350–500ms pan/zoom, soft depth/contrast | Next/skip |
| Glitch interrupts | camera shifts right to Glitch | crouch->spring->land->talk->smirk | ~450ms tracking with impact overshoot | Next/skip |
| Dotty arrives | camera tracks Dotty jump | anticipation->arc->squash->point->talk | ~500ms, Leila reaction follows | Next/skip |
| Notebook opens | Leila lifts physical book | fingers/pose if available, pages flip | ~650–900ms push-in/morph from notebook to chart | guided point |
| Tutorial dots | chart becomes central | Dotty points/celebrates | dots cascade 60–100ms stagger | place one point, then 3 choices |
| Chase starts | notebook paper snatched, split chart/chase world | Glitch steal/sprint, Dotty chase | ~450ms paper sweep, HUD settles | start round |
| Each round | chart legible + narrow live chase lane | Dotty run cycle, Glitch chase cycle | 250–400ms page-turn/prop-specific reveal | 3 choice buttons |
| Correct | chart glow + direction reveal | Dotty leap/land, Glitch collide/stumble | 650–1100ms nonblocking reaction then evidence stamp | next |
| Wrong | tiny screen nudge, heart fracture | Dotty stumble, Glitch gain/taunt | 500–850ms reaction, show why | next |
| Timeout | countdown ends, short freeze beat | Glitch lunge, Dotty dodge/fall | 500–900ms distinct from wrong | next |
| Evidence | collectible page flies into book | Dotty points, Leila reacts | 300–600ms page motion | auto/next |
| Final plan | camera pulls from chart to cart and open book | Leila thinks, Glitch tempts, Dotty encourages | 650–900ms zoom-out | A/B/C |
| Win | new day improved operations | distinct Leila/Dotty/Glitch victory poses | 2–3s skippable choreographed payoff | retry/exit |
| Loss | new day consequences | Glitch victory dance, Dotty recovers, Leila concerned | 2–3s skippable payoff | retry/review |

## Animation state machine, NOT random CSS class toggles
Actor states: `idle`, `enter`, `talk`, `point`, `worried`, `run`, `anticipateJump`, `jump`, `land`, `stumble`, `celebrate`, `defeat`; each actor supports only meaningful states with matching frames. State transition priorities: `pause` > `sceneSkip` > `outcome` > `acting` > `ambient`. Do not allow contradictory classes or duplicate running animations.

### Correct chain
Button press squashes -> chart dots pulse/relationship explanation appears -> evidence token releases -> Dotty crouches then leaps forward (feet/arms change or rig) -> Glitch collides and reels back -> evidence stamp lands -> next challenge available. Total reaction target <1.2s, skip allowed.

### Wrong chain
Wrong button shakes once, not continuous -> screen nudge 3–5px (avoid motion sickness) -> one HUD heart cracks/empties -> Dotty flinches/stumbles -> Glitch closes measurable distance -> chart reveals correct trend with 1 short explanatory sentence. No double deduction on rapid taps.

### Timeout chain
Timer hits 0 once -> 120ms frozen anticipation -> Glitch quick lunge -> Dotty loses footing -> heart break and explanatory chart reveal. Distinct from explicit wrong answer.

### World motion
Clouds slow independent drift, awning flutter, hanging signs, customer silhouettes walking, cart small secondary details. Never obscure charts/controls. Use parallax on desktop; on mobile keep characters/axes readable. Sound effects: short page flip, tap, correct stamp, Dotty leap, Glitch crash, heart crack, countdown urgency, victory sting, loss comic cue. Respect mute and audio gesture policies.

### Pause and accessibility
Pause must freeze JS clock, Web Animations, CSS animations, camera, typewriter, cinematic sequence, chase and active sounds; visibility hidden auto-pauses. Resume at exact logical position with no timer reset or duplicate SFX. `prefers-reduced-motion` uses crossfades/static key poses, NOT missing feedback; keyboard and touch equivalence, focus visible, 44px tap targets, RTL.

### Responsive blocking
Desktop: layered world + notebook chart + visible chase. Mobile 360–430px: chart and axes remain fully readable, chase strip above chart, choices below; do not crop faces. Use aspect-ratio safe-area and layout breakpoints, not fixed absolute positions that escape viewport. Record screenshots at 390x844 and 1440x900.
