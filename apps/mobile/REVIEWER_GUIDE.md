# Apple App Review - Quick Reviewer Guide

This guide shows exactly where to find each fixed feature in the SiteWeave Mobile app.

---

## 🔐 Demo Account Login

### Location: Login Screen (First Screen)

**Steps:**
1. Launch app
2. Look for blue box labeled "Demo Account Available" 
3. Tap to expand
4. See credentials:
   - Email: `demo@siteweave.app`
   - Password: `DemoSiteWeave2024!`
5. Tap "Use Demo Account" button
6. App logs in automatically

**Visual Guide:**
```
┌─────────────────────────────┐
│     Sign in to SiteWeave    │
│                             │
│  ┌───────────────────────┐ │
│  │ ℹ️ Demo Account       │ │  ← Tap here to expand
│  │    Available      ▼   │ │
│  │                       │ │
│  │ For Apple App Review: │ │
│  │ Email: demo@...       │ │
│  │ Password: Demo...     │ │
│  │                       │ │
│  │ [Use Demo Account]    │ │  ← Tap to auto-login
│  └───────────────────────┘ │
│                             │
│  Email: ________________   │
│  Password: _____________   │
│                             │
│  [  Sign In  ]             │
│                             │
│  Or continue with           │
│  [🍎] [G] [M]              │
└─────────────────────────────┘
```

**Expected Result:** 
- Successful login
- Redirects to Home screen
- Shows sample projects, tasks, events

---

## 🍎 Sign in with Apple

### Location: Login Screen

**Steps:**
1. Launch app
2. Scroll down to "Or continue with" section
3. Tap Apple button (black with 🍎 icon)
4. Apple Sign In sheet appears
5. Complete authentication
6. App redirects to Home screen

**Visual Guide:**
```
┌─────────────────────────────┐
│  Email: ________________   │
│  Password: _____________   │
│                             │
│  [  Sign In  ]             │
│                             │
│  ─── Or continue with ───  │
│                             │
│  ┌────┐ ┌────┐ ┌────┐     │
│  │ 🍎 │ │ G  │ │ M  │     │  ← Tap Apple button
│  └────┘ └────┘ └────┘     │
│  Apple  Google Microsoft   │
└─────────────────────────────┘
```

**Important Notes:**
- ⚠️ Must test on **physical iOS device** (not simulator)
- ✅ Tested on iPad Air 11-inch (M3) with iPadOS 18.6.2
- ✅ Implements secure nonce generation
- ✅ Enhanced error handling

**Expected Result:**
- Apple Sign In sheet appears
- Authentication completes successfully
- Redirects to Home screen
- User name appears in profile

---

## 🗑️ Delete Account

### Location: Profile Drawer (from Home Screen)

**Steps to Access:**
1. Login to app (use demo account or create test account)
2. On Home screen, look at **top-right corner**
3. Tap the circular **profile icon** (shows first letter of name)
4. Profile drawer slides up from bottom
5. See "Delete Account" option (red text with 🗑️ icon)
6. Tap "Delete Account"
7. Confirmation dialog appears
8. Confirm or cancel

**Visual Guide - Home Screen:**
```
┌─────────────────────────────┐
│  Hello, Demo User   🔔 [👤] │  ← Tap profile icon here
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                             │
│  [KPI Metrics Carousel]     │
│                             │
│  MY DAY                     │
│  • Task 1                   │
│  • Task 2                   │
│                             │
│  PROJECTS (3)               │
│  • Website Redesign         │
│  • Mobile App Development   │
│  • Marketing Campaign Q1    │
│                             │
└─────────────────────────────┘
```

**Visual Guide - Profile Drawer:**
```
After tapping profile icon, drawer slides up:

┌─────────────────────────────┐
│                             │
│  ╭───────────────────────╮ │
│  │  [👤]  Demo User     ✕ │ │
│  │        demo@...         │ │
│  ├───────────────────────┤ │
│  │                         │ │
│  │  👤 Edit Profile    →  │ │
│  │  ─────────────────────  │ │
│  │  🗑️ Delete Account  →  │ │  ← Account deletion here!
│  │  ─────────────────────  │ │
│  │  ↪️  Log Out            │ │
│  │                         │ │
│  ╰───────────────────────╯ │
└─────────────────────────────┘
```

**Confirmation Dialog:**
```
┌─────────────────────────────┐
│     Delete Account?         │
│                             │
│  Are you sure you want to   │
│  permanently delete your    │
│  account? This action       │
│  cannot be undone and will  │
│  delete all your data       │
│  including projects, tasks, │
│  events, and messages.      │
│                             │
│  [  Cancel  ] [  Delete  ]  │
└─────────────────────────────┘
```

