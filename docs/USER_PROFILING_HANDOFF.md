# User Profiling & Audience Insights Handoff

## Implemented

- New `/setup` submissions require one stable department ID and one stable industry ID. Each searchable dropdown exposes the approved values; choosing `other` reveals a required, trimmed field limited to 80 characters.
- The existing identity profile completion rule remains first name + last name + selected character. Work information is deliberately excluded, so existing accounts can still reach `/app` and both protected game routes.
- Existing users with missing work details see a dismissible prompt on `/app`; the dismissal timestamp is stored on their own profile row. `/profile/work` reuses the same validated fields for later edits.
- The selected character's existing `gender` remains the approximate audience gender. Country is derived from the stored E.164 calling code. `+1`, `+7`, non-geographic/shared service codes are ambiguous; absent or invalid phone values are unknown.
- The Users tab uses the protected `admin_users` RPC for database-side filtering, page rows, and audience aggregates. Audience counts are unique profile accounts after the visible user filters and search, independent of pagination; current activity date/game filters keep their existing activity-count semantics.
- User detail retains registration, verification, visits, flags, and rounds, with gender and work details added. CSV/XLSX user export uses the existing spreadsheet-safe text handling for Other values.

## Database migration and safe activation

**Status (2026-10-13): APPLIED to the live Lovable Cloud database** together with `0009_work_profile_column_comments`. Do not re-run or edit 0008; pull the latest repository state before further work. Verified: columns and constraints exist, players can update only their own work columns (phone stays protected), invalid IDs are rejected, and `admin_users` returns audience aggregates.

Known data note: two email-only accounts (including the admin) carry legacy local-format phone values that fail the existing `profiles_phone_format` check, so updates to those two profile rows are rejected until their phone values are normalized. Player phone accounts are unaffected.

`drizzle/migrations/0008_user_profiling_audience.sql` adds nullable work fields and a prompt-dismissal timestamp, adds category/Other constraints, grants only the new own-profile update columns, adds a phone-country mapping function, and replaces the latest `admin_users` and `admin_user_detail` report definitions. Existing owner RLS and protected phone/role columns remain the boundary.

The repository has two migration histories. The Drizzle history contains the current protected analytics RPCs and ends at `0007_simple_admin_activity`; the older `supabase/migrations` history does not contain those latest RPC definitions. Do not replay either history wholesale or run this against production merely because the file exists.

Before backend activation:

1. Back up the intended database and verify its applied migration ledger and that `admin_users` currently matches the `0007_simple_admin_activity` Drizzle lineage.
2. On an isolated clone/staging database, set `LOVABLE_DB_MIGRATION_URL` through the approved secret store and run `npx drizzle-kit migrate` only after confirming the Drizzle migration ledger is already at `0007_simple_admin_activity`. This applies the next journal entry only. If that prerequisite is not true, stop and reconcile the actual schema rather than replaying historical migrations.
3. Refresh the PostgREST schema cache, then test synthetic self-update/read, denied cross-user/protected-column updates, admin-only RPC access, profile constraints, audience filters/counts, details, pagination, and CSV/XLSX exports with a non-admin and admin test account.
4. Deploy the frontend only after the migration and RPC are available. No migration, live-data query, OTP, or production setting was changed during this implementation.
