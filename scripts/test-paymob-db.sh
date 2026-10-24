#!/usr/bin/env bash
set -euo pipefail
# Explicit local ephemeral database only; never uses managed PG* environment.
stage=$(mktemp -d /tmp/paymob-db.XXXXXX)
user=$(id -un)
if [ "$(id -u)" = 0 ]; then user=lovable; chown "$user" "$stage"; run=(runuser -u "$user" --); else run=(); fi
cleanup() { "${run[@]}" pg_ctl -D "$stage/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$stage"; }
trap cleanup EXIT
"${run[@]}" initdb -D "$stage/data" -A trust --no-locale >/dev/null
"${run[@]}" pg_ctl -D "$stage/data" -o "-k $stage -p 55439 -c listen_addresses=''" -l "$stage/log" start >/dev/null
local_psql=(psql -X -h "$stage" -p 55439 -U "$user" -d postgres -v ON_ERROR_STOP=1)
"${local_psql[@]}" <<'SQL'
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
SQL
"${local_psql[@]}" -f docs/paymob/payment-foundation.sql
"${local_psql[@]}" -f tests/paymob-database.sql