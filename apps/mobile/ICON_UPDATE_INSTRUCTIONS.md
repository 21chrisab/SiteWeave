# Icon Update Instructions

## Your Icon
The SiteWeave logo you provided needs to be saved to the following locations:

### Required Steps:
1. **Save the icon image** (the blue and orange SiteWeave logo) as PNG files

2. **Create/Update these files** in `apps/mobile/assets/`:
   - `icon.png` - 1024x1024px (main app icon)
   - `adaptive-icon.png` - 1024x1024px (for Android, can be the same)
   - `splash-icon.png` - Can be the same logo or a larger version
   - `favicon.png` - 192x192px (for web builds)

### Icon Requirements:
- **1024x1024 pixels**
- **PNG format**
- **No transparency** for iOS app icon (must have opaque background)
- **Square corners** (Apple adds rounded corners automatically)
- **RGB color space** (not CMYK)

### Quick Action:
Right-click on the SiteWeave logo image I saw and:
1. Save it as `icon.png`
2. Resize to 1024x1024px if needed (use tools like:
   - Photoshop
   - GIMP (free)
   - Online: iloveimg.com/resize-image
   - Online: squoosh.app
)
3. Copy to all 4 file locations listed above

### Current Status:
✅ App configuration updated
✅ Sign in with Apple added
⏳ Icon needs to be manually saved (binary files cannot be auto-saved via chat)

After saving the icon, we'll rebuild the app.


























