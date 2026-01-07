# App Store Submission Quick Checklist

Use this checklist to track your progress toward App Store submission.

## Pre-Submission Setup

- [ ] **Apple Developer Account**
  - [ ] Enrolled in Apple Developer Program ($99/year)
  - [ ] Have Apple ID credentials ready

- [ ] **EAS Setup**
  - [ ] Installed EAS CLI: `npm install -g eas-cli`
  - [ ] Logged in: `eas login`
  - [ ] Project configured: `eas build:configure`

- [ ] **App Configuration**
  - [ ] Updated `app.config.js` with iOS settings
  - [ ] Set `buildNumber` (start with "1")
  - [ ] Set `version` (e.g., "1.0.0")
  - [ ] Added privacy descriptions for camera/photo access
  - [ ] Verified bundle identifier: `com.siteweave.mobile`

## App Store Connect Setup

- [ ] **App Created**
  - [ ] Created app in App Store Connect
  - [ ] Bundle ID matches: `com.siteweave.mobile`
  - [ ] App name: "SiteWeave"

- [ ] **App Information**
  - [ ] Category selected
  - [ ] Privacy Policy URL added
  - [ ] Support URL added
  - [ ] Age rating completed

- [ ] **App Assets**
  - [ ] App icon (1024x1024) ready
  - [ ] Screenshots for 6.7" iPhone (1290x2796)
  - [ ] Screenshots for 6.5" iPhone (1242x2688)
  - [ ] Screenshots for 5.5" iPhone (1242x2208)
  - [ ] App description written
  - [ ] Keywords added (100 chars max)
  - [ ] What's New / Release notes written

## Build & Submit

- [ ] **Credentials**
  - [ ] iOS credentials configured: `eas credentials`
  - [ ] Certificates generated/uploaded

- [ ] **Build**
  - [ ] Production build created: `eas build --platform ios --profile production`
  - [ ] Build completed successfully
  - [ ] Build number incremented for next submission

- [ ] **TestFlight (Recommended)**
  - [ ] Preview build created: `eas build --platform ios --profile preview`
  - [ ] Submitted to TestFlight: `eas submit --platform ios --profile preview`
  - [ ] Internal testers added
  - [ ] App tested thoroughly

- [ ] **Production Submission**
  - [ ] Production build submitted: `eas submit --platform ios --profile production`
  - [ ] Build appears in App Store Connect
  - [ ] Build selected for version
  - [ ] All metadata completed
  - [ ] Export compliance answered
  - [ ] Submitted for review

## Post-Submission

- [ ] **Review Status**
  - [ ] Monitoring App Store Connect for status updates
  - [ ] Ready to respond to any rejection reasons
  - [ ] Plan for app launch marketing

## Common Issues to Watch For

- [ ] Privacy policy URL is accessible and complete
- [ ] Support URL is accessible
- [ ] App doesn't crash on launch
- [ ] All required permissions have usage descriptions
- [ ] App follows App Store Review Guidelines
- [ ] No placeholder content in screenshots
- [ ] App icon meets requirements (no transparency, no rounded corners)

## Quick Commands Reference

```bash
# Install and login
npm install -g eas-cli
eas login

# Configure project
cd apps/mobile
eas build:configure

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Check status
eas build:list
eas submit:list
```

---

**Timeline Estimate:** 1-2 weeks from first build to App Store approval

