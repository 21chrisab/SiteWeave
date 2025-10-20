# SiteWeave - Project Management Application

A comprehensive project management application built with React and Vite, featuring dynamic workflows, calendar integration, field issue management, and team collaboration tools.

## Features

- **Dynamic Workflow Management** - Create custom workflows for project issues
- **Calendar Integration** - Import events from Google Calendar and Outlook
- **Field Issue Tracking** - Manage and resolve field issues with role-based assignments
- **Team Collaboration** - Messaging, file sharing, and contact management
- **Dropbox Integration** - Secure file storage with user-specific Dropbox accounts

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
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
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **File Storage**: Dropbox API integration
- **Calendar APIs**: Google Calendar API, Microsoft Graph API