**Important Notes:**
- ⚠️ **Recommendation**: Test with a new test account, NOT the demo account
- ⚠️ Action is **permanent** and cannot be undone
- ✅ Deletes ALL user data (projects, tasks, events, messages, contacts)
- ✅ Signs user out after deletion
- ✅ Two-step confirmation prevents accidents

**Expected Result:**
- Confirmation dialog appears
- If confirmed: All data deleted, user signed out, returns to login
- If canceled: No changes, drawer remains open

---

## 📱 All App Features (Using Demo Account)

### 1. Home Screen / Dashboard
**What to Test:**
- KPI metrics display (3 cards showing stats)
- "My Day" section with today's tasks and events
- Projects list with progress bars
- Profile icon (top-right) opens profile drawer

### 2. Projects Tab
**What to Test:**
- 3 sample projects visible
- Tap project to see details
- View project tasks and contacts
- See project progress

**Sample Projects:**
1. Website Redesign - Web development project
2. Mobile App Development - App creation
3. Marketing Campaign Q1 - Marketing project

### 3. Calendar Tab
**What to Test:**
- Monthly calendar view
- 5 sample events visible
- Tap event to see details
- Different event types (meetings, deadlines, milestones)

**Sample Events:**
- Design Review Meeting (tomorrow)
- Sprint Planning
- App Beta Testing
- Campaign Kickoff
- Website Launch

### 4. Tasks/Issues Tab
**What to Test:**
- 11 sample tasks visible
- Filter by status (completed, in progress, pending)
- Filter by priority (high, medium, low)
- Tap task to see details
- Mark tasks complete

### 5. Messages Tab
**What to Test:**
- Message channels list
- Sample conversations
- Send/receive messages
- Message history

### 6. Profile Management
**What to Test:**
- Edit profile (name, password)
- View account info
- **Delete account** (recommend viewing UI only)
- Sign out

---

## 📋 Testing Recommendations

### For Sign in with Apple:
✅ **DO**: Test on physical iPad/iPhone
✅ **DO**: Use iPad Air 11-inch (M3) or similar
❌ **DON'T**: Test on simulator (won't work)

### For Account Deletion:
✅ **DO**: Create new test account to test deletion
✅ **DO**: Verify confirmation dialog appears
❌ **DON'T**: Delete the demo account (needed for other testing)

### For Demo Account:
✅ **DO**: Use demo account for general feature testing
✅ **DO**: Verify all sample data is visible
✅ **DO**: Test all tabs and features

---

## 🎯 Quick Verification Checklist

Reviewers can quickly verify all fixes:

### Issue 1: Sign in with Apple ✅
- [ ] Apple button visible on login screen
- [ ] Opens Apple Sign In on physical device
- [ ] Completes authentication successfully
- [ ] No error messages

### Issue 2: Account Deletion ✅
- [ ] Profile icon in top-right of home screen
- [ ] "Delete Account" visible in profile drawer
- [ ] Red text with trash icon
- [ ] Confirmation dialog appears when tapped
- [ ] Clear warning about permanent deletion

### Issue 3: Demo Account ✅
- [ ] Blue "Demo Account Available" box on login
- [ ] Tappable to expand
- [ ] Credentials clearly displayed
- [ ] "Use Demo Account" button present
- [ ] One-tap login works
- [ ] Sample data visible after login

---

## ⏱️ Estimated Review Time

- **Demo Account Login**: 30 seconds
- **Browse Sample Data**: 2-3 minutes
- **Find Account Deletion UI**: 30 seconds
- **Test Sign in with Apple**: 1-2 minutes (physical device)
- **Total**: ~5 minutes for complete verification

---

## 📞 Support

If any issues encountered during review:

**Demo Account Not Working?**
- Credentials: demo@siteweave.app / DemoSiteWeave2024!
- If login fails, contact developer immediately

**Can't Find a Feature?**
- Demo account: Top of login screen (blue box)
- Account deletion: Profile icon (top-right) → Delete Account
- Sign in with Apple: Login screen, under "Or continue with"

**Technical Issues?**
- Check device: Physical iPad/iPhone required for Apple Sign In
- Check iOS version: 16.0 or later recommended
- Check network: All features require internet connection

---

## ✅ Success Criteria

All issues addressed when:
1. ✅ Demo account visible and functional on login
2. ✅ Sign in with Apple works without errors
3. ✅ Account deletion option accessible in profile
4. ✅ All features functional with demo account
5. ✅ App performs as expected on test device

---

**App Name**: SiteWeave
**Version**: 1.0.0 (or 1.0.1)
**Platform**: iOS / iPadOS
**Minimum iOS**: 16.0
**Tested On**: iPad Air 11-inch (M3), iPadOS 18.6.2

**Thank you for your review! 🙏**


