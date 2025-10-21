# OAuth Setup Guide for SiteWeave Desktop App

This guide explains how to configure OAuth providers for the SiteWeave desktop application.

## Google Calendar Integration

### 1. Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Desktop application" as the application type
6. Name it "SiteWeave Desktop"

### 2. Configure Redirect URIs

For the desktop app, add these redirect URIs:
- `http://127.0.0.1:5000/google-callback`
- `http://localhost:5000/google-callback`

### 3. Get Credentials

1. Copy the **Client ID** and **Client Secret**
2. Add them to your `.env.production` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Microsoft Outlook Integration

### 1. Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name it "SiteWeave Desktop"
5. Choose "Accounts in any organizational directory and personal Microsoft accounts"
6. Leave redirect URI empty for now

### 2. Configure Redirect URIs

1. Go to "Authentication" in your app registration
2. Add these redirect URIs:
   - `http://127.0.0.1:5000/microsoft-callback`
   - `http://localhost:5000/microsoft-callback`
3. Check "Access tokens" and "ID tokens" under "Implicit grant and hybrid flows"

### 3. Add API Permissions

1. Go to "API permissions"
2. Add these Microsoft Graph permissions:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `User.Read`

### 4. Get Credentials

1. Go to "Certificates & secrets"
2. Create a new client secret
3. Copy the **Application (client) ID** and **Client Secret**
4. Add them to your `.env.production` file:
   ```
   VITE_MICROSOFT_CLIENT_ID=your_client_id_here
   VITE_MICROSOFT_CLIENT_SECRET=your_client_secret_here
   ```

## Dropbox Integration

### 1. Create Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access"
4. Choose "Full Dropbox" access
5. Name it "SiteWeave Desktop"

### 2. Configure Redirect URIs

1. Go to your app settings
2. Add these redirect URIs:
   - `http://127.0.0.1:5000/dropbox-callback`
   - `http://localhost:5000/dropbox-callback`

### 3. Get Credentials

1. Copy the **App key** and **App secret**
2. Add them to your `.env.production` file:
   ```
   VITE_DROPBOX_APP_KEY=your_app_key_here
   VITE_DROPBOX_APP_SECRET=your_app_secret_here
   ```

## Testing OAuth Flow

### 1. Start the App

```bash
npm run electron:dev
```

### 2. Test OAuth

1. Click "Login with Google" in the app
2. A browser window should open with Google OAuth
3. After authentication, you should see "Authentication Successful!" page
4. The browser window should close automatically
5. The app should receive the OAuth callback

### 3. Troubleshooting

**If OAuth redirects to localhost instead of the app:**
- Check that your OAuth app is configured with the correct redirect URIs
- Ensure the OAuth server is running on port 5000
- Check the console for any error messages

**If the preload script fails to load:**
- The preload script now uses CommonJS syntax (fixed)
- Rebuild the app: `npm run build`

**If the OAuth server fails to start:**
- Check if port 5000 is already in use
- The app will show "Port 5000 is already in use" in the console
- Close any other applications using port 5000

## Environment Variables

Make sure your `.env.production` file contains all required credentials:

```env
# Google Calendar
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft Outlook
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
VITE_MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Dropbox
VITE_DROPBOX_APP_KEY=your_dropbox_app_key
VITE_DROPBOX_APP_SECRET=your_dropbox_app_secret
```

## Security Notes

- Never commit your `.env.production` file to version control
- Keep your client secrets secure
- Use different OAuth apps for development and production
- Regularly rotate your client secrets
