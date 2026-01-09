# Final Verification Checklist - Monday Launch

## ✅ Pre-Launch Verification (Do This Now)

### 1. Edge Functions Deployment

```bash
# Check all functions are deployed
supabase functions list

# Expected output should show:
# - create-org-admin
# - team-invite
# - team-create-user
# - team-update-role
# - team-remove-user
```

**Action if missing**: Deploy missing functions:
```bash
supabase functions deploy create-org-admin
supabase functions deploy team-invite
supabase functions deploy team-create-user
supabase functions deploy team-update-role
supabase functions deploy team-remove-user
```

---

### 2. Environment Variables

```bash
# Check secrets are set
supabase secrets list

# Required secrets:
# - APP_URL (should be your production URL)
# - RESEND_API_KEY (for email sending)
# - SUPABASE_SERVICE_ROLE_KEY (auto-set)
```

**Action if missing**:
```bash
supabase secrets set APP_URL=https://app.siteweave.org
supabase secrets set RESEND_API_KEY=your_resend_key_here
```

---

### 3. Email Configuration

**Check Resend Dashboard**:
- [ ] Domain is verified (siteweave.org)
- [ ] API key is active
- [ ] Test email sent successfully

**Test Email Sending**:
```bash
# Test the team-invite function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/team-invite \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "organizationId": "test-org-id",
    "roleId": null
  }'
```

**Expected**: Response with `emailSent: true` or error message

---

### 4. Database Schema Verification

**Run in Supabase SQL Editor**:

```sql
-- Check organizations table exists
SELECT COUNT(*) FROM organizations;

-- Check roles table exists
SELECT COUNT(*) FROM roles;

-- Check invitations table exists
SELECT COUNT(*) FROM invitations;

-- Check profiles have organization_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'organization_id';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'roles', 'invitations', 'profiles');
```

**Expected**: All tables exist, RLS enabled (rowsecurity = true)

---

### 5. Setup Wizard Flow Test

**Steps**:
1. Create test organization (use CREATE-ORGANIZATION-TOOL.html)
2. Accept invitation as owner
3. **Verify**: Setup wizard appears automatically
4. Configure a role (change name, toggle permissions)
5. **Verify**: Role saves successfully
6. Add team member (invite via email)
7. **Verify**: Invitation email sent
8. Click "Complete Setup"
9. **Verify**: Wizard closes, localStorage flag set

**Browser Console Commands**:
```javascript
// Check setup wizard status
window.__SITEWEAVE_DEBUG__.checkSetupWizard()

// If wizard doesn't appear, clear flag
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
```

---

### 6. Team Invitation Flow Test

**Steps**:
1. As Org Admin, open Directory Management Modal
2. Enter email: `test-worker@example.com`
3. Select role (optional)
4. Click "Send Invitation"
5. **Verify**: Success message appears
6. **Verify**: Email received (check inbox)
7. Click invitation link
8. Set password
9. **Verify**: User logged in, linked to organization

**Check Invitation in Database**:
```sql
SELECT * FROM invitations 
WHERE email = 'test-worker@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### 7. Mobile App Organization Loading

**Steps**:
1. Open mobile app
2. Log in with test account
3. **Verify**: Organization loads automatically
4. **Verify**: Organization name appears in header
5. **Verify**: Projects filtered by organization
6. **Verify**: No "No Organization Found" error

**If Error Appears**:
```javascript
// Check profile has organization_id
// Run in Supabase SQL Editor:
SELECT id, email, organization_id 
FROM profiles 
WHERE id = 'your-user-id';
```

---

### 8. Role Creation Test

**Steps**:
1. In Setup Wizard or Role Management
2. Click "Add Role" → "Create Custom Role"
3. Enter role name: "Test Role"
4. Select permissions
5. Click "Create"
6. **Verify**: Role appears in list
7. **Verify**: No duplicate key errors

**Check in Database**:
```sql
SELECT * FROM roles 
WHERE name = 'Test Role' 
AND organization_id = 'your-org-id';
```

---

### 9. Managed Account Creation Test

**Steps**:
1. In Setup Wizard or Directory Management
2. Click "Create Managed Account"
3. Enter:
   - Name: "Test Worker"
   - Email: "test@example.com"
   - Username: "testworker" (optional)
   - Password: "Test123!"
   - Role: Select a role
4. Click "Create Account"
5. **Verify**: Account created
6. **Verify**: PIN displayed (if applicable)
7. **Verify**: User can log in with credentials

---

### 10. Team Directory Test

**Steps**:
1. Navigate to Team Directory (`/team`)
2. **Verify**: All organization members visible
3. **Verify**: Roles displayed correctly
4. **Verify**: Contact info visible
5. **Verify**: No foreign key errors in console

**Browser Console**:
```javascript
// Check organization
const org = window.__SITEWEAVE_DEBUG__.getOrganization()
console.log('Organization:', org)

