---
name: react-three-fiber-future
description: Plan or implement a new React-hosted 3D browser game in The Analyst using React Three Fiber. Use only when a task chooses R3F or needs shared React and 3D state; never migrate an existing game implicitly.
---

# React Three Fiber for future games

Before implementation, check the target game's React, Three, R3F and physics versions. The Analyst currently uses React 18; the [R3F project](https://github.com/pmndrs/react-three-fiber) pairs R3F 8 with React 18 and R3F 9 with React 19. Add dependencies only as part of a separately authorized game implementation, not skill setup.

Keep game rules and save state outside meshes and render callbacks. Put frame-rate-sensitive motion in the frame loop; use React state for meaningful UI/game events, not every frame. Keep HUD and accessible controls in the DOM, with clear pointer/touch mapping to the scene. Clean up event listeners, timers, physics bodies and loaded resources on unmount.

Start with a small scene, camera, one interaction and one success/failure loop. Profile mobile frame time and memory before adding effects. Bound device pixel ratio and expensive shadows when needed. Use the installed `threejs-*`, `camera-systems`, `physics-tuning`, `game-feel` and `performance-optimization` skills for their specific concerns. Preserve existing game architecture and do not treat this as a default engine choice.
