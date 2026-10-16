# Mobile Runtime Smoke Test

Date: 2026-07-13

## 1. Verified Screens

### Runtime-checked at build/export level

- `/login`
- `/register`
- `/verify-otp`
- `/approval`
- `/approval-status`
- `/profile`
- `/profile-edit`
- `/avatar-management`
- `/change-password`
- `/scanner`
- `/diagnosis`
- `/diagnosis-history`
- `/diagnosis-result`
- `/knowledge`
- `/knowledge/[slug]`
- `/chat`
- `/ai-chat`
- `/community`
- `/search`
- `/search-result`
- `/notifications`
- `/notification-detail`
- `/authorization`
- `/traceability`
- `/traceability-detail`
- `/farm-detail`
- `/engineer-registration`
- `/engineer-profile`
- `/admin-engineer-approval`

### Flow status

- Screen routes are present and export successfully.
- Full backend-driven runtime verification for these screens was **NOT VERIFIED** in this turn because the backend was not reachable from this machine.

## 2. Verified APIs

### Runtime status

- Backend API execution was **NOT VERIFIED** in this turn.
- No new API contract was created.
- No backend code was modified.

### Endpoints expected by the current Mobile app

- Authentication endpoints
- Profile endpoints
- AI diagnosis endpoint
- Notification endpoints
- Admin engineer approval endpoints

## 3. Verified Navigation

### Runtime evidence

- Expo Router export completed successfully.
- Route tree resolved without compile errors.
- Notification inbox item tap now resolves to `/notification-detail`.

### Status

- Route presence: **VERIFIED**
- End-to-end navigation against live backend data: **NOT VERIFIED**

## 4. Verified Upload Flow

### Status

- Camera upload flow: **NOT VERIFIED**
- Gallery upload flow: **NOT VERIFIED**
- Multipart upload against live backend: **NOT VERIFIED**

## 5. Verified Authentication

### Status

- Farmer register: **NOT VERIFIED**
- Engineer register: **NOT VERIFIED**
- OTP verify: **NOT VERIFIED**
- OTP resend: **NOT VERIFIED**
- Login: **NOT VERIFIED**
- Refresh token: **NOT VERIFIED**
- Logout: **NOT VERIFIED**
- Session restore: **NOT VERIFIED**
- Auto refresh: **NOT VERIFIED**
- Remember login: **NOT VERIFIED**

## 6. Verified Admin Flow

### Status

- Engineer list: **NOT VERIFIED**
- Engineer detail: **NOT VERIFIED**
- Approve: **NOT VERIFIED**
- Reject: **NOT VERIFIED**
- Refresh: **NOT VERIFIED**

## 7. Verified Notification Flow

### Status

- Inbox: **NOT VERIFIED**
- Unread filter: **NOT VERIFIED**
- Read state: **NOT VERIFIED**
- Delete: **NOT VERIFIED**
- Open detail: **NOT VERIFIED**
- Mark read: **NOT VERIFIED**
- Mark all: **NOT VERIFIED**
- Refresh: **NOT VERIFIED**

## 8. Runtime Evidence

### Local validation

- `npm run validate` ✅
  - `tsc --noEmit` passed
  - `npx expo-doctor` passed
  - Expo loaded local env: `env: load .env`

- `npx expo export --platform web` ✅
  - Expo loaded local env: `env: load .env`
  - Static route export completed successfully
  - Route tree included 49 static routes

### Backend reachability probe

- `http://192.168.1.10:8080/actuator/health` ❌
- `http://192.168.1.10:8000/health` ❌

Both probes failed with:

- `Unable to connect to the remote server`

### Interpretation

- Build/runtime packaging for the Mobile app is healthy.
- Live backend verification was not possible from this environment.

## 9. Bugs Fixed

- No new bug was fixed in this smoke-test-only turn.
- No code changes were required.

## 10. Remaining Issues

- Backend is not reachable from this machine, so all backend-driven runtime flows remain **NOT VERIFIED** in this turn.
- Device-only checks still require a reachable backend and a physical device:
  - camera permission edge cases
  - gallery upload
  - push notifications
  - token-expiry retry behavior
  - offline recovery

## 11. Production Readiness Score

**4.0 / 10**

Reasoning:

- App build and Expo export are clean.
- Route tree is intact.
- Live backend verification could not be completed from this environment.
- Because the requested smoke test is backend-driven, the final verification state remains incomplete.
