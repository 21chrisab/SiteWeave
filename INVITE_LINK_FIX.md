# Invite Link MIME Type Error - Fix Summary

## Problem
When users clicked on invitation links (e.g., `https://yoursite.com/invite/token123`), they encountered a blank page with the console error:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".
```

## Root Causes
1. **Merge Conflicts**: Multiple Git merge conflicts in critical files prevented proper builds
2. **SPA Routing Configuration**: Netlify wasn't properly configured to handle client-side routing
3. **Incorrect Router Setup**: React Router was misconfigured causing routing issues

## Fixes Applied

### 1. Resolved Merge Conflicts

**File: `apps/web/package.json`**
- Merged conflicting dependencies
- Combined version information correctly
- Ensured all FullCalendar dependencies and core-logic package are included

**File: `apps/web/src/main.jsx`**
- Removed merge conflict markers
- Simplified to use `BrowserRouter` instead of `createBrowserRouter`
- Cleaned up imports

### 2. Updated Netlify Configuration

**Both `netlify.toml` files (root and apps/web) now have:**
```toml
[build]
  base = "apps/web"
  command = "npm install && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA routing - Critical for client-side routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for proper MIME types
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/*.js"
  [headers.values]
    Content-Type = "application/javascript; charset=utf-8"

[[headers]]
  for = "/assets/*.css"
  [headers.values]
    Content-Type = "text/css; charset=utf-8"
```

**Key Changes:**
- Set `base = "apps/web"` to build from the correct directory
- Set `publish = "dist"` (relative to base directory)
- Added explicit `[[redirects]]` section for SPA routing with status 200
- Simplified headers configuration

### 3. Updated Vite Configuration

**File: `apps/web/vite.config.ts`**
- Explicitly set `publicDir: 'public'` to ensure _redirects file is copied
- Added `rollupOptions` for better build output

### 4. Verified _redirects File

**File: `apps/web/public/_redirects`**
- Already correctly configured with `/* /index.html 200`
- This provides backup SPA routing if netlify.toml redirects fail
- Will be automatically copied to `dist` folder during build

## How It Works Now

1. **User clicks invite link**: `https://yoursite.com/invite/abc123`
2. **Netlify receives request**: Checks if file exists at that path
3. **No file found**: Netlify applies redirect rule
4. **Returns index.html**: With status 200 (not 404) and correct MIME type
5. **React loads**: index.html loads main.jsx as a module
6. **Router handles route**: React Router sees `/invite/abc123` and renders `InviteAcceptPage`

## Deployment Steps

To deploy these fixes to your Netlify site:

### Option 1: Push to GitHub (Recommended)
```bash
cd apps/web
git add .
git commit -m "Fix invite link MIME type error - resolve merge conflicts and update Netlify SPA routing"
git push origin main
```

Netlify will automatically detect the changes and rebuild your site.

### Option 2: Manual Netlify Deploy
```bash
cd apps/web
npm install
npm run build
```

Then drag the `dist` folder to Netlify's manual deploy section.

## Testing

After deployment, test by:

1. **Create a test invite** in your app
2. **Copy the invite link** (e.g., `https://yoursite.com/invite/test123`)
3. **Open in incognito window** to avoid cached errors
4. **Verify**:
   - Page loads without blank screen
   - No console errors about MIME types
   - InviteAcceptPage renders correctly
   - Form submission works

## Additional Notes

- The `_redirects` file in `public/` is automatically copied to `dist/` during build
- Both netlify.toml redirects and _redirects file work together for maximum compatibility
- Status 200 is critical - it tells the browser this is a valid response, not a 404
- The router setup now uses `BrowserRouter` which is more straightforward for SPAs

## Files Modified

1. ✅ `apps/web/package.json` - Resolved merge conflicts
2. ✅ `apps/web/src/main.jsx` - Fixed router setup and merge conflicts
3. ✅ `apps/web/netlify.toml` - Added SPA redirects and updated configuration
4. ✅ `netlify.toml` - Updated to match apps/web configuration
5. ✅ `apps/web/vite.config.ts` - Added explicit publicDir configuration

## Troubleshooting

If the issue persists after deployment:

1. **Clear Netlify cache**: Deploy > Trigger deploy > Clear cache and deploy site
2. **Check Netlify logs**: Look for build errors or warnings
3. **Verify redirects**: In Netlify dashboard, check the _redirects file was copied
4. **Test direct navigation**: Go directly to `/invite/test` to see if redirects work
5. **Check console**: Open browser console for any new errors

## Prevention

To prevent this issue in the future:

1. **Resolve merge conflicts promptly** before deploying
2. **Test invite links** in staging before production
3. **Keep netlify.toml** in sync with deployment requirements
4. **Monitor Netlify build logs** for warnings
