# V2 risks and boundaries

- Authentication and subscription browser evidence uses synthetic server responses. It cannot attest live RLS, OTP delivery, payments or deployed entitlement flags.
- Existing payment UI is enabled in fetched source. Keep checkout/server enforcement untouched; never use preview to initiate live payment tests.
- Client onboarding recovery is navigation only. Cross-device exactly-once onboarding would require approved server persistence; no schema change in this task.
- Original Lovable music metadata lacks traceable track credits. Do not infer its license from a source comment. New defaults require verified provenance; human listening approval remains explicit.
- npm ci baseline is broken by a missing Lalezar lock entry. Repair locally, preserve versions elsewhere.
- All game runtimes, backend directories, analytics and PWA logic are outside this implementation's mutation scope.
