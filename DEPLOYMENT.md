# SiteWeave Web App Deployment Guide

This guide will help you deploy the SiteWeave web app to GitHub and Netlify.

## Prerequisites

1. A GitHub account
2. A Netlify account (sign up at https://netlify.com)
3. Node.js 18+ installed locally
4. Git installed locally

## Step 1: Prepare the Web App for GitHub

### 1.1 Create Environment Variables File

Create a `.env.example` file in `apps/web/` to document required environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 1.2 Create a .gitignore for apps/web (if needed)

The root `.gitignore` should already cover this, but ensure `apps/web/.env.local` and `apps/web/dist` are ignored.

## Step 2: Push to GitHub

### 2.1 Initialize Git Repository (if not already done)

If this is a new repository:

```bash
cd apps/web
git init
git add .
git commit -m "Initial commit: SiteWeave web app"
```

### 2.2 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `siteweave-web`)
3. **Do NOT** initialize with README, .gitignore, or license (if you're pushing existing code)

### 2.3 Push to GitHub

```bash
# If you're in the root directory, navigate to apps/web first
cd apps/web

# Add the remote (replace YOUR_USERNAME and REPO_NAME with your details)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**OR** if you want to push the entire monorepo:

```bash
# From the root directory
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Netlify

### 3.1 Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select your repository

### 3.2 Configure Build Settings

Netlify should auto-detect the settings from `netlify.toml`, but verify:

- **Base directory:** `apps/web` (if deploying from monorepo) or leave blank (if deploying web repo only)
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`

### 3.3 Set Environment Variables

1. In Netlify, go to **Site settings** → **Environment variables**
2. Add the following variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 3.4 Configure Site Name

1. Go to **Site settings** → **Change site name**
2. Set the site name to `siteweave` (this will give you `siteweave.netlify.app`)

**OR** if you have a custom domain:
1. Go to **Domain settings**
2. Add your custom domain
3. Follow Netlify's DNS configuration instructions

### 3.5 Deploy

1. Click **"Deploy site"**
2. Netlify will build and deploy your site
3. Once deployed, your site will be available at `https://siteweave.netlify.app`

## Step 4: Update Supabase OAuth Redirect URLs

After deploying to Netlify, you need to update your Supabase OAuth redirect URLs:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add to **Redirect URLs:**
   - `https://siteweave.netlify.app`
   - `https://siteweave.netlify.app/**` (for deep links)

4. Update **Site URL** to: `https://siteweave.netlify.app`

## Step 5: Verify Deployment

1. Visit `https://siteweave.netlify.app`
2. Test login functionality
3. Verify that invitation links work correctly
4. Check that all routes are accessible

## Continuous Deployment

Netlify will automatically deploy when you push to your main branch. To deploy manually:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**

## Troubleshooting

### Build Fails

- Check that all environment variables are set in Netlify
- Verify Node.js version (should be 18+)
- Check build logs in Netlify dashboard

### OAuth Not Working

- Ensure redirect URLs are updated in Supabase
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

### Routes Not Working

- The `netlify.toml` includes a redirect rule for SPA routing
- If issues persist, check that the redirect is working correctly

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)

