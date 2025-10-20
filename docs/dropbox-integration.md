# Dropbox Storage Integration

This application now uses Dropbox as the primary file storage backend instead of Supabase Storage. Each user connects their own Dropbox account for file storage.

## Setup Instructions

### 1. Create Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access" 
4. Select "Full Dropbox" access
5. Name your app (e.g., "SiteWeave Storage")
6. Note down your **App Key**

### 2. Configure OAuth Settings

1. In your Dropbox app settings, go to "OAuth 2"
2. Add redirect URI: `https://yourdomain.com/dropbox-callback.html`
3. For local development: `http://localhost:5173/dropbox-callback.html`

### 3. Environment Variables

Add to your `.env` file:
```env
VITE_DROPBOX_APP_KEY=your_dropbox_app_key_here
```

### 4. File Organization

Files are stored in Dropbox under the following structure:
```
/SiteWeave/
├── /{project_id}/           # Project files
├── /field-issues/{issue_id}/ # Field issue attachments  
└── /messages/{channel_id}/   # Message attachments
```

## Features

- **OAuth Authentication**: Each user connects their own Dropbox account
- **Automatic Token Management**: Tokens are stored securely in localStorage
- **File Upload**: All file uploads go directly to user's Dropbox
- **Shared Links**: Files are accessible via Dropbox shared links
- **Connection Status**: Users can see connection status and account info in Settings

## Usage

1. **Connect Dropbox**: Go to Settings → Integrations → Connect to Dropbox
2. **Upload Files**: Files uploaded in projects, field issues, and messages will be stored in Dropbox
3. **Access Files**: Click on any file to open it via Dropbox shared link
4. **Disconnect**: Users can disconnect their Dropbox account anytime

## Security

- Uses OAuth 2.0 with PKCE for secure authentication
- Access tokens stored in localStorage (client-side only)
- Each user's files are isolated in their own Dropbox account
- No server-side token storage required

## Migration Notes

- Existing Supabase Storage files are not migrated automatically
- New uploads will use Dropbox exclusively
- File metadata still stored in Supabase database (only storage backend changed)
- Users must connect Dropbox before uploading files

## Troubleshooting

### "Dropbox App Key not configured"
- Ensure `VITE_DROPBOX_APP_KEY` is set in your `.env` file
- Restart the development server after adding the environment variable

### "Not connected to Dropbox"
- User needs to connect their Dropbox account in Settings
- Check if OAuth redirect URI is correctly configured

### Upload Errors
- Verify Dropbox app has proper permissions
- Check network connectivity
- Ensure user's Dropbox account has sufficient storage space
