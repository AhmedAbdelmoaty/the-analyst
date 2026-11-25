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
    ${readFileSync(new URL("../drizzle/migrations/0016_hr_cafe_live_ranking.sql", import.meta.url), "utf8")}`);
});
const fixture = `BEGIN; UPDATE event_challenge SET started_at = '2026-11-25 16:00:00+00', reveal_step=0, revealed=false;
INSERT INTO profiles(user_id, first_name, last_name) SELECT md5(n::text)::uuid, 'Player', n::text FROM generate_series(1,52) n;
INSERT INTO event_results(user_id, challenge_started_at, correct, completed_at) SELECT md5(n::text)::uuid, '2026-11-25 16:00:00+00', n <> 1, '2026-11-25 16:01:00+00'::timestamptz + n * interval '1 second' FROM generate_series(1,52) n;`;
test("correct finishes appear immediately, first correct finish is rank 1 without reveal", () => {
  expect(sql(`${fixture} SELECT event_public_state()->'winners'->0->>'name'; ROLLBACK;`).at(-1)).toBe("Player 2");
});
test("public board shows top 50 only", () => {
  expect(sql(`${fixture} SELECT jsonb_array_length(event_public_state()->'winners'); ROLLBACK;`).at(-1)).toBe("50");
});
test("first correct player receives their 100 percent voucher immediately", () => {
  expect(sql(`${fixture} SET app.uid='${"c81e728d9d4c2f636f067f89cc14862c"}'; SELECT event_my_status()->'voucher'->>'discount'; ROLLBACK;`).at(-1)).toBe("100");
});
test("an incorrect finisher never receives a voucher", () => {
  expect(sql(`${fixture} SET app.uid='c4ca4238-a0b9-2382-0dcc-509a6f75849b'; SELECT event_my_status() ? 'voucher'; ROLLBACK;`).at(-1)).toBe("f");
});
test("rank 51 receives no voucher; ranks 2, 3, 4 and 50 retain approved discounts", () => {
  expect(sql(`${fixture} SET app.uid='9a115815-4dfa-42ca-ddbd-0694a4e9bdc8'; SELECT event_my_status() ? 'voucher'; SELECT event_discount(2),event_discount(3),event_discount(4),event_discount(50); ROLLBACK;`).slice(-2)).toEqual(["f", "75|50|25|25"]);
});
test("starting the challenge requires the server-side admin check", () => {
  expect(() => sql("BEGIN; SET ROLE authenticated; SELECT event_admin_start(); ROLLBACK;")).toThrow("forbidden");
});
test("submission before start is rejected", () => {
  expect(sql("BEGIN; SET app.uid='c4ca4238-a0b9-2382-0dcc-509a6f75849b'; SELECT event_submit('notRep','respondents'); ROLLBACK;").at(-1)).toBe("f");
});