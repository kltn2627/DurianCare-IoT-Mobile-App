# Mobile UI Completeness Audit

This is a source-level inventory for the final hardening pass. It does not imply physical-device validation.

## Route classification

| Area | Routes / screens | Classification |
| --- | --- | --- |
| Shell | `(main)/_layout`, tabs, root stack | MIGRATED; needs iPhone safe-area verification |
| Dashboard | `(main)/index` | MIGRATED |
| Farm | `authorization`, `farm-detail`, engineer approval/profile | PARTIALLY MIGRATED; core authorization styles aligned |
| Cultivation | `calendar`, activity/plan modals | PARTIALLY MIGRATED; dense calendar and modal forms need device review |
| Diagnosis | `diagnosis-history`, `diagnosis-result` | MIGRATED; capture flow needs hardening |
| Community | feed, post detail, create form | PARTIALLY MIGRATED; feed/card aligned, create/detail need device review |
| Knowledge | list, detail, create/edit/review/my articles | PARTIALLY MIGRATED; list aligned, editor/detail need device review |
| Notifications | inbox, detail | MIGRATED; modal/deep-link behavior needs device review |
| Chat | conversation list, field/expert/AI channels, camera sheet | PARTIALLY MIGRATED; composer and keyboard need iPhone review |
| Profile | profile, edit, avatar, password, traceability | PARTIALLY MIGRATED; legacy form styles remain in edit/traceability |
| IoT | sensors / climate monitor | LEGACY UI; highest remaining visual debt |
| Search | search and search result | LEGACY UI; input/results need lightweight mobile treatment |
| Scanner | disease scanner / QR entry | LEGACY UI; camera/permission/overlay need hardening |
| Auth | login, register, OTP, approval flows | PARTIALLY MIGRATED; functional and usable, local form styles remain |
| System | not-found and admin/engineer routes | NEEDS MOBILE HARDENING; lower priority |

## Final hardening targets

1. IoT operational hierarchy and semantic device status.
2. Search input, result density, keyboard behavior and empty/error states.
3. Scanner camera viewport, permissions and invalid/loading states.
4. Diagnosis capture and preview action hierarchy.
5. Chat composer safe-area/keyboard behavior.
6. Shared form/modal touch targets and semantic surface tokens.

## Known limitations

- No physical iPhone session is available in this source-level pass, so Dynamic Island, keyboard animation, camera permission and bottom home-indicator behavior remain device verification items.
- Existing hardcoded colors remain in some image/chart-specific and legacy form styles; they should be migrated only when the surrounding screen is touched.
