# SiteWeave Web App

Client portal for SiteWeave project management platform.

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

## Routes

- `/` Dashboard
- `/projects` Project dashboard
- `/projects/:id/tasks` Project workspace (tasks)
- `/projects/:id/gantt` Gantt schedule
- `/projects/:id/field-issues` Field issues
- `/projects/:id/activity` Project activity
- `/team` Team Hub (discussions)
- `/team/directory` Team Hub (directory)
- `/organization` Organization roles and member management
- `/calendar` Calendar
- `/settings` Settings

`/messages` redirects to `/team`.

## Features

- Project and task management
- Gantt scheduling with dependencies
- Team Hub: project discussions + embedded directory
- Organization roles and member administration
- Progress report scheduling and preview
- MS Project XML import
- Calendar management and weather widget
- OAuth authentication (Google, Microsoft)

## Known limitations

- Field issue file uploads are intentionally disabled in the current product flow.

