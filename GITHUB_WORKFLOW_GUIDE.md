# GitHub Workflow Guide - SiteWeave Projects

Quick reference for committing and pushing to the correct GitHub repository.

---

## 🎯 Two Separate Repositories

### 1. **SiteWeave** (Main Monorepo)
- **GitHub URL:** `https://github.com/SiteWeave/SiteWeave`
- **Local Path:** `c:\Users\Abadi\siteweaveapp\`
- **Contains:**
  - Desktop Electron app (`src/`)
  - Mobile app (`apps/mobile/`)
  - Web app (`apps/web/`)
  - Shared package (`packages/core-logic/`)

### 2. **SiteWeaveWeb** (Standalone Web App)
- **GitHub URL:** `https://github.com/SiteWeave/SiteWeaveWeb`
- **Local Path:** `c:\Users\Abadi\siteweave-web\` *(to be created)*
- **Contains:**
  - Web app only (standalone version)
  - Embedded copy of `packages/core-logic/`

---

## 📝 Commit & Push Commands

### For Desktop App Changes

**When to use:** Modifying Electron desktop app files in `src/`, `electron/`, or root configs.

```powershell
# Navigate to monorepo root
cd c:\Users\Abadi\siteweaveapp

# Add, commit, and push
git add .
git commit -m "Your commit message"
git push origin main
```

**Target Repository:** → `SiteWeave`

---

### For Web App Changes

**Option A: Via Monorepo** (Current Setup)

When working in `apps/web/`:

```powershell
# Navigate to monorepo root
cd c:\Users\Abadi\siteweaveapp

# Add, commit, and push
git add apps/web/
git commit -m "Web app: Your commit message"
git push origin main
```

**Target Repository:** → `SiteWeave`

**Option B: Standalone** (After Setup)

When working in standalone web repo:

```powershell
# Navigate to standalone web app
cd c:\Users\Abadi\siteweave-web

# Add, commit, and push
git add .
git commit -m "Your commit message"
git push origin main
```

**Target Repository:** → `SiteWeaveWeb`

---

### For Mobile App Changes

**When to use:** Modifying React Native/Expo files in `apps/mobile/`.

```powershell
# Navigate to monorepo root
cd c:\Users\Abadi\siteweaveapp

# Add, commit, and push
git add apps/mobile/
git commit -m "Mobile: Your commit message"
git push origin main
```

**Target Repository:** → `SiteWeave`

---

### For Shared Logic Changes

**When to use:** Modifying `packages/core-logic/`.

**Important:** These changes affect ALL apps!

```powershell
# Navigate to monorepo root
cd c:\Users\Abadi\siteweaveapp

# Add, commit, and push to monorepo
git add packages/core-logic/
git commit -m "Core logic: Your commit message"
git push origin main

# If standalone web repo exists, also update it:
cd c:\Users\Abadi\siteweave-web
# Manually sync or copy updated core-logic files
git add packages/core-logic/
git commit -m "Sync core logic from monorepo"
git push origin main
```

**Target Repository:** → Both `SiteWeave` and `SiteWeaveWeb`

---

## 🔍 Quick Decision Tree

```
Are you modifying files in...

├─ src/ (root) or electron/?
│  └─ → Desktop App → Push to SiteWeave
│
├─ apps/mobile/?
│  └─ → Mobile App → Push to SiteWeave
│
├─ apps/web/?
│  └─ → Web App → Push to SiteWeave (monorepo)
│                 OR SiteWeaveWeb (standalone)
│
└─ packages/core-logic/?
   └─ → Shared Logic → Push to BOTH repositories
