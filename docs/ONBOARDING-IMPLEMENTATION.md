# Onboarding Implementation Guide

## Overview

This document describes the complete onboarding system for SiteWeave, including the edge function for creating organizations and the frontend components for setup and team management.

---

## Architecture

### 1. Edge Function: `create-org-admin`

**Location**: `supabase/functions/create-org-admin/index.ts`

**Purpose**: Creates a new organization with an admin user account.

**Input**:
```json
{
  "orgName": "Miller Construction",
  "orgSlug": "miller-construction",
  "adminEmail": "john@miller.com",
  "adminPassword": "SecurePassword123",
  "adminName": "John Miller"
}
```

**Process**:
1. Creates organization record
2. Seeds two default roles:
   - **"Org Admin"**: Full permissions including `can_manage_team: true`
   - **"Member"**: Basic permissions (`read_projects: true`, `create_comments: true`)
3. Creates auth user with provided password (using Admin API)
4. Creates contact record for admin
5. Links profile to organization with "Org Admin" role

**Output**:
```json
{
  "success": true,
  "organization": {
    "id": "uuid",
    "name": "Miller Construction",
    "slug": "miller-construction"
  },
  "admin": {
    "id": "uuid",
    "email": "john@miller.com",
    "name": "John Miller"
  },
  "roles": {
    "adminRoleId": "uuid",
    "memberRoleId": "uuid"
  }
}
```

**Usage**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-org-admin \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Miller Construction",
    "orgSlug": "miller-construction",
    "adminEmail": "john@miller.com",
    "adminPassword": "SecurePassword123",
    "adminName": "John Miller"
  }'
```

---

### 2. Setup Wizard Component

**Location**: `src/components/SetupWizard.jsx`

**Purpose**: Guides new organization admins through initial setup.

**Triggers**: Shows automatically on first login for users with "Org Admin" role.

**Steps**:

#### Step 1: Review Member Role Permissions
- Loads the default "Member" role
- Allows admin to customize permissions:
  - `read_projects`
  - `create_comments`
  - `can_create_tasks`
  - `can_edit_tasks`
- Saves updated permissions to database

#### Step 2: Add Team Members
- **Invite via Email**: Send invitation email to new team members
- **Create Managed Account**: Create user account directly with username/password
- Shows list of added members

**Completion**: Marks setup as complete in localStorage, prevents future displays.

---

### 3. Team Management Modal

**Location**: `src/components/TeamManagementModal.jsx`

**Purpose**: Secure interface for managing organization team members.

**Permission Guard**: Requires `can_manage_team` permission.

**Features**:

1. **List All Members**
   - Shows all users in the organization
   - Displays name, email, role
   - Highlights current user

2. **Invite via Email**
   - Enter email address
   - Select role (optional)
   - Sends invitation via edge function

3. **Create Managed Account**
   - Enter full name, email, password
   - Select role (optional)
   - Creates account immediately

4. **Edit Role**
   - Dropdown to change user's role
   - Updates via edge function

5. **Remove User**
   - Removes user from organization
   - Prevents self-removal
   - Verifies organization membership

**Access**: Button in navigation bar (only visible to users with `can_manage_team` permission).

---

### 4. Edge Functions for Team Management

All team management operations are secured via edge functions that verify `can_manage_team` permission.

#### `team-invite`
**Location**: `supabase/functions/team-invite/index.ts`

**Input**:
```json
{
  "email": "mike@miller.com",
  "organizationId": "uuid",
  "roleId": "uuid" // optional
}
```

**Process**:
1. Verifies requesting user has `can_manage_team` permission
2. Creates invitation record
3. Generates invitation token
4. Returns setup URL

#### `team-create-user`
**Location**: `supabase/functions/team-create-user/index.ts`

**Input**:
```json
{
  "email": "steve@miller.com",
  "password": "SecurePassword123",
  "fullName": "Steve Worker",
  "organizationId": "uuid",
  "roleId": "uuid" // optional
}
```

**Process**:
1. Verifies requesting user has `can_manage_team` permission
2. Creates auth user with Admin API
3. Creates contact record
4. Links profile to organization

#### `team-update-role`
**Location**: `supabase/functions/team-update-role/index.ts`

**Input**:
```json
{
  "userId": "uuid",
  "organizationId": "uuid",
  "roleId": "uuid"
}
```

**Process**:
1. Verifies requesting user has `can_manage_team` permission
2. Verifies target user is in same organization
3. Updates user's role

#### `team-remove-user`
**Location**: `supabase/functions/team-remove-user/index.ts`

**Input**:
```json
{
  "userId": "uuid",
  "organizationId": "uuid"
}
```

**Process**:
1. Verifies requesting user has `can_manage_team` permission
2. Prevents self-removal
3. Verifies target user is in same organization
4. Removes user from organization (sets `organization_id` and `role_id` to null)

---

## Permission System

### `can_manage_team` Permission

This is a boolean flag in the `roles.permissions` JSONB column.

**Default Roles**:
- **"Org Admin"**: `can_manage_team: true`
- **"Member"**: `can_manage_team: false`

**Usage**:
- Frontend: `<PermissionGuard permission="can_manage_team">`
- Backend: Edge functions verify this permission before processing requests

---

## Deployment

### 1. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy create-org-admin
supabase functions deploy team-invite
supabase functions deploy team-create-user
supabase functions deploy team-update-role
supabase functions deploy team-remove-user
```

