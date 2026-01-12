# Complete Flow Test Script

## Quick Test Commands (Copy-Paste Ready)

### Test 1: Check System Status (Browser Console)

```javascript
// After logging in, run these in browser console:

// 1. Check user
const user = window.__SITEWEAVE_DEBUG__.getUser()
console.log('✅ User:', user?.email)

// 2. Check organization
const org = window.__SITEWEAVE_DEBUG__.getOrganization()
console.log('✅ Organization:', org?.name)

// 3. Check setup wizard
const wizard = window.__SITEWEAVE_DEBUG__.checkSetupWizard()
console.log('✅ Setup Wizard:', wizard)

// 4. Check full state
const state = window.__SITEWEAVE_DEBUG__.getState()
console.log('✅ State:', {
  hasUser: !!state.user,
  hasOrg: !!state.currentOrganization,
  hasRole: !!state.userRole,
  projects: state.projects.length
})
```

---

### Test 2: Verify Edge Functions (Terminal)

```bash
# List all functions
supabase functions list

# Check team-invite function specifically
supabase functions logs team-invite --limit 5

# Test function (replace with your actual values)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/team-invite \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "organizationId": "your-org-id",
    "roleId": null
  }'
```

---

### Test 3: Verify Database (Supabase SQL Editor)

```sql
-- Quick health check
SELECT 
  'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Invitations (pending)', COUNT(*) FROM invitations WHERE status = 'pending'
UNION ALL
SELECT 'Profiles (with org)', COUNT(*) FROM profiles WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Profiles (no org)', COUNT(*) FROM profiles WHERE organization_id IS NULL;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'roles', 'invitations', 'profiles', 'projects', 'tasks')
ORDER BY tablename;
```

---

### Test 4: Verify Email Configuration

```bash
# Check if Resend API key is set
supabase secrets list | grep RESEND

# If not set:
supabase secrets set RESEND_API_KEY=your_key_here

# Check Resend dashboard:
# 1. Go to https://resend.com
# 2. Verify domain is verified
# 3. Check API key is active
# 4. Send test email
```

---

## Step-by-Step Manual Test

### Phase 1: Organization Creation
1. [ ] Open `CREATE-ORGANIZATION-TOOL.html` or `/admin/super`
2. [ ] Create test organization
3. [ ] **Verify**: Success message, setup link generated
4. [ ] **Check console**: No errors

### Phase 2: Owner Login
1. [ ] Click setup link
2. [ ] Set password
3. [ ] Accept invitation
4. [ ] **Verify**: Logged in successfully
5. [ ] **Verify**: Setup wizard appears automatically
6. [ ] **Check console**: No errors

### Phase 3: Setup Wizard - Roles
1. [ ] In setup wizard, see "Org Admin" role
2. [ ] Click "Edit Name" on "Project Manager"
3. [ ] Change name to "Foreman"
4. [ ] Toggle some permissions
5. [ ] **Verify**: Changes save
6. [ ] **Check console**: No errors

### Phase 4: Setup Wizard - Team Members
1. [ ] Click "Add Team" tab
2. [ ] Enter email: `test-worker@example.com`
3. [ ] Select role: "Field Worker"
4. [ ] Click "Send Invitation"
5. [ ] **Verify**: Success message
6. [ ] **Verify**: Email received (check inbox)
7. [ ] **Check console**: No errors

### Phase 5: Team Member Acceptance
1. [ ] Open invitation email
2. [ ] Click invitation link
3. [ ] Set password
4. [ ] Accept invitation
5. [ ] **Verify**: Logged in
6. [ ] **Verify**: Can see team directory
7. [ ] **Check console**: No errors

### Phase 6: Team Directory
1. [ ] Navigate to `/team`
2. [ ] **Verify**: Owner visible
3. [ ] **Verify**: Team member visible
4. [ ] **Verify**: Roles displayed
5. [ ] **Check console**: No errors

### Phase 7: Mobile App
1. [ ] Open mobile app
2. [ ] Log in with owner account
3. [ ] **Verify**: Organization loads
4. [ ] **Verify**: Organization name in header
5. [ ] **Verify**: Projects visible
6. [ ] **Check console**: No errors

---

## Automated Test Results

Run this in browser console after logging in:

```javascript
async function runQuickTests() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  // Test 1: User logged in
  const user = window.__SITEWEAVE_DEBUG__.getUser();
  if (user) {
    results.passed.push('User logged in');
  } else {
    results.failed.push('User not logged in');
  }
  
  // Test 2: Organization loaded
  const org = window.__SITEWEAVE_DEBUG__.getOrganization();
  if (org) {
    results.passed.push('Organization loaded');
  } else {
    results.failed.push('Organization not loaded');
  }
  
  // Test 3: Setup wizard status
  const wizard = window.__SITEWEAVE_DEBUG__.checkSetupWizard();
  if (wizard) {
    if (wizard.setupComplete) {
      results.passed.push('Setup wizard completed');
    } else {
      results.warnings.push('Setup wizard not completed');
    }
  }
  
  // Test 4: Check state
  const state = window.__SITEWEAVE_DEBUG__.getState();
  if (state.currentOrganization) {
    results.passed.push('Organization in state');
  } else {
    results.failed.push('Organization missing from state');
  }
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log('✅ Passed:', results.passed.length);
  console.log('❌ Failed:', results.failed.length);
  console.log('⚠️ Warnings:', results.warnings.length);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log('   -', test));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log('   -', test));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    results.warnings.forEach(test => console.log('   -', test));
  }
  
  return results;
}

// Run tests
runQuickTests();
```

---

## Critical Path Verification

### ✅ Must Work for Launch

1. **Organization Creation**
   - [ ] Can create organization
   - [ ] Setup link generated
   - [ ] No errors

2. **Invitation Acceptance**
   - [ ] Link works
   - [ ] Password can be set
   - [ ] User logged in
   - [ ] Linked to organization

3. **Setup Wizard**
   - [ ] Appears automatically
   - [ ] Roles can be configured
   - [ ] Team members can be added
   - [ ] Completes successfully

4. **Email Invitations**
   - [ ] Email sent
   - [ ] Email received
   - [ ] Link works

5. **Team Directory**
   - [ ] Shows all members
   - [ ] Roles displayed
   - [ ] No errors

6. **Mobile App**
   - [ ] Organization loads
   - [ ] Header shows org name
   - [ ] Projects filtered
   - [ ] No errors

---

## Emergency Commands

### If Setup Wizard Doesn't Appear
```javascript
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
location.reload()
```

### If Organization Not Loading
```sql
-- Check profile
SELECT id, email, organization_id 
FROM profiles 
WHERE email = 'your-email@example.com';

-- Fix if needed
UPDATE profiles 
SET organization_id = 'org-id-here' 
WHERE id = 'user-id-here';
```

### If Email Not Sending
```bash
# Check logs
supabase functions logs team-invite --follow

# Check secret
supabase secrets list | grep RESEND
```

---

**Run these tests before Monday's launch!**
