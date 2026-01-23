# Android APK Build Guide

## Current Build Status

**Build ID:** `5d9c7d02-dbaa-4934-ae1a-9d267375f158`  
**Status:** In Progress  
**Started:** January 11, 2026, 6:27:34 PM  
**Monitor Build:** https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds/5d9c7d02-dbaa-4934-ae1a-9d267375f158

## Quick Commands

### Check Build Status
```powershell
cd apps/mobile
.\check-build-status.ps1
```

Or manually:
```powershell
cd apps/mobile
eas build:list --platform android --profile apk --limit 1
```

### Download APK (when build completes)
```powershell
cd apps/mobile
.\download-apk.ps1
```

Or manually:
```powershell
cd apps/mobile
eas build:download --platform android --profile apk --latest
```

### Build a New APK
```powershell
cd apps/mobile
.\build-apk.ps1
```

Or manually:
```powershell
cd apps/mobile
eas build --platform android --profile apk
```

## Build Process

1. **Build Time:** Typically 10-20 minutes
2. **Build Location:** Expo's cloud servers
3. **Notification:** You'll receive a notification when complete
4. **Download:** Available via EAS CLI or Expo Dashboard

## Download Methods

### Method 1: Using the Download Script (Recommended)
```powershell
cd apps/mobile
.\download-apk.ps1
```
This will:
- Check build status
- Download the latest APK
- Save it to `apps/mobile/downloads/siteweave-mobile.apk`

### Method 2: Using EAS CLI
```powershell
cd apps/mobile
eas build:download --platform android --profile apk --latest
```

### Method 3: From Expo Dashboard
1. Go to: https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds
2. Find your completed build
3. Click the "Download" button

## Installing the APK

### On Android Device:

1. **Enable Unknown Sources:**
   - Go to Settings → Security → Enable "Install from unknown sources"
   - Or Settings → Apps → Special access → Install unknown apps
   - Select your file manager/browser and enable it

2. **Transfer APK to Device:**
   - Email the APK as attachment
   - Upload to Google Drive/Dropbox and share link
   - Use USB file transfer
   - Use ADB: `adb install siteweave-mobile.apk`

3. **Install:**
   - Open the APK file on the device
   - Tap "Install"
   - Follow the prompts

## Distribution Options

- **Email:** Send APK as attachment
- **Cloud Storage:** Share download link (Google Drive, Dropbox, etc.)
- **Website:** Host APK on your website with download link
- **QR Code:** Generate QR code linking to APK download
- **USB/ADB:** Direct installation via USB connection

## Troubleshooting

### Build Still In Progress
- Normal build time is 10-20 minutes
- Check build logs: https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds
- Check Expo status: https://status.expo.dev

### Build Failed
- Check build logs for errors
- Verify environment variables are set in EAS dashboard
- Ensure you're logged in: `eas whoami`

### APK Won't Install
- Ensure "Install from unknown sources" is enabled
- Check Android version compatibility
- Verify APK file isn't corrupted (re-download)

### Need to Rebuild
```powershell
cd apps/mobile
eas build --platform android --profile apk
```

## Build Configuration

- **Profile:** `apk` (configured in `eas.json`)
- **Build Type:** APK (for direct distribution)
- **Auto Increment:** Enabled (version code auto-increments)
- **Current Version Code:** 5

## Next Steps

1. Wait for build to complete (check status with `.\check-build-status.ps1`)
2. Download APK when ready (`.\download-apk.ps1`)
3. Test installation on a device
4. Distribute to users

## Useful Links

- **Build Dashboard:** https://expo.dev/accounts/abadiech/projects/siteweave-mobile/builds
- **Project Settings:** https://expo.dev/accounts/abadiech/projects/siteweave-mobile/settings
- **Environment Variables:** https://expo.dev/accounts/abadiech/projects/siteweave-mobile/settings/secrets
- **Expo Status:** https://status.expo.dev
