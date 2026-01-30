# Mobile updates (iOS + Android) — Stability only

Goal: keep the native shells stable and in sync with the latest PWA/UI changes, without adding new features. The assistant stays disabled.

## 0) Reality check: where do web changes come from?
This project is currently configured to load the web app from a hosted URL inside Capacitor:
- `capacitor.config.ts` has `server.url: https://www.jbsbookme.com`

That means:
- Most UI/PWA changes appear in iOS/Android **after you deploy** to that URL (Vercel), even without rebuilding the native apps.
- A native rebuild mainly updates the shell/plugins/config; it does **not** bundle the Next.js server/API.

If you want to test changes **without Vercel**, you can point the app to a local/staging URL (see section 2).

Tip: `capacitor.config.ts` now supports:
- `CAPACITOR_SERVER_URL` to override the hosted URL
- `CAPACITOR_WEB_SOURCE=bundled` (DEV ONLY) to disable `server.url` and use bundled assets.

For Play Store releases, keep the default (hosted) mode.

## 1) Pre-flight checklist (both platforms)
- Confirm assistant stays disabled:
  - `NEXT_PUBLIC_ASSISTANT_ENABLED` should remain **unset/false**.
  - `/asistente` should redirect/show “Asistente desactivado”.
- Build the web output for Capacitor (static assets folder):
  - `NEXT_OUTPUT_MODE=export npm run build`
  - Verify `out/` exists and contains `index.html` and assets.

  ## 1.1) Android icon + splash assets (fix the "X" placeholder)
  This repo uses `@capacitor/assets`.

  Required input files:
  - `assets/icon.png` (1024x1024 PNG)
  - `assets/splash.png`

  Generate Android resources:
  - `npm install -D @capacitor/assets`
  - `npx capacitor-assets generate --android`

  Then:
  - `npx cap sync android`
  - `cd android && ./gradlew clean`

## 2) Don’t depend on Vercel for testing (optional)
To see changes on devices without pushing to Vercel:
1) Run a local dev server reachable from the phone (same Wi‑Fi):
   - `next dev -H 0.0.0.0 -p 3000`
2) Point Capacitor to your LAN IP:
   - Set `CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:3000`
3) Sync and run on device.

Notes:
- iOS devices cannot reach `localhost` on your Mac. Use your LAN IP.
- If you use plain HTTP locally, you may need to allow cleartext / ATS exceptions for dev.

## 3) Platform projects status (important)
Run:
- `npx cap doctor`

If it reports missing files (e.g. missing `gradlew`, missing `app/src/main`, missing iOS Xcode project), regenerate platforms:
- `npx cap add android`
- `npx cap add ios`

Then:
- `npx cap sync`

## 4) Android (Android Studio / Play build)
### Clean + Debug (recommended first)
- `npx cap sync android`
- (Optional) open Android Studio: `npx cap open android`
- Clean build (CLI):
  - `cd android`
  - `./gradlew clean`
  - `./gradlew assembleDebug`

### Release (later)
Release bundle (AAB) for Play:
- Ensure Capacitor is in hosted mode (default) and points to production:
  - `export CAPACITOR_SERVER_URL=https://www.jbsbookme.com`
  - `unset CAPACITOR_WEB_SOURCE` (or set it to `hosted`)
- (Optional) set version:
  - `ANDROID_VERSION_CODE=2`
  - `ANDROID_VERSION_NAME=1.0.1`
- (Required for Play upload) set signing env vars:
  - `ANDROID_KEYSTORE_PATH=/absolute/path/to/your.jks`
  - `ANDROID_KEYSTORE_PASSWORD=...`
  - `ANDROID_KEY_ALIAS=...`
  - `ANDROID_KEY_PASSWORD=...`

- Sync + build:
  - `npm run cap:sync:android`
  - `./scripts/android-release.sh`

The script validates the AAB is signed before reporting success.

Output:
- `android/app/build/outputs/bundle/release/app-release.aab`

### Android verification checklist
- Gallery `/galeria`:
  - Zoom resets correctly; swipe/next/prev works.
  - Video opens without gray placeholder flash.
- Booking `/reservar`:
  - Calendar step does not jump to top; scroll anchor feels correct.
- CTA:
  - “BOOK NOW” visible and animations don’t lag.
- Directions:
  - Menu address opens Directions correctly.
- Assistant:
  - Entry points hidden; `/asistente` is disabled.

## 5) iOS (Xcode)
### Clean + Run on device
- `npx cap sync ios`
- Open Xcode project:
  - `npx cap open ios`
- In Xcode:
  - Product → Clean Build Folder
  - Run on a real device

### iOS verification checklist
Same as Android plus:
- Check safe-area layout (header/footer spacing) and keyboard behavior.
- Confirm links that open external apps (Maps/Share) behave as expected.

## 6) Expected differences: PWA vs Native (report when found)
Common areas where behavior can differ:
- Service worker / caching / offline: WKWebView differs from Safari.
- Push notifications: PWA web push vs native push are not identical.
- Camera/file uploads: file chooser and permissions differ.
- `navigator.share`, haptics, and audio policies vary by OS.

When you find a difference, record:
- Platform (iOS/Android), device model + OS version
- Steps to reproduce
- What happens in PWA vs what happens in native
- Screenshots/screen recording if possible

## 7) PWA cache/SW anti-regression checklist (production)
- Confirm prod build identity:
  - Open https://www.jbsbookme.com/api/version and verify `buildTime`, `vercel.deploymentId`, and `swVersion`.
- Ensure SW versioning is active:
  - `NEXT_PUBLIC_SW_VERSION` is set during build (Next config injects it from Vercel envs).
  - Service worker URL includes `?sw=<version>`.
- Confirm SW script is never cached by CDN:
  - Response header for /service-worker.js is `Cache-Control: no-store`.
- Force a clean redeploy when needed:
  - Vercel → Deployments → Redeploy → **Clear build cache**.
  - Or `vercel --prod --force`.
- Sanity checks after deploy:
  - PWA + Android show the same UI/data (services, photos, posts, bookings).
  - No 404 when navigating back/exit.
- Emergency rollback plan:
  - Temporarily disable SW registration if necessary (feature flag), then re-enable after fix.
