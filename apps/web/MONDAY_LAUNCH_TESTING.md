# Monday Launch Testing Guide

## Meeting Workflow Simulation

This guide walks through the exact steps that will happen during the client meeting.

---

## Pre-Meeting Setup (Do This First)

### 1. Verify Super Admin Access
- [ ] Log in as super admin
- [ ] Navigate to `/admin/super` OR use `CREATE-ORGANIZATION-TOOL.html`
- [ ] Verify you can see the organization creation form

### 2. Check Edge Functions
- [ ] Verify `create-org-admin` function is deployed
- [ ] Verify `team-invite` function is deployed
- [ ] Verify `team-create-user` function is deployed
- [ ] Verify `team-update-role` function is deployed
- [ ] Verify `team-remove-user` function is deployed

### 3. Check Environment Variables
- [ ] Verify `APP_URL` is set in Supabase secrets
- [ ] Verify `RESEND_API_KEY` is set (for emails)
- [ ] Verify email domain is verified in Resend

---

## Meeting Workflow Test (Step-by-Step)

### Step 1: The "Handshake" - Create Organization

**Action**: Create a new organization for the client

**Test Steps**:
1. Open Super Admin Dashboard (`/admin/super`) or HTML tool
2. Enter test data:
   - Company Name: "Test Construction Co"
   - Owner Name: "John Test"
   - Owner Email: "test-owner@example.com"
   - Admin Password: "TestPassword123!"
3. Click "Create Organization"
4. **Verify**:
   - [ ] Organization is created successfully
   - [ ] Setup link is generated
   - [ ] Invitation email is sent (check Resend logs)
   - [ ] Owner receives email with invitation link

**Expected Result**: Organization created, setup link displayed

**Common Issues**:
- ❌ Edge function not deployed → Deploy `create-org-admin`
- ❌ Email not sending → Check Resend API key
- ❌ Organization creation fails → Check database permissions

---

### Step 2: Owner First Login - Setup Wizard

**Action**: Owner clicks setup link and logs in

**Test Steps**:
1. Open invitation link in new browser/incognito
2. Set password: "TestPassword123!"
3. Click "Accept Invitation"
4. **Verify**:
   - [ ] User is logged in
   - [ ] Setup Wizard appears automatically
   - [ ] User sees "Org Admin" role in left panel
   - [ ] User can see role permissions

**Expected Result**: Setup Wizard modal appears with role configuration

**Common Issues**:
- ❌ Setup Wizard doesn't appear → Check localStorage, check user role
- ❌ User not linked to organization → Check invitation acceptance
- ❌ Role not found → Check if default roles were created

---

### Step 3: Configure Roles

**Action**: Owner customizes role permissions

**Test Steps**:
1. In Setup Wizard, review "Org Admin" role
2. Click "Edit Name" on "Project Manager" role
3. Change name to "Foreman"
4. Toggle some permissions (e.g., disable "Delete Projects")
5. Click "Save & Continue"
6. **Verify**:
   - [ ] Role name updates
   - [ ] Permissions save correctly
   - [ ] Wizard moves to "Add Team" step

**Expected Result**: Roles configured, wizard progresses

**Common Issues**:
- ❌ Role update fails → Check RLS policies on roles table
- ❌ Permissions not saving → Check JSONB column format
- ❌ Duplicate role error → Check unique constraint

---

### Step 4: Add Team Members

**Action**: Owner invites team members

**Test Steps**:
1. In Setup Wizard "Add Team" step
2. **Option A - Invite via Email**:
   - Enter email: "test-worker@example.com"
   - Select role: "Field Worker"
   - Click "Send Invitation"
   - **Verify**: Email sent, invitation created
3. **Option B - Create Managed Account**:
   - Click "Create Managed Account"
   - Enter:
     - Name: "Jane Worker"
     - Email: "jane@example.com"
     - Username: "jane" (optional)
   - Select role: "Field Worker"
   - Click "Create Account"
   - **Verify**: Account created, PIN displayed
4. Click "Complete Setup"
5. **Verify**:
   - [ ] Setup Wizard closes
   - [ ] User sees main dashboard
   - [ ] Team members appear in Team Directory

**Expected Result**: Team members added, setup complete

**Common Issues**:
- ❌ Invitation email not sent → Check Resend API, check edge function logs
- ❌ Managed account creation fails → Check edge function permissions
- ❌ PIN not generated → Check PIN generation logic
- ❌ Setup wizard doesn't close → Check localStorage flag

---

### Step 5: Team Member Accepts Invitation

**Action**: Team member receives email and accepts invitation

**Test Steps**:
1. Open invitation email (from Step 4)
2. Click invitation link
3. Set password: "WorkerPassword123!"
4. Click "Accept Invitation"
5. **Verify**:
   - [ ] User is logged in
   - [ ] User sees download center (if new user)
   - [ ] User can see Team Directory
   - [ ] User sees owner and other team members

**Expected Result**: Team member successfully onboarded

**Common Issues**:
- ❌ Invitation link broken → Check token generation
- ❌ Invitation expired → Check expiration logic (7 days)
- ❌ User not linked to organization → Check invitation acceptance logic
- ❌ Download center not showing → Check mobile app links

