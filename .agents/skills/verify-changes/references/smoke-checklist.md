# Mingle Booth Smoke Checklist

## Kiosk (`/`)
- [ ] Screensaver renders with custom branding title, subtitle, and logo if configured.
- [ ] Clicking on screen starts countdown sequence.
- [ ] If no frame has slots, "Frame Configuration Required" warning is displayed with link to Admin.
- [ ] Camera preview mirrors appropriately according to settings.
- [ ] Countdown sounds and shutter sound play correctly without blocking UI.
- [ ] Photo strip compositing aligns each captured photo to its slot coordinates.
- [ ] Animated GIF generation completes and displays preview.
- [ ] QR code encodes `/s/[sessionId]` and displays scan instructions.

## Admin Dashboard (`/admin`)
- [ ] Navigating to `/admin` without authentication redirects to `/admin/login`.
- [ ] Entering incorrect password displays an error banner.
- [ ] Correct password sets session cookie and opens `/admin/camera`.
- [ ] Frame manager permits uploading transparent PNG and editing slots.
- [ ] Changing branding settings updates kiosk immediately upon save.
- [ ] Gallery lists recent photo sessions with working delete buttons.

## Guest Viewer (`/s/[id]`)
- [ ] Opening `/s/[id]` displays the photo strip, animated GIF, and original captures.
- [ ] Legacy URLs (`/?view=latest&strip=...`) correctly render the viewer interface.
