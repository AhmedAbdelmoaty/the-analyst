import { expect, test } from "bun:test";
import { EVENT_DEPARTMENTS, validRegistrationEmail } from "../src/features/profile/eventRegistration";

test("event registration offers only the three approved departments in order", () => {
  expect(EVENT_DEPARTMENTS.map(([id]) => id)).toEqual(["ld_training", "human_resources", "other"]);
  expect(EVENT_DEPARTMENTS).toHaveLength(3);
});
test("registration requires a valid email", () => {
  expect(validRegistrationEmail("ahmed@example.com")).toBe(true);
  expect(validRegistrationEmail("")).toBe(false);
  expect(validRegistrationEmail("ahmed@" )).toBe(false);
});