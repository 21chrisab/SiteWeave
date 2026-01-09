# Browser Console Commands for Testing

## How to Use

1. Open your SiteWeave app in the browser
2. Press `F12` (or `Cmd + Option + J` on Mac) to open Developer Tools
3. Click the **Console** tab
4. Paste and run these commands

---

## ✅ Working Commands

### Check Current User
```javascript
// Get current user info
window.__SITEWEAVE_DEBUG__.getUser()
```

### Check Organization
```javascript
// Get current organization
window.__SITEWEAVE_DEBUG__.getOrganization()
```

### Check Setup Wizard Status
```javascript
// Check if setup wizard should appear
window.__SITEWEAVE_DEBUG__.checkSetupWizard()
```

### Clear Setup Wizard Flag
```javascript
// Force setup wizard to appear again (for current user)
window.__SITEWEAVE_DEBUG__.clearSetupWizard()

// Or for a specific user ID
window.__SITEWEAVE_DEBUG__.clearSetupWizard('user-id-here')
```

### Get Full State
```javascript
// See all app state (user, organization, projects, etc.)
window.__SITEWEAVE_DEBUG__.getState()
```

### Access Supabase Client
```javascript
// Get Supabase client for direct queries
const supabase = window.__SITEWEAVE_DEBUG__.getSupabase()

// Example: Check your profile
supabase.from('profiles').select('*').eq('id', 'your-user-id').single().then(console.log)
```

---

## Quick Testing Commands

### Test 1: Check if User is Logged In
```javascript
const user = window.__SITEWEAVE_DEBUG__.getUser()
console.log('Logged in:', !!user)
console.log('User ID:', user?.id)
console.log('User Email:', user?.email)
```

### Test 2: Check Organization
```javascript
const org = window.__SITEWEAVE_DEBUG__.getOrganization()
console.log('Has organization:', !!org)
console.log('Organization name:', org?.name)
console.log('Organization ID:', org?.id)
```

### Test 3: Check Setup Wizard
```javascript
const status = window.__SITEWEAVE_DEBUG__.checkSetupWizard()
if (!status.setupComplete && status.userRole?.name === 'Org Admin') {
  console.log('✅ Setup wizard should appear')
} else {
  console.log('❌ Setup wizard will NOT appear')
}
```

### Test 4: Force Setup Wizard to Appear
```javascript
// Clear the flag so wizard appears on next page load
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
console.log('Setup wizard flag cleared. Refresh the page to see it.')
```

### Test 5: Check localStorage
```javascript
// See all localStorage items
console.log('All localStorage:', localStorage)

// Check setup wizard flag
const userId = window.__SITEWEAVE_DEBUG__.getUser()?.id
if (userId) {
  const flag = localStorage.getItem(`setup_complete_${userId}`)
  console.log('Setup wizard flag:', flag)
}
```

---

## Direct Supabase Queries

### Check Your Profile
```javascript
const supabase = window.__SITEWEAVE_DEBUG__.getSupabase()
const user = window.__SITEWEAVE_DEBUG__.getUser()

supabase
  .from('profiles')
  .select('*, organizations(*), roles(*)')
  .eq('id', user.id)
  .single()
  .then(({ data, error }) => {
    if (error) console.error('Error:', error)
    else console.log('Profile:', data)
  })
```

### Check Your Organization
```javascript
const supabase = window.__SITEWEAVE_DEBUG__.getSupabase()
const org = window.__SITEWEAVE_DEBUG__.getOrganization()

if (org) {
  supabase
    .from('organizations')
    .select('*, profiles(count)')
    .eq('id', org.id)
    .single()
    .then(({ data, error }) => {
      if (error) console.error('Error:', error)
      else console.log('Organization:', data)
    })
}
```

### Check Pending Invitations
```javascript
const supabase = window.__SITEWEAVE_DEBUG__.getSupabase()
const org = window.__SITEWEAVE_DEBUG__.getOrganization()

if (org) {
  supabase
    .from('invitations')
    .select('*, organizations(name), roles(name)')
    .eq('organization_id', org.id)
    .eq('status', 'pending')
    .then(({ data, error }) => {
      if (error) console.error('Error:', error)
      else console.log('Pending invitations:', data)
    })
}
```

---

## Troubleshooting Commands

### If Setup Wizard Doesn't Appear
```javascript
// Step 1: Check status
const status = window.__SITEWEAVE_DEBUG__.checkSetupWizard()

// Step 2: If setupComplete is true, clear it
if (status.setupComplete) {
  window.__SITEWEAVE_DEBUG__.clearSetupWizard()
  console.log('Flag cleared. Refresh the page.')
} else {
  console.log('Flag is already clear. Check user role:', status.userRole)
}
```

### If Organization Not Loading
```javascript
const supabase = window.__SITEWEAVE_DEBUG__.getSupabase()
const user = window.__SITEWEAVE_DEBUG__.getUser()

// Check if profile has organization_id
supabase
  .from('profiles')
  .select('organization_id, organizations(*)')
  .eq('id', user.id)
  .single()
  .then(({ data, error }) => {
    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Profile organization:', data.organization_id)
      console.log('Organization data:', data.organizations)
      if (!data.organization_id) {
        console.error('❌ Profile missing organization_id!')
      }
    }
  })
```

### Check for Errors
```javascript
// The console will automatically show errors in red
// But you can also check:
console.log('Check the console above for any red error messages')
```

---

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `window.__SITEWEAVE_DEBUG__.getUser()` | Get current user |
| `window.__SITEWEAVE_DEBUG__.getOrganization()` | Get current organization |
| `window.__SITEWEAVE_DEBUG__.checkSetupWizard()` | Check if wizard should appear |
| `window.__SITEWEAVE_DEBUG__.clearSetupWizard()` | Force wizard to appear |
| `window.__SITEWEAVE_DEBUG__.getState()` | Get all app state |
| `window.__SITEWEAVE_DEBUG__.getSupabase()` | Get Supabase client |

---

## Notes

- These commands only work in **development mode** (when running `npm run dev`)
- They're automatically available when you open the console
- If you see `undefined`, make sure you're logged in and the page has fully loaded
- Refresh the page after clearing setup wizard flag

---

**Tip**: Bookmark this page or keep it open during testing!
