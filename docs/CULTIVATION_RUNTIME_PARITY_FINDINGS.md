# Cultivation runtime comparison — 2026-09-29

## Confirmed mismatch

- Local portal port 3000 was running `next start` against a production build dated 2026-08-16. The current zone detail source was modified on 2026-09-27. Updating source had not updated the running portal.
- The old build contained the old cultivation-zone endpoint and mock zone detail. The screenshot's `ZONE-001`, `Khu Đông RI6`, 164 trees, planting date 2020-06-10 and harvest yields 18.4/14.8 match `src/lib/cultivation/mock.ts` exactly.
- Mobile reads `GET /api/v1/farms` and renders `Farm.zones`. Farm selectors are farms; the cards underneath are zones within the selected farm. They are not additional copies of the Web mock zone.
- Current Web source also uses `farmZoneClient` -> `GET /api/v1/farms`. Its filters must match Mobile's selected farm and the same authenticated account to compare counts.

## Changes and verification

- Rebuilt Web successfully and restarted local port 3000. The new BUILD_ID file is dated 2026-09-29. Unauthenticated access redirects to login successfully.
- The previous production build is preserved in Web `.data/build-backups/before-parity-20260929220408`.
- Mobile zone detail now has exactly one Back control, in the fixed header. Closing retains the underlying list and selection.
- Added a safe-area provider at the zone modal root to measure its native window.
- Moved the long section description below the title/action row. The Add zone button can wrap inside the panel instead of being pushed outside the viewport.
- Farm title/actions wrap on narrow layouts; buttons have a minimum 44-point target.
- Zone ACTIVE is labelled "Đang hoạt động", matching current Web; a lifecycle stage is not inferred from ACTIVE.
- Parent farm address is explicitly labelled as a farm address, not a zone location.
- Mobile typecheck and diff whitespace check passed.

## Not yet verified / missing functionality

- Authenticated Web and physical iPhone have not been compared after this build; user has not supplied the portal URL for confirming it is this local instance.
- Detailed agronomy fields (variety on the zone, planting date, tree counts, planting distance, water/drainage and growth stage) are not in the current FarmZone DTO. Web mock harvest histories are not equivalent to the cultivation-season catalog.
- Rebuilding aligns the data source; it does not implement these missing backend fields or migrate browser mock data. No database records were removed, filtered out to force a single garden, or copied from mock data.
- Full rich-field parity remains incomplete. Do not mark it complete based on typecheck or rebuilding Web.

## Retest

1. Open the local portal on port 3000, reload and sign into the same account used on iPhone. If an old mock-zone detail URL is open, return to the zone list and select an API-backed zone.
2. Select the same farm on both platforms, with no additional Web status/search filter. Compare zone IDs/names, area and description.
3. Reload Mobile, verify Add zone is entirely inside the panel and opens the editor. Cancel without saving.
4. Open a zone, verify a single header Back button returns to the same farm/list position. Check a narrow screen and enlarged system text.