```

---

## 🚀 Deployment Triggers

### Desktop App (SiteWeave)
- **Trigger:** Push tag `v*` (e.g., `v1.0.37`)
- **Action:** Builds Windows `.exe` via GitHub Actions
- **Workflow:** `.github/workflows/release.yml`

```powershell
git tag v1.0.37
git push origin v1.0.37
```

### Web App (SiteWeaveWeb)
- **Trigger:** Push to `main` branch
- **Action:** Auto-deploys to Netlify
- **Config:** `netlify.toml`

```powershell
git push origin main
# Netlify deploys automatically
```

### Mobile App (SiteWeave)
- **Trigger:** Manual EAS build command
- **Action:** Builds APK/IPA via Expo

```powershell
cd apps/mobile
eas build --platform android
```

---

## ⚠️ Important Notes

1. **Desktop & Mobile ALWAYS go to SiteWeave monorepo**
2. **Web app can go to either:**
   - SiteWeave (as part of monorepo)
   - SiteWeaveWeb (standalone) - use this for Netlify deployments
3. **Shared logic changes need to be synced to both repos**
4. **Never commit to wrong repo** - check your `pwd` (current directory) first!

---

## 📂 Directory Structure Reference

### SiteWeave Monorepo Structure
```
c:\Users\Abadi\siteweaveapp\
├── src/                    # Desktop Electron app
├── electron/               # Electron configs
├── apps/
│   ├── mobile/            # Mobile React Native app
│   └── web/               # Web app (monorepo version)
├── packages/
│   └── core-logic/        # Shared business logic
├── package.json           # Root package.json
└── electron-builder.yml   # Desktop build config
```

### SiteWeaveWeb Standalone Structure
```
c:\Users\Abadi\siteweave-web\
├── src/                    # Web app source
├── public/                 # Static assets
├── packages/
│   └── core-logic/        # Embedded copy of shared logic
├── package.json           # Web-only dependencies
├── netlify.toml           # Netlify deployment config
└── vite.config.ts         # Vite build config
```

---

## 🛠️ Common Scenarios

### Scenario 1: "I fixed a bug in the desktop app"
```powershell
cd c:\Users\Abadi\siteweaveapp
git add src/
git commit -m "Fix: Desktop app login issue"
git push origin main
```

### Scenario 2: "I updated the web app UI"
```powershell
cd c:\Users\Abadi\siteweave-web
git add .
git commit -m "Update: Improved dashboard layout"
git push origin main
# Automatically deploys to Netlify
```

### Scenario 3: "I added a new feature to core-logic"
```powershell
# Step 1: Push to monorepo
cd c:\Users\Abadi\siteweaveapp
git add packages/core-logic/
git commit -m "Feature: Add new calendar utility"
git push origin main

# Step 2: Sync to standalone web
# (Copy updated core-logic files to siteweave-web/packages/core-logic/)
cd c:\Users\Abadi\siteweave-web
git add packages/core-logic/
git commit -m "Sync: Update core-logic from monorepo"
git push origin main
```

### Scenario 4: "I want to release a new desktop version"
```powershell
cd c:\Users\Abadi\siteweaveapp
# Update version in package.json first
git add package.json
git commit -m "Bump version to 1.0.37"
git push origin main

# Create and push tag
git tag v1.0.37
git push origin v1.0.37
# GitHub Actions will build the .exe automatically
```

---

## 🤖 AI Assistant Instructions

When helping with commits/pushes, AI should:

1. **Ask:** "Which app are you working on?" (Desktop, Web, or Mobile)
2. **Verify:** Current working directory matches the target repo
3. **Execute:** Appropriate git commands for that repository
4. **Auto-detect:** Based on file paths mentioned:
   - `src/` or `electron/` → SiteWeave (desktop)
   - `apps/mobile/` → SiteWeave (mobile)
   - `apps/web/` → SiteWeave OR SiteWeaveWeb (ask user)
   - `packages/core-logic/` → Both repos (warn user)

---

## ✅ Quick Checklist Before Committing

- [ ] Am I in the correct directory?
- [ ] Do I know which repository this should go to?
- [ ] Have I tested the changes locally?
- [ ] Is my commit message descriptive?
- [ ] If changing core-logic, have I synced both repos?

---

*Last Updated: 2026-01-12*
