import { beforeAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Run only against a disposable local PostgreSQL cluster, never the configured Cloud.
const host = process.env.EVENT_TEST_PGHOST;
if (!host?.startsWith("/tmp/")) throw new Error("Set EVENT_TEST_PGHOST to a disposable /tmp PostgreSQL socket.");
function sql(query: string) {
  const result = spawnSync("psql", ["-h", host as string, "-p", "55439", "-U", "event_test", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim().split("\n").filter(x => !["BEGIN", "ROLLBACK", "SET"].includes(x));
}
beforeAll(() => {
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('app.uid', true), '')::uuid $$;
    CREATE FUNCTION public.has_role(uuid, text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('app.admin', true), '') = 'yes' $$;
    CREATE TABLE public.profiles(user_id uuid, first_name text, last_name text, phone text, department text, department_other text, industry text, industry_other text);
    ${readFileSync(new URL("../drizzle/migrations/0013_hr_cafe_event.sql", import.meta.url), "utf8").replace("ALTER PUBLICATION supabase_realtime ADD TABLE public.event_challenge;", "")}
    ${readFileSync(new URL("../drizzle/migrations/0016_hr_cafe_live_ranking.sql", import.meta.url), "utf8")}
    ${readFileSync(new URL("../drizzle/migrations/0017_hr_cafe_duration_ranking.sql", import.meta.url), "utf8")}`);
});
// Player n finishes later but faster as n grows: duration = 200 - n seconds.
const fixture = `BEGIN; UPDATE event_challenge SET started_at = '2026-11-25 16:00:00+00', results_revealed_at = NULL;
INSERT INTO profiles(user_id, first_name, last_name) SELECT md5(n::text)::uuid, 'Player', n::text FROM generate_series(1,52) n;
INSERT INTO event_results(user_id, challenge_started_at, correct, completed_at, duration_seconds) SELECT md5(n::text)::uuid, '2026-11-25 16:00:00+00', n <> 52, '2026-11-25 16:01:00+00'::timestamptz + n * interval '1 second', 200 - n FROM generate_series(1,52) n;`;
const reveal = "UPDATE event_challenge SET results_revealed_at = '2026-11-25 16:05:00+00';";
const p51 = "SET app.uid='" + "2838023a-778d-faec-dc21-2708f721b788" + "';";
test("ranking stays hidden before the announcement", () => {
  expect(sql(`${fixture} SELECT jsonb_array_length(event_public_state()->'winners'); ROLLBACK;`).at(-1)).toBe("0");
});
test("shortest play time is rank 1, not the earliest finish", () => {
  expect(sql(`${fixture} ${reveal} SELECT event_public_state()->'winners'->0->>'name'; ROLLBACK;`).at(-1)).toBe("Player 51");
});
test("public board shows top 50 only", () => {
  expect(sql(`${fixture} ${reveal} SELECT jsonb_array_length(event_public_state()->'winners'); ROLLBACK;`).at(-1)).toBe("50");
});
test("finishes after the announcement do not enter the ranking", () => {
  expect(sql(`${fixture} UPDATE event_challenge SET results_revealed_at = '2026-11-25 16:01:30+00'; SELECT event_public_state()->'winners'->0->>'name'; ROLLBACK;`).at(-1)).toBe("Player 30");
});
test("no voucher before the announcement; rank 1 gets 100 percent after it", () => {
  expect(sql(`${fixture} ${p51} SELECT event_my_status() ? 'voucher'; ${reveal} SELECT event_my_status()->'voucher'->>'discount'; ROLLBACK;`).filter(x => x !== "UPDATE 1").slice(-2)).toEqual(["f", "100"]);
});
test("voucher disappears for good after download", () => {
  expect(sql(`${fixture} ${reveal} ${p51} SELECT event_voucher_downloaded(); SELECT event_my_status() ? 'voucher'; ROLLBACK;`).at(-1)).toBe("f");
});
test("an incorrect finisher never receives a voucher", () => {
  expect(sql(`${fixture} ${reveal} SET app.uid='9a1158154dfa42caddbd0694a4e9bdc8'; SELECT event_my_status() ? 'voucher'; ROLLBACK;`).at(-1)).toBe("f");
});
test("discount tiers stay 100/75/50/25", () => {
  expect(sql("SELECT event_discount(1),event_discount(2),event_discount(3),event_discount(50),event_discount(51);").at(-1)).toBe("100|75|50|25|0");
});
test("starting and announcing require the server-side admin check", () => {
  expect(() => sql("BEGIN; SET ROLE authenticated; SELECT event_admin_start(); ROLLBACK;")).toThrow("forbidden");
  expect(() => sql("BEGIN; SET ROLE authenticated; SELECT event_admin_announce(); ROLLBACK;")).toThrow("forbidden");
});
test("submission before start is rejected", () => {
  expect(sql("BEGIN; SET app.uid='c4ca4238-a0b9-2382-0dcc-509a6f75849b'; SELECT event_submit('notRep','respondents'); ROLLBACK;").at(-1)).toBe("f");
});
