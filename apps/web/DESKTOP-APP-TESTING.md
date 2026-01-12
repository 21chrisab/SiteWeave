# Desktop App Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Make sure your `.env` file in the project root has:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the Desktop App in Development Mode

```bash
npm run dev:electron
```

This will:
- Start the Vite dev server
- Launch Electron with hot-reload enabled
- Open the desktop app window

## Testing Features

### Authentication
- **Email/Password Login**: Should work normally
- **OAuth (Google/Microsoft)**: Uses loopback method on `http://127.0.0.1:5000`
  - Make sure OAuth redirect URLs are configured in Supabase Dashboard
  - See `docs/supabase-oauth-desktop.md` for OAuth setup

### Multi-Tenant Features
- **Organization Context**: App should load user's organization
- **Data Isolation**: Users should only see their organization's data
- **Guest Access**: Test project collaborator access
- **Role Permissions**: Test different role permissions

### Project Management
- **Create/Edit Projects**: Test CRUD operations
- **Duplicate Project**: Test with date shifting
- **Project Collaborators**: Add/remove guest users

### User Management (Admin Only)
- **Invite Users**: Send invitations
- **Manage Roles**: Create/edit custom roles
- **Team Management**: View/manage team members

## Building for Production

### Windows
```bash
npm run build:win
```

This creates a Windows installer in the `release/` folder.

### Other Platforms
Modify `electron-builder.yml` and add scripts for:
- macOS: `build:mac`
- Linux: `build:linux`

## Troubleshooting

### App Won't Start
1. Check that `.env` file exists and has correct values
2. Verify Supabase URL and anon key are correct
3. Check console for errors

### OAuth Not Working
1. Verify redirect URLs in Supabase Dashboard:
   - `http://127.0.0.1:5000/supabase-callback`
   - `http://localhost:5000/supabase-callback`
2. Check OAuth provider settings (Google/Azure)
3. See `docs/supabase-oauth-desktop.md` for detailed setup

### Data Not Loading
1. Verify user has `organization_id` set in profiles table
2. Check RLS policies are enabled
3. Verify user's role has required permissions

### Hot Reload Not Working
- Make sure you're using `npm run dev:electron` (not `npm run dev`)
- The electron dev mode uses `vite.config.mjs` which has electron plugins

## Development Tips

### Debugging
- Open DevTools: `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (Mac)
- Check main process logs in terminal
- Check renderer process logs in DevTools console

### File Structure
- **Electron Main Process**: `electron/main.cjs`
- **Electron Preload**: `electron/preload.js`
- **Renderer (React)**: `src/`
- **Vite Config**: `vite.config.mjs` (for electron), `vite.config.ts` (for web)

### Environment Variables
- Desktop app uses `.env` in project root
- Variables must be prefixed with `VITE_` to be exposed to the renderer
- Main process can access all environment variables

## Testing Checklist

- [ ] App launches successfully
- [ ] Can sign in with email/password
- [ ] Can sign in with OAuth (if configured)
- [ ] Organization context loads correctly
- [ ] Projects list shows only user's organization projects
- [ ] Can create new project
- [ ] Can edit existing project
- [ ] Can duplicate project with date shifting
- [ ] Can add project collaborators (if admin)
- [ ] Can manage users (if admin)
- [ ] Can manage roles (if admin)
- [ ] File upload/download works
- [ ] Messages/chat works
- [ ] Calendar events work
- [ ] Tasks work
- [ ] OAuth callback works (if using OAuth)

## Next Steps

1. Test all features in development mode
2. Fix any issues found
3. Build production version
4. Test production build
5. Distribute to testers

