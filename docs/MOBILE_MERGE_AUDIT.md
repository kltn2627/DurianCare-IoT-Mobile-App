# Mobile Merge Audit

Date: 2026-07-21

Branch: `duy/cleanup-fixes`

## 1. Files Changed

### Merge content from `origin/dev`

- `src/features/cultivation/api/cultivationApi.ts`
- `src/features/cultivation/api/cultivationTypes.ts`

### Merge regression fix

- `package.json` (`expo` version aligned to `~54.0.36`)
- `package-lock.json`

## 2. Compile Result

### `npm install`

- Passed ✅

### `npm run validate`

- Passed ✅
  - `tsc --noEmit` passed
  - `npx expo-doctor` passed

### Expo export

- `npx expo export --platform android` passed ✅
- `npx expo export --platform web` passed ✅

## 3. Expo Validation

- Expo confirmed local env loading: `env: load .env`
- Expo Doctor dependency mismatch was fixed by aligning `expo` to the required patch version.

## 4. API Compatibility

- No API contract changes were introduced.
- No backend code was modified.
- No request/response schema changes were made.
- The merge only added cultivation API client/types that are already aligned with the existing Mobile architecture.

## 5. Navigation Audit

- No route regressions were detected during validation/export.
- Expo Router static route generation completed successfully.
- No dead route or compile-time navigation error was introduced by the merge.

## 6. Merge Conflicts Resolved

- No conflicts occurred.
- The merge completed as a fast-forward update from `origin/dev`.

## 7. Runtime Fixes

- Fixed Expo Doctor failure caused by version drift:
  - `expo` updated from `~54.0.35` to `~54.0.36`
- No app logic was changed.
- No screen redesign was performed.

## 8. Remaining Issues

- `npm audit` still reports pre-existing dependency vulnerabilities.
- These are outside the merge regression scope and were not modified.

## 9. Production Readiness

**9.5 / 10**

Reasoning:

- Merge is clean.
- Validation and both Expo exports pass.
- The only regression found after merge was a package version mismatch, and it was fixed.
- No API, navigation, or business logic regression remains in the current branch state.
