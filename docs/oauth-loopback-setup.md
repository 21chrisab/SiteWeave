# OAuth Provider Configuration for Loopback Method

This document explains how to configure OAuth providers for the SiteWeave desktop application using the loopback method.

## Loopback Method Overview

The loopback method uses `http://127.0.0.1:5000` (localhost) with a specific port to handle OAuth redirects. This is the recommended approach for desktop applications as it's widely supported and doesn't require custom protocol registration.

## Required Redirect URIs

Configure these redirect URIs in your OAuth provider settings:

- **Google Calendar**: `http://127.0.0.1:5000/google-callback`
- **Microsoft Outlook**: `http://127.0.0.1:5000/microsoft-callback`
- **Dropbox**: `http://127.0.0.1:5000/dropbox-callback`

## Provider-Specific Setup

### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Desktop application" as the application type
6. Add the redirect URI: `http://127.0.0.1:5000/google-callback`
7. Download the credentials JSON file
8. Use the `client_id` and `client_secret` in your `.env.production` file

### Microsoft Outlook

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "App registrations"
3. Create a new registration or select existing
4. Go to "Authentication"
5. Add a new platform → "Mobile and desktop applications"
6. Add the redirect URI: `http://127.0.0.1:5000/microsoft-callback`
7. Add API permissions: `Calendars.Read`
8. Generate a client secret
9. Use the `Application (client) ID` and `client secret` in your `.env.production` file

### Dropbox

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app or select existing
3. Choose "Scoped access" → "Full Dropbox"
4. Go to "OAuth 2" settings
5. Add redirect URI: `http://127.0.0.1:5000/dropbox-callback`
6. Use the `App key` in your `.env.production` file

## Environment Variables

Create a `.env.production` file with your OAuth credentials:

```env
# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Microsoft Outlook Integration  
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
VITE_MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# Dropbox Storage Integration
VITE_DROPBOX_APP_KEY=your_dropbox_app_key_here
```

## How It Works

1. **User initiates OAuth**: User clicks "Connect" for a service
2. **Local server starts**: Electron starts a temporary HTTP server on port 5000
3. **Browser opens**: User's default browser opens the OAuth provider's authorization page
4. **User authorizes**: User grants permissions on the provider's website
5. **Callback received**: Provider redirects to `http://127.0.0.1:5000/{provider}-callback`
6. **Local server catches**: The local server receives the callback with authorization code
7. **Token exchange**: App exchanges the code for access token
8. **Server stops**: Local server shuts down automatically
9. **Integration complete**: User can now use the connected service

## Security Benefits

- **No custom protocols**: Avoids OS-specific protocol registration issues
- **Standard HTTP**: Uses well-established HTTP redirects
- **Temporary server**: Server only runs during OAuth flow
- **Localhost only**: Server only accepts connections from localhost
- **Automatic cleanup**: Server stops after successful or failed OAuth

## Troubleshooting

### Port Already in Use
If port 5000 is already in use, the app will show an error. Try:
- Closing other applications using port 5000
- Restarting the application
- Checking for other OAuth flows in progress

### OAuth Provider Errors
- Verify redirect URIs match exactly (including protocol and port)
- Check that client IDs and secrets are correct
- Ensure API permissions are properly configured
- Verify the application type is set to "Desktop application" for Google

### Network Issues
- Ensure no firewall is blocking localhost connections
- Check that the OAuth provider's servers are accessible
- Verify internet connectivity

## Testing

To test the OAuth flow:

1. Start the application in development mode: `npm run electron:dev`
2. Go to Settings → Integrations
3. Try connecting each service
4. Verify the local server starts and stops correctly
5. Check that tokens are properly stored and used
