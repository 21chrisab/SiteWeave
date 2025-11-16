# Fix for "Unexpected token '<'" Error on Netlify

## Problem
The error "Uncaught SyntaxError: Unexpected token '<'" occurs when JavaScript files are being served as HTML (usually a 404 page). This happens when:

1. Asset paths are incorrect
2. The `_redirects` file has invalid syntax
3. Vite base path is not configured correctly

## Solutions Applied

### 1. Fixed Vite Base Path
Added `base: '/'` to `vite.config.ts` to ensure assets are loaded from the root path.

### 2. Fixed _redirects File
Removed invalid comment syntax from `public/_redirects`. Netlify redirects don't support comments.

### 3. Verify Netlify Configuration

Make sure in Netlify dashboard:
- **Base directory:** `apps/web`
- **Publish directory:** `dist` (relative to base directory)
- **Build command:** `npm install && npm run build`

## After Making These Changes

1. **Commit and push** the changes to trigger a new deployment
2. **Clear Netlify cache** (optional):
   - Go to Site settings → Build & deploy → Build settings
   - Click "Clear cache and deploy site"
3. **Check the build logs** to ensure the build succeeds
4. **Verify the deployment**:
   - Open browser DevTools (F12)
   - Check the Network tab
   - Verify that `.js` files are being served with `Content-Type: application/javascript`
   - Check that assets are loading from `/assets/` path

## If Issue Persists

1. Check browser console for specific file that's failing
2. Check Netlify build logs for any errors
3. Verify that `dist/_redirects` exists after build (should be copied from `public/_redirects`)
4. Check that environment variables are set in Netlify dashboard

