# DurianCare Mobile — iPhone UI QA Checklist

## Responsive & Keyboard Regression

Run this section on a small iPhone, a regular iPhone, a Dynamic Island iPhone, and one common Android width where available.

### Forms

Screens: Login, Register, OTP verification, Profile edit, Change password, Farm authorization, Engineer approval, Knowledge editor/review, Community create/comment, Cultivation forms, IoT device management, and Traceability forms.

- [ ] Focus first input
- [ ] Focus middle input
- [ ] Focus last input
- [ ] Keyboard does not cover focused input
- [ ] Can scroll while keyboard is open
- [ ] Validation message is visible/reachable
- [ ] Submit action is reachable
- [ ] Keyboard dismiss restores layout
- [ ] No excessive blank space after dismissal

### Major screens

- [ ] No horizontal overflow
- [ ] No clipped text
- [ ] Long Vietnamese text wraps correctly
- [ ] Long IDs do not break layout
- [ ] Header does not collide with actions
- [ ] Bottom content clears the home indicator
- [ ] Content fits narrow iPhone width

Screens: Dashboard, Farm, Calendar, Diagnosis, IoT, Community, Knowledge, Search, Notifications, Chat, Profile, and Traceability.

### Chat-specific checks

- [ ] Composer remains above the keyboard
- [ ] Message list uses the remaining viewport
- [ ] Multiline composer stays within a sensible height
- [ ] Send remains accessible
- [ ] Dismissing and reopening the keyboard does not accumulate blank space
- [ ] Socket/realtime behavior remains unchanged

### Device follow-up

- [ ] Verify camera/scanner overlays around the notch and home indicator
- [ ] Verify modal forms with the keyboard open
- [ ] Verify long UUID, farm ID, season ID, plan ID, device ID, email, and article text values
- [ ] Record screenshots for any remaining clipping or density issue
