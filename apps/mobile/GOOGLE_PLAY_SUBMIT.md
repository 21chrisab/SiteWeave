# Submit to Google Play (Internal / Dev)

## Why run locally

`eas submit --platform android` needs a **Google Service Account JSON key**. EAS will prompt you for the path to the key file. That prompt only works when you run the command in your own terminal (not in automated environments without stdin).

## Prerequisites

1. **Google Service Account** for Play Console API access  
   - Create and download the JSON key: [Expo guide](https://expo.fyi/creating-google-service-account)  
   - Optional: upload the key in [Expo Dashboard → Project → Credentials → Android](https://expo.dev) so EAS can use it without asking every time.

2. **Production build (AAB)**  
   - The “latest” build may be an **APK** (from `apk` profile). Google Play only accepts **AAB**.  
   - If you don’t have a recent production build, create one first:
   ```powershell
   cd apps\mobile
   eas build --platform android --profile production
   ```
   - Wait for the build to finish, then submit (see below).

## Submit the latest build

From your machine (in a terminal where you can answer prompts):

```powershell
cd apps\mobile
eas submit --platform android --latest
```

- When asked for **Path to Google Service Account file**, provide the path to your `.json` key (e.g. `C:\path\to\your-service-account.json`).
- EAS will use the **production** submit profile, which is set to **internal** track in `eas.json` (Google Play internal testing).

## Submit a specific build

To submit a build that is not the latest:

```powershell
eas submit --platform android --id <build-id>
```

Get build IDs with:

```powershell
eas build:list --platform android --limit 5
```

Use a build from the **production** profile (AAB). APK builds cannot be submitted to the Play Store.

## Track

- Current config in `eas.json`: **internal** (internal testing).
- To use another track (e.g. alpha, beta, production), change `submit.production.android.track` in `eas.json` to `"alpha"`, `"beta"`, or `"production"`.
