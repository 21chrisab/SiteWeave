# Building APK for Direct Distribution

This guide explains how to build an Android APK file that can be distributed directly to users (not through Google Play Store).

## Prerequisites

1. **EAS CLI installed**: `npm install -g eas-cli`
2. **Logged in to Expo**: `eas login`
3. **Environment variables set** in EAS dashboard or `.env` file

## Quick Start

### Option 1: Using the Build Script (Recommended)

```powershell
cd apps/mobile
.\build-apk.ps1
```

### Option 2: Using EAS CLI Directly

```bash
cd apps/mobile
eas build --platform android --profile apk
```

## Environment Variables

Make sure these are set in one of these places:

1. **EAS Dashboard** (Recommended for production):
   - Go to: https://expo.dev/accounts/[your-account]/projects/siteweave-mobile/settings/secrets
   - Add: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. **Local .env file** (for development):
   - Create `.env` in project root with:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your-url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
     ```

## Build Process

1. The build script will:
   - Check EAS CLI installation
   - Verify you're logged in
   - Check for environment variables
   - Start the build on Expo's servers

2. Build time: Typically 10-20 minutes

3. You'll receive a notification when the build completes

## Downloading the APK

### From Expo Dashboard

1. Go to: https://expo.dev/accounts/[your-account]/projects/siteweave-mobile/builds
2. Find your latest APK build
3. Click "Download" button

### Using EAS CLI

```bash
# List recent builds
eas build:list --platform android --profile apk

# Download latest APK
eas build:download --platform android --profile apk --latest

# Download specific build
eas build:download --platform android --profile apk --id [build-id]
```

## Distributing the APK

### Direct Installation

Users can install the APK directly on their Android devices:

1. **Enable Unknown Sources**:
   - Go to Settings → Security → Enable "Install from unknown sources"
   - Or Settings → Apps → Special access → Install unknown apps

2. **Transfer APK to device**:
   - Email the APK file
   - Upload to cloud storage (Google Drive, Dropbox, etc.)
   - Use USB file transfer
   - Use ADB: `adb install app.apk`

3. **Install**:
   - Open the APK file on the device
   - Tap "Install"
   - Follow the prompts

### Distribution Methods

- **Email**: Send APK as attachment
- **Cloud Storage**: Share download link (Google Drive, Dropbox, etc.)
- **Website**: Host APK on your website with download link
- **QR Code**: Generate QR code linking to APK download
- **USB/ADB**: Direct installation via USB connection

## APK vs AAB

- **APK** (Android Package): For direct distribution, can be installed directly
- **AAB** (Android App Bundle): For Google Play Store only, Play Store generates APKs from AAB

The `apk` profile builds an APK file suitable for direct distribution.

## Troubleshooting

### Build Fails with Environment Variable Errors

- Set environment variables in EAS dashboard
- Or ensure `.env` file exists in project root with correct values

### Build Takes Too Long

- Normal build time is 10-20 minutes
- Check Expo status: https://status.expo.dev
- Try building during off-peak hours

### APK Won't Install

- Ensure "Install from unknown sources" is enabled
- Check Android version compatibility
- Verify APK file isn't corrupted (re-download)

### Need to Update Environment Variables

1. Update in EAS dashboard
2. Rebuild: `eas build --platform android --profile apk`

## Security Notes

- APKs can be installed from any source (not just Play Store)
- Users must enable "Install from unknown sources"
- Consider code signing for production releases
- For sensitive apps, consider Play Store distribution instead

## Next Steps

After building and downloading the APK:

1. Test installation on a device
2. Share with beta testers
3. Collect feedback
4. Iterate and rebuild as needed

For production releases, consider:
- Setting up automated builds
- Version management
- Update distribution mechanism
- Analytics and crash reporting
