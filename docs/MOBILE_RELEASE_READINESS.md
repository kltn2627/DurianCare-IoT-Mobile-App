# DurianCare Mobile Release Readiness

## Phạm vi

Đây là bản chốt trạng thái cho ứng dụng Mobile `DurianCare-IoT-Mobile-App` sau khi rà soát luồng thực tế với backend đang chạy và đối chiếu với tài liệu frontend trong `docs/`.

Không chỉnh sửa Backend, không chỉnh sửa Web.

## Files modified

- `app/_layout.tsx`
- `app/approval.tsx`
- `package.json`
- `package-lock.json`
- `src/lib/apiBase.ts`
- `src/session/SessionContext.tsx`
- `src/session/types.ts`
- `src/navigation/DurianNavigationGate.tsx`
- `src/features/auth/authApi.ts`
- `src/features/auth/authTypes.ts`
- `src/features/auth/DurianAccessScreen.tsx`
- `src/features/auth/DurianRegisterScreen.tsx`
- `src/features/auth/DurianOtpVerificationScreen.tsx`
- `src/features/auth/DurianApprovalScreen.tsx`
- `src/features/authorization/DurianFarmAuthorizationScreen.tsx`
- `src/features/profile/profileTypes.ts`
- `src/features/community/DurianFarmerCommunityScreen.tsx`
- `src/features/cultivation/DurianCultivationCalendarScreen.tsx`
- `src/features/dashboard/DurianOperationsScreen.tsx`
- `src/features/profile/DurianTraceabilityScreen.tsx`
- `.env` (local, ignored by Git; thêm `EXPO_PUBLIC_WEB_BASE_URL`)

## APIs integrated

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/register/farmer`
- `POST /api/auth/register/engineer`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/pending-engineers`
- `POST /api/auth/admin/engineers/{engineerId}/approve`

### Profile

- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/avatar`
- `DELETE /api/users/me/avatar`

### Other connected mobile flows

- AI diagnosis capture / upload flow
- Notification inbox / badge refresh
- Search entry points
- Hybrid chat screen
- Profile / traceability / QR display

## Runtime evidence

### Build and validation

- `npm run validate` ✅
  - `tsc --noEmit` passed
  - `npx expo-doctor` passed
  - Expo loaded local env successfully: `env: load .env`

- `npx expo export --platform web` ✅
  - Expo loaded local env successfully: `env: load .env`
  - Static export completed successfully

### Git / env safety

- `git check-ignore -v .env` ✅
  - `.env` is ignored by `.gitignore`
- `git ls-files --error-unmatch .env` ✅
  - `.env` is not tracked by Git

### Backend runtime verification already completed in this session

- Farmer registration flow worked against the real backend
- Engineer registration flow worked against the real backend
- OTP verification worked against the real backend
- Admin approval worked against the real backend
- Farmer login worked against the real backend
- Engineer login after approval worked against the real backend
- Refresh token worked against the real backend
- Logout worked against the real backend
- `GET /api/users/me` returned correct profile data, role, account status, and avatar state

## Screens completed

- Login
- Register
- OTP verification
- Pending approval / approval
- Farmer authorization
- Session restore / protected navigation
- Profile
- Traceability
- Community
- Cultivation calendar
- Dashboard / operations
- Hybrid chat
- Notifications
- AI diagnosis entry points

## Remaining runtime issues

- `GET /api/auth/session` still returns `500` on the current backend build.
  - Mobile side has been kept resilient around this by relying on refresh + `/api/users/me` hydration.
  - This is not a Mobile-side fix.

- Some advanced runtime flows still need device-level confirmation:
  - iOS/Android camera permission edge cases
  - Push notification delivery on a physical device
  - Full offline / token-expiry retry behavior under poor network

## Anything not verified

- Physical-device camera capture and gallery upload end-to-end
- Real push notification delivery
- Native-only UI behavior on low-memory devices

## Readiness score

**8.7 / 10**

The Mobile app is in a strong release-ready state for the verified auth/profile/session flows, with build validation passing and local env loading confirmed. The main open item is the backend `GET /api/auth/session` 500 response plus a few device-only checks that still need physical hardware confirmation.