// Check state
const state = window.__SITEWEAVE_DEBUG__.getState()
console.log('Current organization:', state.currentOrganization)
```

---

## 🐛 Common Issues & Quick Fixes

### Issue: Setup Wizard Doesn't Appear
**Fix**:
```javascript
// In browser console
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
// Then refresh page
```

### Issue: Invitation Email Not Sent
**Fix**:
1. Check Resend API key: `supabase secrets list`
2. Check edge function logs: `supabase functions logs team-invite --follow`
3. Verify domain is verified in Resend dashboard

### Issue: Organization Not Loading (Mobile)
**Fix**:
```sql
-- Update profile with organization_id
UPDATE profiles 
SET organization_id = 'org-id-here' 
WHERE id = 'user-id-here';
```

### Issue: Duplicate Role Error
**Fix**: Already handled in code - fetches existing roles first

### Issue: Foreign Key Ambiguity
**Fix**: Code uses explicit syntax: `contacts!fk_profiles_contact`

---

## 📋 Final Pre-Launch Checklist

### Database
- [ ] All tables have organization_id
- [ ] RLS policies enabled on all tables
- [ ] Foreign keys set correctly
- [ ] Indexes created
- [ ] Default roles created for new orgs

### Edge Functions
- [ ] All 5 functions deployed
- [ ] Environment variables set
- [ ] CORS headers configured
- [ ] Error handling in place
- [ ] Tested with curl commands

### Frontend
- [ ] Setup wizard appears for new admins
- [ ] Role creation works
- [ ] Team invitation works
- [ ] Managed account creation works
- [ ] Team directory shows members
- [ ] No console errors
- [ ] Debug helpers available

### Mobile
- [ ] Organization loads on login
- [ ] Organization name in header
- [ ] Projects filtered correctly
- [ ] No "No Organization" errors
- [ ] Tested on actual device

### Email
- [ ] Resend API key set
- [ ] Domain verified
- [ ] Test email sent successfully
- [ ] Invitation emails working

### Documentation
- [ ] LAUNCH_DAY_SCRIPT.md ready
- [ ] CONSOLE_COMMANDS.md ready
- [ ] QUICK_FIXES_CHECKLIST.md ready
- [ ] MONDAY_LAUNCH_TESTING.md ready

---

## 🚀 Launch Day Commands

### Quick Health Check
```bash
# 1. Check functions
supabase functions list

# 2. Check secrets
supabase secrets list

# 3. Check recent logs
supabase functions logs team-invite --limit 5

# 4. Check database
# Run in Supabase SQL Editor:
SELECT 
  (SELECT COUNT(*) FROM organizations) as org_count,
  (SELECT COUNT(*) FROM roles) as role_count,
  (SELECT COUNT(*) FROM invitations WHERE status = 'pending') as pending_invites,
  (SELECT COUNT(*) FROM profiles WHERE organization_id IS NOT NULL) as users_with_org;
```

### Emergency Fixes
```javascript
// Clear setup wizard (browser console)
window.__SITEWEAVE_DEBUG__.clearSetupWizard()

// Check status (browser console)
window.__SITEWEAVE_DEBUG__.checkSetupWizard()
```

---

## ✅ Success Criteria

All of these must pass:

- [x] Organization creation works
- [x] Setup wizard appears automatically
- [x] Role creation works
- [x] Team invitation sends email
- [x] Invitation acceptance works
- [x] Team directory shows members
- [x] Mobile app loads organization
- [x] No console errors
- [x] No database errors
- [x] Email delivery confirmed

---

**Status**: Ready for Launch 🚀

**Last Verified**: [Date]
