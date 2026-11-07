---
name: fast-game-prototyping
description: Turn an approved case study or gameplay concept into a small playable browser game in The Analyst. Use when building a new mini-game quickly, with correct rules, responsive feedback and platform fit; not for isolated polish edits.
---

# Fast game prototyping

Define the player's decision, valid actions, state transitions and win/fail evidence in a few lines. Build the smallest playable loop in the project's existing React/Vite or standalone game architecture. Choose a new rendering framework only when the mechanic needs it; do not install one as a default.

Implement rules as inspectable state changes separate from presentation. Make one complete example work before expanding content. Add concise feedback for input, success, failure and progression using existing art and sound where suitable. Keep controls usable on a phone and preserve RTL, route, authentication, save namespace and platform boundaries.

Use `prototype-fast` for keep/kill criteria, `game-feel` for response timing, and `mobile-first-game-ux` for screen composition only when those concerns need deeper guidance. Verify the core rule path with a targeted check and review one mobile screen. Report what is playable, what remains a prototype, and any source assets or game content still needed.
