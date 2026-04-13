# Mobile Packaging Guide

## Current state

- Capacitor is already installed in the frontend.
- `android/` and `ios/` native projects already exist in the repo.
- Deep links can be opened through the custom scheme `sentimospadel://app`.
- The app still needs a real `VITE_API_BASE_URL` per environment.
- Native builds store auth tokens with `@aparajita/capacitor-secure-storage`.

## Frontend prerequisites

- Node.js 22+
- npm 10+

## Android prerequisites

- Android Studio
- Android SDK
- One device or emulator

## iOS prerequisites

- macOS
- Xcode
- CocoaPods

## Environment configuration

Create `.env.local` in `frontend/` and set:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Recommended values by target:

- Android emulator: `http://10.0.2.2:8081`
- Android physical device: `http://<your-lan-ip>:8081`
- iOS simulator on the same Mac as the backend: `http://localhost:8081`
- iPhone physical device: `http://<your-lan-ip>:8081`

If the backend will be used by non-technical testers, prefer a stable HTTPS staging URL instead of local LAN URLs.

For staging, copy `.env.staging.example` to `.env.staging` and use:

```env
VITE_API_BASE_URL=https://api-staging.sentimospadel.com
```

For production, copy `.env.production.example` to `.env.production` and use:

```env
VITE_API_BASE_URL=https://api.sentimospadel.com
```

## Capacitor environment

Capacitor uses `CAPACITOR_ENV` to generate native config:

- `development`: allows cleartext for local testing.
- `staging`: allows cleartext only as a development/testing escape hatch.
- `production`: does not set `server.cleartext`; production mobile must use HTTPS.

The iOS `NSAllowsArbitraryLoadsInWebContent` exception is not part of the base project anymore. Production iOS should not allow arbitrary HTTP web content.

## Token storage

Web builds keep auth tokens in `localStorage`.

Native Capacitor builds use secure storage:

- iOS: system Keychain
- Android: Android Keystore-backed encrypted storage

The app initializes token storage on startup before hydrating the current session. Access tokens and refresh tokens are cached in memory for API calls and written through to native secure storage on login, refresh and logout.

## Build and sync

```powershell
npm run build:mobile
npm run cap:sync:android
npm run cap:sync:ios
```

Recommended staging sync:

```powershell
npm run cap:sync:android:staging
npm run cap:sync:ios:staging
```

Recommended production sync:

```powershell
npm run cap:sync:android:production
npm run cap:sync:ios:production
```

On iOS, run the sync commands on macOS with CocoaPods and Xcode installed.

## Android workflow

```powershell
npm run cap:open:android
```

Then in Android Studio:

1. Let Gradle sync.
2. Choose emulator or device.
3. Run the app.

## iOS workflow

```powershell
npm run cap:open:ios
```

Then in Xcode:

1. Open `ios/App/App.xcworkspace`.
2. Select the `App` target.
3. Set the signing team and bundle settings.
4. Run `pod install` if Xcode asks for it.
5. Choose simulator or device.
6. Run the app.

## Deep links

Current custom-scheme format:

- `sentimospadel://app?matchInvite=<token>`
- `sentimospadel://app?tournamentInvite=<token>`

Backend-generated public invite links still use web URLs. The custom scheme is useful for native testing while universal links are still pending.
