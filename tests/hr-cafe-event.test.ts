import { describe, expect, test } from "bun:test";
import { GAME_CATALOG } from "../src/features/discovery/catalog";
import { isCorrect } from "../src/features/training-evaluation/engine";

describe("HR Café event", () => {
  test("Training Evaluation is first and the only open game", () => {
    expect(GAME_CATALOG[0].id).toBe("training-evaluation");
    expect(GAME_CATALOG.filter(g => !g.locked).map(g => g.id)).toEqual(["training-evaluation"]);
  });
  test("only the unrepresentative-sample claim with the respondents evidence wins", () => {
    expect(isCorrect("notRep", "respondents")).toBe(true);
    expect(isCorrect("aBetter", "complaints")).toBe(false);
    expect(isCorrect("notRep", "attendance")).toBe(false);
  });
});
