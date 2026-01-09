# SiteWeave Web App

Client portal for SiteWeave project management platform.

## Recent Updates

- Added invitation acceptance page with auto-accept functionality
- Invitation links now redirect to organization page after acceptance
- Supports both new user signup and existing user login flows

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Netlify.

## Features

- Project viewing and management
- Task tracking
- File and photo viewing
- Real-time messaging
- OAuth authentication (Google, Microsoft)

