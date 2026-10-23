# Referalli example: React Native (Expo)

An Expo app (`App.tsx`) using `@referalli/react-native`:

- `Referalli.configure` with your public tracking token;
- `Referalli.getReferral()` finds the referral for this install: a universal link / App Link, the Play Install Referrer, or a deferred match on first open;
- `Referalli.addReferralListener` catches links opened while the app runs;
- `Referalli.trackSignup(userId)` attributes the signup to the partner.

The app holds only the public token. Purchases are reported by your backend with your secret key (`POST /v1/mobile/purchases`), after it validates the store receipt.

## Setup

The SDK has a native module, so it needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/); in Expo Go the referral is kept in memory only.

1. In the Referalli dashboard, turn on **Test mode**. Copy your tracking token (**Settings → Tracking**) and a program id.
2. Configure and build:

   ```sh
   cp .env.example .env     # fill in the tracking token and program id
   npm install
   npx expo install --fix   # aligns expo, react-native and react versions with your Expo SDK
   npm run ios              # or: npm run android
   ```

3. For links to open the app, replace `app.example.com` in `app.json` with your domain, and serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` for the app there. Then set your referral links' destination to a URL on that domain.

## Try it

- **Install referrer (Android):** create a link whose destination is your Play listing with `&referrer=via%3D<code>`. Install from it (the referrer is only passed by a Play Store install, for example from an internal testing track) and open the app: "Captured via: installReferrer".
- **Link:** open a referral link on the device; the app opens with "Captured via: link".
- **Signup:** tap **Sign up**. The result shows the partner, and `referalli events tail` (from `@referalli/cli`) shows `referral.created`.

Tap **Reset** to clear the stored referral and try again.

## Privacy

The SDK stores a random install id and the referral on the device. It never reads the IDFA, IDFV, Android advertising id or clipboard, and ships an iOS privacy manifest (no tracking). Read the App Tracking Transparency note in the [mobile docs](https://referalli.com/docs/mobile#privacy-app-tracking-transparency-and-the-privacy-manifest) before you keep `deferredResolution` on.
