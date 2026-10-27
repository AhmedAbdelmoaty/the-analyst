import assert from "node:assert/strict";
import test from "node:test";
import { isGameRoute } from "../src/lib/gameRoutes.ts";

test("all five game routes and their subpaths are protected from automatic updates", () => {
  for (const path of [
    "/play",
    "/play/round",
    "/games/reward-decision",
    "/games/reward-decision/case",
    "/games/behind-the-dots",
    "/games/crack-the-code",
    "/games/decision-matrix",
  ]) assert.equal(isGameRoute(path), true, path);
  assert.equal(isGameRoute("/app"), false);
  assert.equal(isGameRoute("/games/behind-the-dots-extra"), false);
});
