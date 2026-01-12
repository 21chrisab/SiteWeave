# Launch Day Script - Step by Step

## Pre-Meeting Setup (30 minutes before)

### 1. Final System Check
```bash
# Check edge functions are deployed
supabase functions list

# Verify environment variables
supabase secrets list

# Check recent logs for errors
supabase functions logs team-invite --limit 10
```

### 2. Test Organization Creation
1. Open `CREATE-ORGANIZATION-TOOL.html` in browser
2. Enter test data:
   - Company: "Test Company"
   - Owner: "Test Owner"  
   - Email: "test@example.com"
   - Password: "Test123!"
3. Click "Create Organization"
4. **Verify**: Organization created, setup link generated

### 3. Test Setup Link
1. Copy setup link from step 2
2. Open in incognito browser
3. Set password and accept
4. **Verify**: Setup wizard appears

### 4. Prepare Backup
- Have SQL queries ready for manual user creation
- Know how to check edge function logs
- Have Resend dashboard open to check emails

---

## During the Meeting - Exact Steps

### Step 1: Create Organization (2 minutes)

**You (Consultant)**:
1. Open `CREATE-ORGANIZATION-TOOL.html` or navigate to `/admin/super`
2. Enter client information:
   - **Company Name**: [Client's company name
   - **Owner Name**: [Owner's full name]
   - **Owner Email**: [Owner's email]
   - **Admin Password**: [Temporary password - tell them to change it]
3. Click "Create Organization"
4. **Wait for**: Success message with setup link

**What to Say**:
> "I'm creating your organization account. This will take about 10 seconds..."

**If It Fails**:
- Check browser console for errors
- Verify edge function is deployed
- Check Supabase dashboard for errors
- **Backup**: Create manually via SQL (have script ready)

---

### Step 2: Hand Off Setup Link (1 minute)

**You (Consultant)**:
1. Copy the setup link from the success message
2. Hand iPad/laptop to owner
3. Say: "Here's your setup link. Click it to set your password."

**What Happens**:
- Owner clicks link
- Lands on `/invite/:token` page
- Sees organization name and role
- Sets password
- Clicks "Accept Invitation"

**If It Fails**:
- Check invitation token is valid
- Verify invitation hasn't expired
- Check browser console
- **Backup**: Manually create user in Supabase dashboard

---

### Step 3: Setup Wizard Appears (5 minutes)

**Owner**:
1. After accepting invitation, Setup Wizard appears automatically
2. Sees two panels:
   - **Left**: Role Configuration
   - **Right**: Add Team Members

**You (Consultant)**:
> "This is your setup wizard. On the left, you can customize roles. On the right, you can add team members. Let's start with roles..."

**If Wizard Doesn't Appear**:
- Check browser console
- Verify user has "Org Admin" role
- Check localStorage: `localStorage.getItem('setup_complete_${userId}')`
- **Fix**: Clear localStorage and refresh

---

### Step 4: Configure Roles (5-10 minutes)

**Owner**:
1. Reviews "Org Admin" role (already configured)
2. Clicks "Edit Name" on "Project Manager" role
3. Changes name if needed (e.g., "Foreman")
4. Toggles permissions as needed
5. Clicks "Save & Continue"

**You (Consultant)**:
> "You can customize what each role can do. For example, you might want your Foreman to be able to delete projects, but not your Field Workers..."

**If Role Update Fails**:
- Check RLS policies allow UPDATE
- Verify role name is unique
- Check for duplicate key errors
- **Fix**: Check console, verify permissions

---

### Step 5: Add Team Members (10-15 minutes)

**Owner**:
1. In "Add Team" panel, chooses one:
   - **Option A**: Invite via Email
     - Enters email
     - Selects role
     - Clicks "Send Invitation"
   - **Option B**: Create Managed Account
     - Clicks "Create Managed Account"
     - Enters name, email, username (optional)
     - Selects role
     - Clicks "Create Account"
     - **Saves PIN** that's displayed

2. Repeats for each team member
3. Clicks "Complete Setup" when done

**You (Consultant)**:
> "You can either send them an email invitation, or create an account for them right now. If you create it now, you'll get a PIN to give them..."

**If Invitation Fails**:
- Check Resend API key is set
- Verify email domain is verified
- Check edge function logs
- **Backup**: Create user manually, send link

**If Managed Account Creation Fails**:
- Check edge function permissions
- Verify can_manage_team permission
- Check console for errors
- **Backup**: Create via SQL

---

### Step 6: Team Members Accept Invitations (After Meeting)

**Team Member**:
1. Receives email with invitation link
2. Clicks link
3. Sets password
4. Clicks "Accept Invitation"
5. Sees download center (if new user)
6. Can now log in and see team

**What to Tell Team Members**:
> "You'll receive an email invitation. Click the link, set your password, and you're in. You'll automatically see everyone in your organization."

**If Invitation Link Doesn't Work**:
- Check invitation status in database
- Verify token matches
- Check expiration date
- **Fix**: Resend invitation

---

### Step 7: Verify Team Directory (2 minutes)

**Owner**:
1. After setup, navigates to Team Directory (`/team`)
2. Sees all team members automatically
3. Sees roles, contact info, join dates

**You (Consultant)**:
> "See how everyone appears automatically? No need to manually add friends. Everyone in your organization can see each other."

**If Team Members Not Visible**:
- Check organization_id on profiles
- Verify invitation was accepted
- Check RLS policies
- **Fix**: Update profiles manually if needed

---

## Troubleshooting During Meeting

### Issue: Organization Creation Fails
**Quick Fix**:
1. Check browser console
2. Verify edge function is deployed
3. Check Supabase dashboard
4. **Backup**: Create via SQL script

### Issue: Setup Wizard Doesn't Appear
**Quick Fix**:
```javascript
// In browser console
localStorage.removeItem(`setup_complete_${userId}`);
window.location.reload();
```

### Issue: Invitation Email Not Sent
**Quick Fix**:
1. Check Resend dashboard
2. Verify API key is set
3. Check edge function logs
4. **Backup**: Manually send invitation link

### Issue: Role Creation Fails
**Quick Fix**:
1. Check for duplicate role name
2. Verify RLS policies
3. Check console errors
4. **Backup**: Create role via SQL

### Issue: Team Member Can't Accept Invitation
**Quick Fix**:
1. Check invitation status
2. Verify token
3. Check expiration
4. **Backup**: Create new invitation

---

## Post-Meeting Checklist

- [ ] All team members received invitations
- [ ] All managed accounts have PINs saved
- [ ] Owner can see team directory
- [ ] Roles are configured correctly
- [ ] No errors in console
- [ ] Mobile app works for owner
- [ ] Email delivery confirmed

---

## Emergency Contacts & Resources

### Supabase Dashboard
- URL: [Your Supabase Dashboard]
- Check: Functions, Database, Logs

### Resend Dashboard
- URL: https://resend.com
- Check: Email delivery, API keys

### Edge Function Logs
```bash
supabase functions logs team-invite --follow
supabase functions logs create-org-admin --follow
```

### Database Queries
```sql
-- Check organizations
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;

-- Check invitations
SELECT * FROM invitations WHERE status = 'pending';

-- Check profiles
SELECT id, email, organization_id FROM profiles WHERE organization_id IS NOT NULL;
```

---

## Success Criteria

✅ Organization created  
✅ Owner can log in  
✅ Setup wizard appears  
✅ Roles configured  
✅ Team members invited  
✅ Invitations sent  
✅ Team directory shows members  
✅ No errors  

---

**Good luck with your launch! 🚀**