---

### Step 6: Verify Team Directory

**Action**: All users see each other automatically

**Test Steps**:
1. As Owner, navigate to `/team` or Team Directory
2. **Verify**:
   - [ ] Owner sees themselves
   - [ ] Owner sees all invited team members
   - [ ] Roles are displayed correctly
   - [ ] Contact info is visible
3. As Team Member, navigate to Team Directory
4. **Verify**:
   - [ ] Team member sees owner
   - [ ] Team member sees other team members
   - [ ] No manual "add friend" needed

**Expected Result**: All organization members visible to each other

**Common Issues**:
- ❌ Team members not visible → Check organization_id on profiles
- ❌ Roles not showing → Check role_id on profiles
- ❌ Foreign key errors → Check `contacts!fk_profiles_contact` syntax

---

## Mobile App Testing

### Mobile Organization Loading

**Test Steps**:
1. Open mobile app
2. Log in with owner credentials
3. **Verify**:
   - [ ] Organization loads automatically
   - [ ] Organization name appears in header
   - [ ] User can see projects
   - [ ] User can see team members

**Common Issues**:
- ❌ "No Organization Found" error → Check `loadUserOrganization()` function
- ❌ Organization not loading → Check profiles table query
- ❌ Projects not showing → Check organization_id filter

---

## General Bug Checks

### Database Issues

- [ ] Check for foreign key errors in console
- [ ] Verify RLS policies are enabled
- [ ] Check for duplicate key errors
- [ ] Verify organization_id is set on all records

### Email Issues

- [ ] Check Resend API key is valid
- [ ] Verify email domain is verified
- [ ] Check edge function logs for email errors
- [ ] Test email delivery in Resend dashboard

### Authentication Issues

- [ ] Verify Supabase auth is working
- [ ] Check OAuth redirects are configured
- [ ] Test password reset flow
- [ ] Verify session persistence

### UI/UX Issues

- [ ] Check for console errors
- [ ] Verify modals close properly
- [ ] Check for loading states
- [ ] Verify error messages are user-friendly

### Permission Issues

- [ ] Verify PermissionGuard works
- [ ] Check role permissions are enforced
- [ ] Test with different role levels
- [ ] Verify can_manage_team permission

---

## Quick Fixes Checklist

### If Organization Creation Fails:
1. Check `create-org-admin` edge function is deployed
2. Verify service role key is set
3. Check database permissions

### If Setup Wizard Doesn't Appear:
1. Check localStorage for `setup_complete_{userId}`
2. Verify user has "Org Admin" role
3. Check browser console for errors

### If Invitations Don't Send:
1. Check Resend API key in Supabase secrets
2. Verify email domain is verified
3. Check edge function logs: `supabase functions logs team-invite`

### If Team Members Not Visible:
1. Check profiles.organization_id is set
2. Verify invitation was accepted
3. Check RLS policies on contacts table

### If Mobile App Shows "No Organization":
1. Check `loadUserOrganization()` function
2. Verify profiles query includes organizations join
3. Check activeOrganization state in AuthContext

---

## Emergency Rollback Plan

If critical issues are found:

1. **Disable Setup Wizard**: Comment out SetupWizardModal in App.jsx
2. **Disable Invitations**: Comment out invitation sending in edge function
3. **Manual User Creation**: Use Supabase dashboard to create users manually
4. **Database Rollback**: Restore from backup if needed

---

## Browser Console Testing

### Quick Commands (After logging in)

Open browser console (`F12` → Console tab) and run:

```javascript
// Check if you're logged in
window.__SITEWEAVE_DEBUG__.getUser()

// Check your organization
window.__SITEWEAVE_DEBUG__.getOrganization()

// Check setup wizard status
window.__SITEWEAVE_DEBUG__.checkSetupWizard()

// Force setup wizard to appear (if needed)
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
```

**See CONSOLE_COMMANDS.md for full list of commands**

## Terminal/CLI Testing

```bash
# 1. Check edge functions are deployed
supabase functions list

# 2. Check environment variables
supabase secrets list

# 3. Test create-org-admin function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-org-admin \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Test Org",
    "orgSlug": "test-org",
    "adminEmail": "test@example.com",
    "adminPassword": "Test123!",
    "adminName": "Test Admin"
  }'

# 4. Check edge function logs
supabase functions logs team-invite --follow
supabase functions logs create-org-admin --follow

# 5. Check database
# Run in Supabase SQL Editor:
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;
SELECT * FROM invitations WHERE status = 'pending';
SELECT * FROM profiles WHERE organization_id IS NOT NULL;
```

---

## Success Criteria

✅ Organization creation works  
✅ Setup Wizard appears for new admins  
✅ Roles can be configured  
✅ Team members can be invited  
✅ Invitation emails are sent  
✅ Team members can accept invitations  
✅ Team Directory shows all members  
✅ Mobile app loads organization correctly  
✅ No console errors  
✅ No database errors  

---

**Last Updated**: Pre-Launch Testing  
**Status**: Ready for Testing
