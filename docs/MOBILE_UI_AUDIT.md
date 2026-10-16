# DurianCare Mobile UI Audit

## Scope discovered

- Expo Router with a protected root stack and a `(main)` tab shell.
- Primary tabs: Tổng quan, Tri thức, Kênh chat, Canh tác, Thêm.
- Secondary routes: search, notifications, scanner, community, sensors, authorization, profile, traceability.
- Feature groups: auth, dashboard, cultivation, diagnosis, IoT, community, knowledge, chat, notification, profile, scanner, search.
- Shared UI before this pass: `DurianScreenHeader` and a small color/radius/spacing theme. Most screens still own their styles.

## Main inconsistencies

- Dark green hero/header and dark green tab bar compete with content and make screens feel heavier than necessary.
- Surface, border, radius, shadow and typography values are repeated per screen instead of using semantic tokens.
- Buttons, status pills, cards and inputs have several local variants and inconsistent heights.
- Dashboard had a dense collection of equally weighted cards and mock-looking visual emphasis.
- Loading/empty/error handling exists in many data screens but is not presented with one consistent visual language.
- Forms and long Vietnamese labels need a shared 48px control baseline and more predictable text hierarchy.

## Design direction

- Light canvas with white surfaces, moss as the primary action color, durian yellow as a selective accent.
- Semantic colors: background, surface, surfaceSecondary, primary, border, text, success, warning, danger and info.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32.
- Moderate radii: 8 / 12 / 16 / 22, with pill reserved for statuses and compact filters.
- Mobile type hierarchy: display, title, section, body, caption and label.
- Minimum interactive height: 48px; icon touch targets: 44px.

## Reusable components to adopt

- `AppCard`
- `AppButton`
- `StatusBadge`
- `DurianScreenHeader`
- Follow-up primitives: `ScreenContainer`, `SectionHeader`, `AppInput`, `EmptyState`, `ErrorState`, and `LoadingState`.

## Implemented in this pass

- Expanded `durianTheme` with semantic colors, typography, spacing, control sizes and restrained card elevation.
- Refreshed the shared screen header to a lighter, content-first treatment.
- Refreshed the bottom tab shell with light surfaces, borders and clearer active/inactive states.
- Added reusable card, button and status badge primitives.
- Applied the new visual language to the dashboard presentation layer while preserving its existing API calls, state and routes.

## Next implementation order

1. Apply the primitives to auth and profile forms, including keyboard-safe action areas.
2. Standardize cultivation/calendar, diagnosis and IoT cards plus loading/empty/error states.
3. Standardize community, knowledge, notification and chat list rows.
4. Run a global spacing, text-overflow, safe-area and iPhone/Android responsive pass.
5. Validate on Expo web/typecheck, then physical iPhone flows for keyboard, camera, tab bar and safe areas.
