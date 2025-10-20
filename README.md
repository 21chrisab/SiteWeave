# SiteWeave - Project Management Desktop Application

A comprehensive project management desktop application built with React, Electron, and Vite, featuring dynamic workflows, calendar integration, field issue management, and team collaboration tools.

## Features

- **Desktop Application** - Native Windows desktop app with auto-updates
- **Dynamic Workflow Management** - Create custom workflows for project issues
- **Calendar Integration** - Import events from Google Calendar and Outlook
- **Field Issue Tracking** - Manage and resolve field issues with role-based assignments
- **Team Collaboration** - Messaging, file sharing, and contact management
- **Dropbox Integration** - Secure file storage with user-specific Dropbox accounts
- **Auto-Updates** - Automatic updates via GitHub releases

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Electron in development mode
npm run electron:dev
```

### Production Build
```bash
# Build web application
npm run build

# Build Windows installer
npm run build:win

# Build for all platforms
npm run build:all
```

## OAuth Configuration

The application uses custom protocol handlers for OAuth authentication in the desktop environment:

- **Google Calendar**: `siteweave://google-callback`
- **Microsoft Outlook**: `siteweave://microsoft-callback`
- **Dropbox**: `siteweave://dropbox-callback`

Configure these redirect URIs in your OAuth provider settings.

## Environment Variables

Create a `.env.production` file with your OAuth credentials:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
VITE_MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
VITE_DROPBOX_APP_KEY=your_dropbox_app_key
```

## Database Setup

The application uses PostgreSQL with Supabase. Run the schema file to set up your database:

```bash
psql -d your_database -f schema.sql
```

## Documentation

Detailed documentation for each feature is available in the `/docs` folder:

- [Calendar Integration](docs/calendar-integration.md) - Google Calendar and Outlook integration setup
- [Dynamic Workflow](docs/dynamic-workflow.md) - Custom workflow builder and management
- [Field Issues](docs/field-issues.md) - Field issue tracking and resolution system
- [Dropbox Integration](docs/dropbox-integration.md) - File storage and management setup

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Desktop**: Electron with auto-updater
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **File Storage**: Dropbox API integration
- **Calendar APIs**: Google Calendar API, Microsoft Graph API
- **Build**: electron-builder for packaging
- **CI/CD**: GitHub Actions for automated builds and releases

## Auto-Updates

The application automatically checks for updates on startup and notifies users when new versions are available. Updates are distributed via GitHub releases.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.