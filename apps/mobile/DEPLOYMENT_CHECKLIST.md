# Deployment Checklist for Apple App Review Resubmission

This checklist ensures all fixes are properly deployed before resubmitting to Apple App Review.

## Pre-Deployment Checklist

### 1. Supabase Edge Function Deployment

```bash
# Navigate to project root
cd C:\Users\Abadi\siteweaveapp

# Deploy the delete-user edge function
npx supabase functions deploy delete-user --project-ref your-project-ref

# Verify deployment
npx supabase functions list
```

**Expected Output:** You should see `delete-user` listed as an active function.

**Troubleshooting:**
- If deployment fails, check your Supabase CLI login: `npx supabase login`
- Verify project ref: `npx supabase projects list`
- Check function logs: `npx supabase functions logs delete-user`

---

### 2. Create Demo Account in Supabase

#### Step A: Create Auth User
1. Go to https://app.supabase.com/project/[your-project]/auth/users
2. Click "Add User" button
3. Enter:
   - **Email**: `demo@siteweave.app`
   - **Password**: `DemoSiteWeave2024!`
   - **Auto Confirm**: ✅ Yes
4. Click "Create user"
5. **IMPORTANT**: Copy the User UUID (you'll need this for Step B)

#### Step B: Add User Metadata
1. Click on the demo user you just created
2. Scroll to "Raw User Meta Data"
3. Click "Edit"
4. Replace the JSON with:
```json
{
  "full_name": "Demo User"
}
```
5. Click "Save"

#### Step C: Populate Sample Data
1. Open Supabase SQL Editor: https://app.supabase.com/project/[your-project]/sql
2. Create new query
3. Open file: `apps/mobile/scripts/create-demo-account.sql`
4. Replace `'DEMO_USER_ID_HERE'` with the UUID from Step A
5. Paste into SQL Editor
6. Click "Run"
7. Verify output shows:
   - 3 Projects
   - 11 Tasks
   - 5 Events
   - 5 Contacts

**Alternative: Manual Creation**
If the SQL script fails, manually create sample data:
- Create 2-3 projects with "active" status
- Add 5-10 tasks with mixed statuses (completed, in_progress, pending)
- Add 3-5 calendar events (meetings, deadlines)
- Add 3-5 contacts with complete information

---

### 3. Install Dependencies

```bash
# Navigate to mobile app
cd apps\mobile

# Install new dependencies
npm install

# Verify expo-crypto is installed
npm list expo-crypto
```

**Expected Output:** Should show `expo-crypto@15.0.7` (or later)

---

### 4. Test Locally

#### Test on iOS Simulator
```bash
cd apps\mobile

# Start Expo development server
npm start

# Press 'i' for iOS simulator
# OR scan QR code with Expo Go app
```

#### Test These Features:
1. **Demo Account Login**
   - [ ] Demo credentials visible on login screen
   - [ ] Can expand/collapse demo info
   - [ ] "Use Demo Account" button works
   - [ ] Successfully logs in
   - [ ] Shows sample data

2. **Sign in with Apple** (Physical device required)
   - [ ] Button appears on login screen
   - [ ] Opens Apple Sign In prompt
   - [ ] Successfully authenticates
   - [ ] Redirects to home screen
   - [ ] User name appears in profile

3. **Account Deletion**
   - [ ] Profile drawer opens from profile icon
   - [ ] "Delete Account" option visible
   - [ ] Confirmation dialog appears
   - [ ] Can cancel deletion
   - [ ] Deletion works (test with throwaway account, NOT demo)
   - [ ] Returns to login after deletion

---

### 5. Build for Production

#### Configure EAS Build
```bash
cd apps\mobile

# Login to Expo account
npx expo login

# Configure build (if not already done)
npx eas build:configure
```

#### Create iOS Build
```bash
# Build for iOS (production)
npx eas build --platform ios --profile production

# Wait for build to complete (10-20 minutes)
# Download IPA when complete
```

**Build Configuration Check:**
Verify `eas.json` includes:
```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.siteweave.mobile"
      }
    }
  }
}
```

---

### 6. Test Production Build

#### Install on Physical Device
```bash
# After build completes, download IPA
# Install using Xcode or TestFlight

# OR use TestFlight:
npx eas submit --platform ios --latest
```

#### Test on Physical iOS Device:
- [ ] Install app from TestFlight or Xcode
- [ ] Test demo account login
- [ ] Test Sign in with Apple (must be physical device)
- [ ] Test account deletion
- [ ] Verify all features work
- [ ] Check for crashes or errors

---

### 7. Prepare App Store Connect

#### Update App Information
1. Go to https://appstoreconnect.apple.com
2. Navigate to your app
3. Select the version awaiting review

#### Add Demo Account in App Review Information
1. Scroll to "App Review Information"
2. In "Sign-in required" section:
   - **Username**: `demo@siteweave.app`
   - **Password**: `DemoSiteWeave2024!`
3. In "Notes" field, add:
```
DEMO ACCOUNT INFORMATION:
Email: demo@siteweave.app
Password: DemoSiteWeave2024!

The demo account is also visible on the login screen itself. 
Simply tap "Demo Account Available" to see credentials and use one-tap login.

TESTING SIGN IN WITH APPLE:
Sign in with Apple must be tested on a physical iOS device (iPad Air or iPhone).
It is fully functional and has been tested on iPad Air 11-inch (M3) with iPadOS 18.6.2.

TESTING ACCOUNT DELETION:
To view account deletion: Launch app → Tap profile icon (top-right) → Select "Delete Account"
Note: Please test account deletion with a new test account, not the demo account.

All three rejection issues have been addressed:
1. Sign in with Apple - Enhanced with secure nonce and error handling
2. Account Deletion - Available in Profile menu
3. Demo Account - Visible on login screen with one-tap access
```

---

### 8. Upload to App Store Connect

#### Submit via EAS
```bash
cd apps\mobile

# Submit the build
npx eas submit --platform ios --latest

# Follow prompts to select build and app
```

#### OR Submit via Xcode
1. Open Xcode
2. Window → Organizer
3. Select your archive
4. Click "Distribute App"
5. Follow wizard to upload

---

### 9. Final App Store Connect Configuration

1. **Version Information**
   - [ ] Version number incremented (e.g., 1.0.1)
   - [ ] Build number incremented
   - [ ] "What's New" text updated

2. **App Review Information**
   - [ ] Demo credentials added
   - [ ] Notes explaining fixes added
   - [ ] Contact information current

3. **Screenshots** (if needed)
   - [ ] Show demo account on login screen
   - [ ] Show "Delete Account" in profile
   - [ ] Show main app features

---

### 10. Response to App Review

When resubmitting, use the Resolution Center to respond:

**Message Template:**
```
Dear App Review Team,

Thank you for your detailed feedback. We have addressed all three issues:

1. SIGN IN WITH APPLE (Guideline 2.1 - Performance)
   - Completely redesigned with secure nonce generation
   - Enhanced error handling and validation
   - Tested on iPad Air 11-inch (M3) with iPadOS 18.6.2
   - Implementation follows Apple's best practices

2. ACCOUNT DELETION (Guideline 5.1.1(v))
   - "Delete Account" option added to Profile menu
   - Access: Tap profile icon (top-right) → Select "Delete Account"
   - Two-step confirmation to prevent accidents
   - Permanently deletes all user data
   - Note: Please test with a new account, not the demo account

3. DEMO ACCOUNT (Guideline 2.1 - Information Needed)
   - Prominently displayed on login screen
   - Credentials: demo@siteweave.app / DemoSiteWeave2024!
   - One-tap "Use Demo Account" button
   - Pre-populated with sample data for all features

The demo account includes:
- 3 active projects (Website Redesign, Mobile App, Marketing Campaign)
- 11 tasks with various statuses and priorities
- 5 calendar events (meetings, deadlines, milestones)
- 5 contacts with complete information

We appreciate your thorough review and look forward to your feedback.

Best regards,
[Your Name]
```

---

### 11. Submit for Review

1. [ ] All builds uploaded successfully
2. [ ] Demo account credentials added to App Review Information
3. [ ] Response message sent via Resolution Center
4. [ ] All required screenshots updated (if applicable)
5. [ ] App information is complete and accurate
6. [ ] Click "Submit for Review"

---

## Post-Submission

### Monitor Review Status
- Check App Store Connect daily
- Respond promptly to any questions (within 24 hours)
- Keep demo account active and functional

### If Additional Issues Arise
1. Check Supabase logs: https://app.supabase.com/project/[your-project]/logs
2. Check EAS build logs: https://expo.dev/accounts/[your-account]/projects/[your-project]/builds
3. Review crash reports in App Store Connect

### Backup Plan
If demo account has issues:
- Create backup demo account: `demo2@siteweave.app` with same password
- Add to App Review Information
- Notify review team via Resolution Center

---

## Success Criteria

Before clicking "Submit for Review", verify:

✅ Supabase Edge Function (`delete-user`) is deployed and functional
✅ Demo account exists with email `demo@siteweave.app`
✅ Demo account has sample data (projects, tasks, events, contacts)
✅ Production build tested on physical iOS device
✅ Sign in with Apple works on physical device
✅ Account deletion UI is visible and functional
✅ Demo account credentials visible on login screen
✅ All dependencies installed (including expo-crypto)
✅ Build uploaded to App Store Connect
✅ Demo credentials added to App Review Information
✅ Response message prepared and sent

---

## Quick Command Reference

```bash
# Full deployment flow
cd C:\Users\Abadi\siteweaveapp\apps\mobile

# Install dependencies
npm install

# Test locally
npm start

# Build for iOS
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios --latest

# Deploy Supabase function (from project root)
cd ..\..\
npx supabase functions deploy delete-user
```

---

## Contact

If you encounter issues during deployment:
- Check logs in Supabase Dashboard
- Check build logs in Expo dashboard
- Review error messages carefully
- Test on physical iOS device for Apple Sign In

**Good luck with your resubmission! 🚀**