### 2. Set Environment Variables

```bash
supabase secrets set APP_URL=https://yourapp.com
```

### 3. Update HTML Tool

1. Open `CREATE-ORGANIZATION-TOOL.html`
2. Configure Supabase URL
3. Bookmark for easy access

---

## User Flow

### For Consultant (You)

1. **Open HTML Tool**: `CREATE-ORGANIZATION-TOOL.html`
2. **Enter Client Details**:
   - Company Name: "Miller Construction"
   - Owner Name: "John Miller"
   - Owner Email: "john@miller.com"
   - Admin Password: (temporary password)
3. **Click "Create Organization"**
4. **Get Response**: Organization ID, Admin User ID
5. **Hand Credentials to Client**: Email + Password

### For Client (Org Admin)

1. **First Login**:
   - Logs in with provided email/password
   - Setup Wizard appears automatically

2. **Step 1: Review Permissions**
   - Customizes "Member" role permissions
   - Clicks "Save & Continue"

3. **Step 2: Add Team**
   - Invites team members via email OR
   - Creates managed accounts
   - Clicks "Complete Setup"

4. **Ongoing Management**:
   - Clicks "Manage Team" in navigation
   - Uses Team Management Modal to:
     - Invite new members
     - Create accounts
     - Edit roles
     - Remove users

### For Team Members

1. **Receive Invitation** (if invited via email)
   - Clicks invitation link
   - Sets password
   - Logs in

2. **Or Use Managed Account** (if created by admin)
   - Receives credentials from admin
   - Logs in directly

3. **See Team Directory**
   - Automatically sees all org members
   - No manual friend requests needed

---

## Security

### Frontend
- `PermissionGuard` component hides UI elements
- Team Management Modal only accessible with `can_manage_team`

### Backend
- All edge functions verify `can_manage_team` permission
- Service role key required for user creation
- Organization membership verified before operations
- Self-removal prevented

---

## Testing

### Test Organization Creation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-org-admin \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Test Construction",
    "orgSlug": "test-construction",
    "adminEmail": "test@example.com",
    "adminPassword": "TestPassword123",
    "adminName": "Test Admin"
  }'
```

### Test Team Management

1. Log in as Org Admin
2. Click "Manage Team"
3. Invite a test user
4. Verify invitation appears
5. Edit a user's role
6. Remove a test user

---

## Troubleshooting

### Setup Wizard Not Showing
- Check user has "Org Admin" role
- Check localStorage: `setup_complete_{userId}` should not exist
- Check browser console for errors

### Team Management Button Not Visible
- Verify user has `can_manage_team` permission
- Check role permissions in database
- Verify `PermissionGuard` is working

### Edge Function Errors
- Check function logs: `supabase functions logs {function-name}`
- Verify service role key is set
- Check permission verification logic

---

## Files Created/Modified

### New Files
- `supabase/functions/create-org-admin/index.ts`
- `supabase/functions/team-invite/index.ts`
- `supabase/functions/team-create-user/index.ts`
- `supabase/functions/team-update-role/index.ts`
- `supabase/functions/team-remove-user/index.ts`
- `src/components/SetupWizard.jsx`
- `src/components/TeamManagementModal.jsx`
- `docs/ONBOARDING-IMPLEMENTATION.md`

### Modified Files
- `src/App.jsx` - Added SetupWizard and TeamManagementModal
- `CREATE-ORGANIZATION-TOOL.html` - Updated to use `create-org-admin`

---

## Next Steps

1. **Deploy Edge Functions**: Run deployment commands above
2. **Test Workflow**: Create test organization and verify all steps
3. **Configure Email**: Set up Resend for invitation emails (optional)
4. **Customize Permissions**: Adjust default "Member" role permissions as needed

---

**Last Updated**: January 7, 2026
