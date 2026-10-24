# Paymob preparation (not deployed)

Executable Edge Function sources are staged in `docs/paymob/functions/`, deliberately outside the auto-deployed `supabase/functions/` tree. After explicit approval, copy the folders into that tree and deploy only the approved payment functions. SQL is review-only; do not place it in an automatically applied migration path.

This directory contains no credentials. Existing authentication, game access, saves and analytics are unchanged.