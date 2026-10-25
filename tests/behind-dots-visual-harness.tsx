import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../src/index.css";
import { CASES, type Pattern } from "../src/features/behind-the-dots/data/cases";
import { currentCase, initialState, reducer, type Action, type GameState } from "../src/features/behind-the-dots/engine/gameState";
import { patternFor, pearson } from "../src/features/behind-the-dots/engine/correlation";
import { metaKey, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence";
import { BehindTheDotsGame } from "../src/features/behind-the-dots/BehindTheDotsGame";
import "../src/features/behind-the-dots/behind-the-dots.css";

const userId = "behind-dots-isolated-visual-qa";
const send = (state: GameState, ...actions: Action[]) => actions.reduce(reducer, state);
const start = () => send(initialState, { type: "start", seed: 123 }, { type: "skipStory" }, { type: "revealTutorialPoint" }, { type: "showTutorialDays" }, { type: "setGuess", value: "up" }, { type: "submitTutorial" }, { type: "startChallenges" });
const answer = (state: GameState, value: Pattern | null) => send(state, value ? { type: "answer", value } : { type: "timeout" }, { type: "attach" });
function createScenario(name: string): GameState {
  if (name === "cover") return initialState;
  if (name === "tutorial") return send(initialState, { type: "start", seed: 123 }, { type: "skipStory" });
  let state = start();
  if (name === "challenge") return state;
  if (name === "practice") {
    for (let index = 0; index < 3; index++) {
      const storyCase = currentCase(state);
      const actual = patternFor(pearson(storyCase.xs, storyCase.ys)!);
      state = send(state, { type: "answer", value: actual === "up" ? "down" : "up" }, { type: "attach" });
    }
    return state;
  }
  if (["win", "wrong", "timeout"].includes(name)) return send(state, name === "win" ? { type: "answer", value: "up" } : name === "wrong" ? { type: "answer", value: "down" } : { type: "timeout" });
  if (["ending-perfect", "ending-saved", "ending-glitch", "perfect", "saved", "glitch"].includes(name)) {
    for (let index = 0; index < CASES.length; index++) {
      const storyCase = currentCase(state);
      const actual = patternFor(pearson(storyCase.xs, storyCase.ys)!);
      const guess = name === "ending-saved" && index === 0 || name === "saved" && index === 0
        ? actual === "up" ? "down" : "up"
        : actual;
      state = send(state, { type: "answer", value: guess });
      state = send(state, { type: "attach" });
    }
    if (name === "ending-perfect" || name === "perfect") return send(state, { type: "recommendationAnswer", choice: "B" });
    if (name === "ending-saved" || name === "saved") return send(state, { type: "recommendationAnswer", choice: "B" });
    if (name === "ending-glitch" || name === "glitch") return send(state, { type: "recommendationAnswer", choice: "A" });
  }
  for (let index = 0; index < CASES.length; index++) state = answer(state, currentCase(state) ? patternFor(pearson(currentCase(state).xs, currentCase(state).ys)!) : "up");
  if (name === "recommendation") return state;
  if (name === "feedback") state = send(state, { type: "recommendationAnswer", choice: "B" });
  if (name === "feedback") return state;
  return state;
}

const scenario = new URLSearchParams(location.search).get("scenario") ?? "cover";
saveState(localStorage, userId, createScenario(scenario));
const tutorialDone = new URLSearchParams(location.search).get("tutorialDone") === "true";
const muted = new URLSearchParams(location.search).get("muted") !== "false";
localStorage.setItem(metaKey(userId), JSON.stringify({ tutorialDone, bestScore: 0, muted }));
createRoot(document.getElementById("root")!).render(<React.StrictMode><MemoryRouter><BehindTheDotsGame userId={userId} /></MemoryRouter></React.StrictMode>);
