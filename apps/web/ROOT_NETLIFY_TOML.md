# Root-Level netlify.toml for SiteWeaveWeb Repository

If your SiteWeaveWeb GitHub repository has this structure:
```
SiteWeaveWeb/
├── apps/
│   └── web/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
├── other folders...
└── netlify.toml  ← Put this at the ROOT
```

Then create this `netlify.toml` at the **ROOT** of SiteWeaveWeb repository:

```toml
[build]
  base = "apps/web"
  command = "npm install && npm run build"
  publish = "apps/web/dist"

[build.environment]
  NODE_VERSION = "20"

# SPA routing - This is critical for client-side routing
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

## Key Points:
- `base = "apps/web"` tells Netlify to cd into apps/web before running commands
- `command = "npm install && npm run build"` runs IN the apps/web directory (no need for cd apps/web)
- `publish = "apps/web/dist"` publishes from apps/web/dist (relative to repository root)

## Option 2: Netlify Dashboard Configuration

Alternatively, configure directly in Netlify:
1. Go to Site Settings > Build & Deploy > Build Settings
2. Set:
   - **Base directory:** `apps/web`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist` (relative to base)
3. Delete or rename netlify.toml files to avoid conflicts
