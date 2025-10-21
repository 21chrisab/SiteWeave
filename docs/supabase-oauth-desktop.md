# Supabase OAuth Configuration for Desktop App

This guide explains how to configure Supabase OAuth for the SiteWeave desktop application.

## The Problem

When using Supabase OAuth in an Electron desktop app, the default redirect behavior sends users to `http://localhost:3000` (or similar web URLs), which doesn't work in a desktop environment. The solution is to use the **loopback method** with a local HTTP server.

## Solution: Loopback Method

The desktop app now uses `http://127.0.0.1:5000/supabase-callback` as the redirect URI, which is handled by a temporary local HTTP server in the Electron app.

## Supabase Configuration

### 1. Update Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add these redirect URLs:
   - `http://127.0.0.1:5000/supabase-callback`
   - `http://localhost:5000/supabase-callback`

### 2. Configure OAuth Providers

#### Google OAuth Setup

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Make sure the redirect URI in Google Cloud Console includes:
   - `http://127.0.0.1:5000/supabase-callback`
   - `http://localhost:5000/supabase-callback`

#### Microsoft/Azure OAuth Setup

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Azure** provider
3. Add your Azure OAuth credentials:
   - **Client ID**: From Azure App Registration
   - **Client Secret**: From Azure App Registration
4. Make sure the redirect URI in Azure includes:
   - `http://127.0.0.1:5000/supabase-callback`
   - `http://localhost:5000/supabase-callback`

## How It Works

### 1. User Initiates OAuth
- User clicks "Login with Google" or "Login with Microsoft"
- App detects it's running in Electron mode
- Redirect URI is set to `http://127.0.0.1:5000/supabase-callback`

### 2. OAuth Flow
- Browser opens with Supabase OAuth page
- User authenticates with their provider
- Provider redirects to `http://127.0.0.1:5000/supabase-callback` with tokens

### 3. Local Server Handles Callback
- Electron's local HTTP server receives the callback
- Server extracts tokens from URL hash
- Server sends tokens to the main app window
- Browser shows "Authentication Successful!" page

### 4. App Processes Tokens
- App receives tokens via IPC
- Tokens are parsed and converted to Supabase session
- Session is set in Supabase client
- User is logged in

## Testing the Setup

### 1. Start the App
```bash
npm run electron:dev
```

### 2. Test OAuth Flow
1. Click "Login with Google" or "Login with Microsoft"
2. Browser should open with OAuth page
3. Complete authentication
4. Should redirect to `http://127.0.0.1:5000/supabase-callback`
5. Should see "Authentication Successful!" page
6. Browser window should close automatically
7. App should show user as logged in

### 3. Check Console Logs
Look for these messages in the console:
- `OAuth server listening on http://127.0.0.1:5000`
- `Supabase OAuth callback received:`
- `Using Electron OAuth flow`

## Troubleshooting

### OAuth Redirects to Wrong URL
**Problem**: OAuth redirects to `http://localhost:3000` instead of `http://127.0.0.1:5000/supabase-callback`

**Solution**: 
- Check Supabase Dashboard URL Configuration
- Ensure redirect URLs are exactly: `http://127.0.0.1:5000/supabase-callback`
- Check OAuth provider settings (Google/Azure) for correct redirect URIs

### "Localhost Failed to Connect" Error
**Problem**: Browser shows "localhost failed to connect" after OAuth

**Solution**:
- Check if OAuth server is running: Look for "OAuth server listening" in console
- Check if port 5000 is available
- Restart the app if needed

### OAuth Server Not Starting
**Problem**: No "OAuth server listening" message in console

**Solution**:
- Check if port 5000 is already in use
- Close other applications using port 5000
- Restart the app

### Tokens Not Received
**Problem**: OAuth completes but user doesn't get logged in

**Solution**:
- Check console for "Supabase OAuth callback received" message
- Verify tokens are being parsed correctly
- Check Supabase client session state

## Environment Variables

Make sure your `.env.production` file contains:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OAuth Provider Credentials (if using direct OAuth)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

## Security Notes

- The local HTTP server only accepts connections from localhost
- Server automatically stops after OAuth completion
- Tokens are handled securely through IPC
- No tokens are stored in browser cache
- OAuth flow has a 5-minute timeout

## Files Modified

- `src/components/LoginForm.jsx` - Updated OAuth redirect URIs
- `src/utils/supabaseElectronAuth.js` - New OAuth handler for Electron
- `src/context/AppContext.jsx` - Added OAuth callback listener
- `electron/main.cjs` - Enhanced OAuth server for Supabase callbacks

The OAuth flow should now work seamlessly in the desktop app! 🚀
