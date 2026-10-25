# Asset production and character animation specification
## Canonical starting inventory (verify file existence and inspect visually)
`public/assets/behind-dots/leila-v5.png`, `dotty-v5.png`, `glitch-v5.png`, `market-v5.png`; older assets may exist but are not automatically canonical. The current character images are flattened PNGs. They CANNOT blink, move arms/legs independently, or lip-sync convincingly by CSS transform alone.

## Mandatory asset audit BEFORE generating
Produce `asset-manifest.json` with path, width, height, transparency, bounding box, reference screenshot, ownership/license, role, animation suitability, whether used. Inspect actual characters and approved storyboard if supplied. Derive palette/line thickness/perspective and proportions from the existing assets. Avoid replacing characters unnecessarily.

## Production priority
P0: shared market layers (sky/backdrop, cart, awning/props, foreground, queue/customer silhouettes), notebook closed/open and page assets, evidence cards, readable chart UI. P0 actors: Leila idle/worried/talk/point/happy; Dotty idle/enter/run (minimum 4–6-frame loop)/jump/land/stumble/celebrate; Glitch idle/peek/enter/run (minimum 4–6-frame loop)/stumble/taunt/defeat. At least clearly distinct key poses for each story role. P1: secondary blink/face variations, more transitions, polished props, ambient detail. Do not generate huge asset batches before testing first few in the real game.

## If asset generator is available
Use image generation with the EXISTING characters as visual references and ask for CONSISTENT transparent isolated poses with unchanged identity, proportions, colors and lighting; generate scene layers separately. Check each generated PNG visually for transparent background, no extra limbs/fingers, stable silhouette, no accidental text, no baked-in shadows that clash with the stage. Crop/alignment anchors consistent across poses. Generate only if it measurably improves acting; do not let AI invent new characters. If no suitable image generation tool, create SVG/rig parts only if quality matches; otherwise explicitly flag `BLOCKED: missing pose assets` and request assets instead of claiming full animation.

## Rig options (choose after audit)
A) Pose swapping PNG/WebP sprites with CSS/WAAPI: simplest for few states. B) Sprite sheets for run cycles and short acting loops; frame atlas metadata and constant feet anchor. C) Layered SVG/2D puppet for head/eyes/arms/feet; use only when source separation is feasible. Rive/Spine/Lottie optional after checking project support, export and licensing; not required by default. Never add a giant game engine just for camera transforms and sprite swaps.

## Production outputs
Source master art (where licensing allows), export sprites, frame dimensions, anchor coordinates, naming `character_action_frameNN`, atlas/pose map, animation state list, preload policy, fallback static pose, credits/licenses. Compress assets, avoid network fonts/assets and keep mobile performance acceptable. Character movement must be demonstrated via a short recorded clip, not just source code assertions.

## Victory/loss assets
Perfect: Leila smile/point, Dotty victory dance sequence, Glitch stumble/crash, queue moving, confetti. Saved: relieved Leila/Dotty, frustrated Glitch. Glitch: worried Leila, Glitch victory dance, Dotty recovery, visibly poor queue/leftovers. Three distinct acted scene timelines; outcome card only AFTER acting.
