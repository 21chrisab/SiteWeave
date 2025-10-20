# Calendar Integration Setup

This application now supports importing calendar events from Google Calendar and Outlook Calendar.

## Features Added

1. **Import Calendar Modal** - A new modal that allows users to import calendar events
2. **File Import** - Support for importing ICS files from any calendar application
3. **Google Calendar Integration** - OAuth2 integration with Google Calendar API
4. **Outlook Calendar Integration** - OAuth2 integration with Microsoft Graph API
5. **Event Preview** - Preview imported events before adding them to the calendar

## Setup Instructions

### 1. Google Calendar Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Set the redirect URI to: `https://yourdomain.com/calendar`

### 2. Microsoft Outlook Integration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "App registrations"
3. Create a new registration
4. Add the following API permissions:
   - `Calendars.Read`
5. Generate a client secret
6. Set the redirect URI to: `https://yourdomain.com/calendar`

### 3. Environment Variables

Create a `.env.local` file in your project root with:

```env
# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Microsoft Outlook Integration  
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
```

## How It Works

### File Import
- Users can upload ICS files exported from any calendar application
- The app parses the ICS format and extracts event information
- Events are previewed before import

### OAuth Integration
- Users click "Connect Google" or "Connect Outlook"
- A popup window opens for OAuth authorization
- After authorization, events are fetched and imported automatically
- The integration uses mock APIs for demonstration (can be replaced with real backend)

## Mock Implementation

The current implementation uses mock APIs for demonstration purposes. To use with real APIs:

1. Replace the mock functions in `src/utils/mockApi.js` with actual API calls
2. Implement backend endpoints for OAuth token exchange
3. Update the integration functions in `src/utils/calendarIntegration.js`

## Database Schema

The calendar events are stored in the `calendar_events` table with the following fields:
- `title` - Event title
- `description` - Event description
- `start_time` - Event start time
- `end_time` - Event end time
- `location` - Event location
- `attendees` - Event attendees
- `category` - Event category
- `color` - Event color
- `is_all_day` - Whether it's an all-day event
- `external_id` - ID from external calendar (for deduplication)
- `external_source` - Source calendar (google/outlook)

## Security Notes

- OAuth tokens should be handled securely on the backend
- Never expose client secrets in frontend code
- Implement proper token refresh mechanisms
- Add rate limiting for API calls
- Validate and sanitize imported data
