# Development Mode Guide

## Running in Dev Mode (No Build Required!)

### Quick Start

```powershell
npm run dev:electron
```

This will:
1. Start Vite dev server (hot reload enabled)
2. Launch Electron app
3. Connect Electron to the dev server
4. **Changes to your code will auto-reload!** ✨

### How It Works

- **Vite Dev Server**: Runs on `http://localhost:5173`
- **Electron**: Loads the app from the dev server (not from built files)
- **Hot Module Replacement (HMR)**: Changes to React components update instantly
- **No Build Step**: You edit code → See changes immediately

### Development Workflow

1. **Start Dev Mode**:
   ```powershell
   npm run dev:electron
   ```

2. **Make Changes**:
   - Edit any file in `src/`
   - Save the file
   - **Electron window automatically reloads!** 🔄

3. **See Changes Instantly**:
   - React components: Hot reload (no page refresh)
   - Other files: Auto-reload
   - DevTools: Already open for debugging

4. **Stop Dev Mode**:
   - Close the Electron window
   - Or press `Ctrl+C` in terminal

### Dev Mode vs Production Build

| Feature | Dev Mode (`npm run dev:electron`) | Production (`npm run build:win`) |
|---------|----------------------------------|----------------------------------|
| **Speed** | ⚡ Instant | 🐌 Slower (full build) |
| **Hot Reload** | ✅ Yes | ❌ No |
| **DevTools** | ✅ Auto-opens | ❌ Closed |
| **File Size** | Small | Large (packaged) |
| **Testing** | ✅ Perfect for development | ✅ For distribution |

### Troubleshooting Dev Mode

#### Issue: "Cannot find module 'electron-updater'"
**Solution**: This is normal in dev mode! The app will work fine, just without auto-update features.

#### Issue: Port 5173 already in use
**Solution**: 
```powershell
# Kill the process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port (edit vite.config.mjs)
```

#### Issue: Changes not reloading
**Solution**:
1. Check that Vite dev server is running
2. Check browser console for errors
3. Try manual reload: `Ctrl+R` in Electron window

### Tips for Fast Development

1. **Keep Dev Mode Running**: Don't close it between changes
2. **Use DevTools**: `F12` or `Ctrl+Shift+I` for debugging
3. **Watch Console**: Both terminal and DevTools console show errors
4. **Test Production Build**: Occasionally run `npm run build:win` to test the actual build

### File Watching

Dev mode watches these directories:
- `src/` - All React components and utilities
- `electron/` - Electron main process and preload
- `public/` - Static assets

Changes to these files trigger automatic reloads!

---

## Production Build

When you're ready to test the actual installer:

```powershell
npm run build:win
```

This creates:
- `release/SiteWeave Setup 1.0.35.exe` - Installer
- `release/win-unpacked/` - Unpacked app (for testing)

**Note**: Production builds take longer but create the actual distributable files.

---

## Quick Reference

```powershell
# Dev mode (fast, hot reload)
npm run dev:electron

# Production build (slow, creates installer)
npm run build:win

# Web dev mode (browser only, no Electron)
npm run dev
```

---

**Pro Tip**: Use dev mode for 99% of your development. Only build when you need to test the actual installer or prepare for release!
