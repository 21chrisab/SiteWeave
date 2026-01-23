# SiteWeave Monorepo

Monorepo containing all SiteWeave applications: Desktop (Electron), Web, and Mobile (React Native/Expo).

## Repository Structure

```
SiteWeave/
├── src/                    # Desktop Electron app
├── electron/              # Electron configuration files
├── apps/
│   ├── mobile/           # React Native/Expo mobile app
│   └── web/              # Web application (Vite + React)
├── packages/
│   └── core-logic/       # Shared business logic package
├── package.json          # Root package.json
└── electron-builder.yml  # Desktop app build configuration
```

## Applications

### Desktop App (Electron)
- **Location:** `src/`
- **Build:** `npm run build:win` (from root)
- **Tech Stack:** Electron, React, Vite

### Web App
- **Location:** `apps/web/`
- **Build:** `cd apps/web && npm run build`
- **Tech Stack:** React, Vite, Tailwind CSS
- **Deployment:** Netlify (see `apps/web/netlify.toml`)

### Mobile App
- **Location:** `apps/mobile/`
- **Build:** `cd apps/mobile && eas build`
- **Tech Stack:** React Native, Expo

## Shared Package

The `packages/core-logic/` package contains shared business logic used by all applications:
- Supabase client configuration
- Service layer (projects, tasks, messages, etc.)
- Common utilities

## Setup

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install dependencies for each app:
```bash
# Web app
cd apps/web && npm install && cd ../..

# Mobile app
cd apps/mobile && npm install && cd ../..
```

3. Create `.env` file with Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Development

### Desktop App
```bash
npm run dev:electron
```

### Web App
```bash
cd apps/web
npm run dev
```

### Mobile App
```bash
cd apps/mobile
npm start
```

## Building

### Desktop App
```bash
npm run build:win
```

### Web App
```bash
cd apps/web
npm run build
```

### Mobile App
```bash
cd apps/mobile
eas build --platform android
```

## GitHub Workflow

See [GITHUB_WORKFLOW_GUIDE.md](./GITHUB_WORKFLOW_GUIDE.md) for instructions on committing and pushing to the correct repository.

## Features

- Project management
- Task tracking
- Real-time messaging
- File and photo management
- Calendar integration
- OAuth authentication (Google, Microsoft)
- Multi-tenant B2B support

