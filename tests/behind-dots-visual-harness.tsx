import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../src/index.css";
import { CASES, type Pattern } from "../src/features/behind-the-dots/data/cases";
import { initialState, reducer, type Action, type GameState } from "../src/features/behind-the-dots/engine/gameState";
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
  if (["win", "wrong", "timeout"].includes(name)) return send(state, name === "win" ? { type: "answer", value: "up" } : name === "wrong" ? { type: "answer", value: "down" } : { type: "timeout" });
  for (let index = 0; index < CASES.length; index++) {
    state = answer(state, ["up", "down", "none"][index] as Pattern);
  }
  if (name === "recommendation") return state;
  if (name === "feedback" || name === "saved" || name === "glitch") state = send(state, { type: "recommendationAnswer", choice: "B" });
  if (name === "saved") return send(state, { type: "retryRecommendation" }, { type: "recommendationAnswer", choice: "A" });
  if (name === "glitch") return send(state, { type: "retryRecommendation" }, { type: "recommendationAnswer", choice: "C" });
  if (name === "feedback") return state;
  if (name === "perfect") return send(state, { type: "recommendationAnswer", choice: "A" });
  return state;
}

const scenario = new URLSearchParams(location.search).get("scenario") ?? "cover";
saveState(localStorage, userId, createScenario(scenario));
localStorage.setItem(metaKey(userId), JSON.stringify({ tutorialDone: true, bestScore: 0, muted: true }));
createRoot(document.getElementById("root")!).render(<React.StrictMode><MemoryRouter><BehindTheDotsGame userId={userId} /></MemoryRouter></React.StrictMode>);
