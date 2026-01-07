# Fix: Apple Sign In "Unacceptable audience" Error in Expo Go

## The Problem

When using **Expo Go**, Apple Sign In uses `host.exp.Exponent` as the audience in the ID token, but Supabase expects your Services ID (`com.siteweavesignin.mobile`). This causes the error:

```
Unacceptable audience in id_token: [host.exp.Exponent]
```

## Why This Happens

- **Expo Go**: Uses `host.exp.Exponent` as the audience (development/testing)
- **Development/Production Builds**: Use your actual bundle identifier (`com.siteweave.mobile`)
- **Supabase**: Validates the audience and expects it to match your Services ID

## Solutions

### ✅ Solution 1: Use a Development Build (Recommended)

Instead of Expo Go, use a development build which uses your actual bundle identifier:

```bash
# Build and run on iOS device/simulator
npx expo run:ios

# Or build with EAS
eas build --profile development --platform ios
```

**Why this works:**
- Development builds use your actual bundle identifier (`com.siteweave.mobile`)
- Apple Sign In will use the correct audience
- Supabase will accept the token

### ✅ Solution 2: Update Services ID Configuration

Make sure your Services ID in Apple Developer is configured for your bundle identifier:

1. Go to **Apple Developer** → **Identifiers** → **Services IDs**
2. Find your Services ID: `com.siteweavesignin.mobile`
3. Click **Edit**
4. Under **Sign in with Apple**, make sure:
   - **Primary App ID** is set to your App ID (which uses bundle ID `com.siteweave.mobile`)
   - **Return URLs** include your Supabase callback URL

### ✅ Solution 3: Update Supabase Configuration

In Supabase Dashboard → Authentication → Providers → Apple:

**Option A: Use Bundle Identifier as Services ID**
- **Services ID**: `com.siteweave.mobile` (your bundle identifier)
- This matches what Apple sends in production/development builds

**Option B: Keep Current Services ID**
- **Services ID**: `com.siteweavesignin.mobile` (current)
- This works for production builds if configured correctly

### ⚠️ Important Notes

1. **Expo Go Limitation**: Apple Sign In **will not work** in Expo Go due to the audience mismatch. This is a known limitation.

2. **Testing Options**:
   - Use **development build** (`npx expo run:ios`)
   - Use **production build** (EAS Build)
   - Test on **physical device** (required for Apple Sign In anyway)

3. **Services ID vs Bundle ID**:
   - Your **Bundle ID**: `com.siteweave.mobile` (in app.json)
   - Your **Services ID**: `com.siteweavesignin.mobile` (for Sign in with Apple)
   - These can be different, but the Services ID must be configured correctly in Apple Developer

## Quick Fix for Testing

If you need to test Apple Sign In right now:

1. **Stop using Expo Go** for Apple Sign In testing
2. **Build a development build**:
   ```bash
   npx expo run:ios
   ```
3. **Test on a physical iOS device** (Apple Sign In requires physical device)

## Verification

After switching to a development build, Apple Sign In should work because:
- ✅ The audience will be your bundle identifier (`com.siteweave.mobile`)
- ✅ Supabase will accept the token
- ✅ No more "unacceptable audience" error

## For Production

When building for production:
- Use EAS Build: `eas build --platform ios --profile production`
- The production build uses your bundle identifier
- Apple Sign In will work correctly
- Supabase will accept the tokens

---

**Summary**: The error is expected in Expo Go. Switch to a development or production build to test Apple Sign In.

