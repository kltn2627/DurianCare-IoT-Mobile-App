# CI — DurianCare IoT Mobile App

Workflow: `.github/workflows/ci.yml` ("Mobile CI").

- Runs on pull requests into `dev`/`main`, pushes to `dev`/`main`, and manually. Older runs for the same PR/branch are cancelled.
- Token permissions: `contents: read`; no secrets, signing keys, keystores or EAS/store credentials.
- Steps (Node 24, `npm ci`): `npm run typecheck` → `node --test tests/*.cjs` →
  `npx expo export --platform android` (JS bundle only, discarded; placeholder `EXPO_PUBLIC_API_BASE_URL`) →
  `npm run doctor` (informational, non-blocking).
- `expo-doctor` currently reports 4 packages a patch behind the SDK 57 recommendation; make it blocking after upgrading them.
- Local fresh-clone run (2026-10-19): typecheck OK, tests 6/6, Android export OK (3572 modules).
- Not covered: native builds (APK/AAB/IPA), device tests, store releases.
- Suggested required check for `dev` and `main`: `Typecheck, tests and Android bundle export`.
- No deployment (CD) is configured.
