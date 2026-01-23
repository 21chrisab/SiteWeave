# Setup Wizard Fixes

## Issues Fixed

### 1. Close Button Not Working
**Problem**: The close button (X) on the setup wizard modal was not functional because the `onClose` handler was set to an empty function.

**Solution**: 
- Added a proper `handleClose` function that:
  - Shows a confirmation dialog before closing
  - Marks setup as complete in localStorage (prevents it from showing again)
  - Calls `onComplete()` to close the modal

**Files Modified**:
- `src/components/SetupWizardModal.jsx`
- `apps/web/src/components/SetupWizardModal.jsx`

### 2. Everyone Seeing the Setup Wizard
**Problem**: The setup wizard was showing for all users, not just Org Admins.

**Solution**:
- Enhanced the role check logic in `App.jsx` to be more robust:
  - Added explicit checks for user, organization, and role before showing wizard
  - Added console logging in development mode to help debug role assignment issues
  - Added explicit check to hide wizard for non-Org Admin users
  - Improved guard conditions to prevent showing wizard if role isn't loaded yet

**Files Modified**:
- `src/App.jsx`

## Testing Instructions

### Test 1: Close Button Functionality
1. Log in as an Org Admin who hasn't completed setup
2. The setup wizard should appear
3. Click the X (close) button in the top-right corner
4. You should see a confirmation dialog: "Are you sure you want to skip the setup wizard?"
5. Click "OK" to confirm
6. The wizard should close and not appear again
7. Refresh the page - wizard should not reappear

### Test 2: Org Admin Setup Wizard
1. Log in as a user with "Org Admin" role
2. Clear localStorage: `localStorage.removeItem('setup_complete_' + userId)`
3. Refresh the page
4. The setup wizard SHOULD appear
5. Check browser console for log: "Showing setup wizard for Org Admin: [email]"

### Test 3: Non-Admin Users (Regular Members)
1. Log in as a user with "Member" or any other non-"Org Admin" role
2. The setup wizard should NOT appear
3. Check browser console for log: "User is not Org Admin (role: [role-name]), hiding setup wizard"

### Test 4: Debug Role Assignment
If everyone is still seeing the wizard, check the console logs:
```javascript
// The console should show for each user:
Setup Wizard Check: {
  userId: "...",
  userEmail: "...",
  roleName: "Member" (or other role - should only show wizard if "Org Admin"),
  isOrgAdmin: false (should be false for non-admins),
  organizationId: "...",
  organizationName: "..."
}
```

## Debugging Commands

If you need to debug role assignments:

```javascript
// Check current user's role
window.__SITEWEAVE_DEBUG__.getUser()
window.__SITEWEAVE_DEBUG__.checkSetupWizard()

// Clear setup wizard flag to test again
window.__SITEWEAVE_DEBUG__.clearSetupWizard()
```

## Root Cause Analysis

### Why might everyone see the wizard?

If non-admin users are still seeing the wizard after this fix, it means they are being assigned the "Org Admin" role incorrectly. This could happen if:

1. **During organization creation**: The `create-org-admin` function should only assign "Org Admin" to the organization creator
2. **During user invitation**: The `team-invite` function should use the `roleId` parameter to assign the correct role
3. **During managed user creation**: The `team-create-user` function should use the `roleId` parameter

To verify role assignments:
```sql
-- Check all users and their roles in your organization
SELECT 
  p.id,
  u.email,
  r.name as role_name,
  o.name as organization_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN roles r ON r.id = p.role_id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.organization_id = 'your-org-id';
```

Expected results:
- Organization creator: "Org Admin"
- Invited users: Role assigned during invitation (default should be "Member" if not specified)
- Managed users: Role assigned during creation (default should be "Member" if not specified)

## Additional Notes

- The setup wizard check now includes more defensive guards to prevent showing the wizard before roles are loaded
- Console logging has been added in development mode to help debug role assignment issues
- The wizard can now be dismissed/skipped, which marks setup as complete to prevent it from reappearing

