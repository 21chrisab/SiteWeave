# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Missing Supabase environment variables" Error

**Problem:** The app throws an error about missing environment variables.

**Solution:**
- Ensure `apps/web/.env.local` exists (not in the root directory)
- Verify it contains:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- Restart the dev server after creating/updating `.env.local`

### 2. Dev Server Won't Start

**Problem:** `npm run dev` fails or doesn't start.

**Solutions:**
- Make sure you're in the `apps/web` directory:
  ```bash
  cd apps/web
  npm run dev
  ```
- Check if port 5173 is already in use
- Try deleting `node_modules` and reinstalling:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### 3. Blank Page or White Screen

**Problem:** The app loads but shows a blank page.

**Solutions:**
- Open browser DevTools (F12) and check the Console for errors
- Check the Network tab to see if files are loading
- Verify environment variables are loaded:
  - Open DevTools Console
  - Type: `console.log(import.meta.env.VITE_SUPABASE_URL)`
  - Should show your Supabase URL (not undefined)

### 4. Build Errors

**Problem:** `npm run build` fails.

**Solutions:**
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript/ESLint errors
- Verify all imports are correct
- Check that `.env.local` exists (build uses it too)

### 5. Routing Issues (404 on refresh)

**Problem:** Routes work on navigation but show 404 on refresh.

**Solution:**
- This is normal for SPAs - the `_redirects` file handles this
- For local dev, Vite handles routing automatically
- For production (Netlify), ensure `public/_redirects` is deployed

### 6. OAuth Not Working

**Problem:** Google/Microsoft login doesn't work.

**Solutions:**
- Verify redirect URLs in Supabase dashboard:
  - For local dev: `http://localhost:5173`
  - For production: Your Netlify URL
- Check that OAuth providers are configured in Supabase
- Ensure `VITE_SUPABASE_URL` is correct

## Quick Diagnostic Steps

1. **Check environment variables:**
   ```bash
   cd apps/web
   cat .env.local  # or type .env.local on Windows
   ```

2. **Verify dependencies:**
   ```bash
   cd apps/web
   npm list --depth=0
   ```

3. **Test build:**
   ```bash
   cd apps/web
   npm run build
   ```

4. **Check browser console:**
   - Open DevTools (F12)
   - Look for red error messages
   - Check Network tab for failed requests

5. **Verify Supabase connection:**
   - Open browser console
   - Check for Supabase-related errors
   - Verify the Supabase URL is accessible

## Getting Help

If none of these solutions work:
1. Check the browser console for specific error messages
2. Check the terminal where `npm run dev` is running for errors
3. Verify your Supabase project is active and accessible
4. Ensure your Supabase tables and RLS policies are set up correctly

