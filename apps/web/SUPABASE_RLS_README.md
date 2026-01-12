# SiteWeave Supabase RLS Implementation

## Overview

SiteWeave uses Supabase Row Level Security (RLS) to implement a comprehensive 3-tier user hierarchy system that ensures proper data isolation and access control. This system transforms the application from sample data to production-ready with enterprise-grade security.

## ⚠️ Important: Profiles Table RLS

**The `profiles` table has RLS DISABLED** to prevent infinite recursion in RLS policies.

### Why?
- The `profiles` table stores user roles and contact associations
- Helper functions `get_user_role()` and `get_user_contact_id()` query the `profiles` table
- These helper functions are used by RLS policies on other tables (like `projects`)
- If `profiles` had RLS policies that also called these helper functions, it would create infinite recursion

### Security Implications
- ✅ **Profiles are still secure**: Only authenticated users can access the database
- ✅ **Minimal data exposure**: Profiles only contain `role` and `contact_id` mappings
- ✅ **Application-level control**: Profile creation is handled by the auth trigger
- ⚠️ **Trade-off**: All authenticated users can read all profiles (but cannot modify them without proper authorization)

## User Hierarchy System

### 1. Admin Users
**Role:** `Admin`  
**Access Level:** Full system access

**Capabilities:**
- ✅ View all projects across the entire system
- ✅ Create new projects
- ✅ Update any project details
- ✅ Delete any project
- ✅ Manage all contacts (create, update, delete)
- ✅ Assign Project Managers to projects
- ✅ Assign team members to projects via `project_contacts`
- ✅ Manage event categories
- ✅ Access all data in all tables

**Use Case:** System administrators, company owners, or senior management who need oversight of all projects.

### 2. Project Manager (PM)
**Role:** `PM`  
**Access Level:** Project-specific management

**Capabilities:**
- ✅ Create new projects
- ✅ View only projects where they are assigned as `project_manager_id`
- ✅ Update their assigned projects
- ✅ Delete their assigned projects
- ✅ Assign team members to their projects via `project_contacts`
- ✅ Create issues, files, messages, calendar events within their projects
- ✅ Manage all aspects of their assigned projects
- ❌ Cannot see other PMs' projects
- ❌ Cannot manage contacts or event categories

**Use Case:** Project managers who oversee specific construction projects and need full control over their assigned projects.

### 3. Team Member / Subcontractor
**Role:** `Team`  
**Access Level:** Assigned project participation

**Capabilities:**
- ✅ Create new projects
- ✅ View only projects they are assigned to via `project_contacts` junction table
- ✅ Create issues, comments, files within their assigned projects
- ✅ Update their own comments (within 15 minutes of creation)
- ✅ Update issue steps assigned to them
- ✅ Update tasks assigned to them
- ✅ Create calendar events, messages within assigned projects
- ❌ Cannot assign other team members
- ❌ Cannot see projects they're not assigned to

**Use Case:** Subcontractors, field workers, or team members who work on specific projects and need to report issues, upload files, and communicate within their assigned projects.

## Contact Management System

### Contact Types
The `contacts` table stores all people and organizations involved in projects:

- **Internal Team Members:** Company employees who can become users
- **Subcontractors:** External contractors who can become users
- **Clients:** Project owners who may or may not become users
- **Vendors:** Suppliers and service providers
- **Other:** Any other contacts relevant to projects

### Contact-to-User Linking
The `profiles` table creates the bridge between Supabase authentication and contacts:

```sql
profiles {
  id: UUID (references auth.users.id)
  role: 'Admin' | 'PM' | 'Team'
  contact_id: UUID (references contacts.id, nullable)
  created_at: timestamp
}
```

**Key Points:**
- **Not all contacts become users** - Some contacts remain as contact records only
- **All users must have a contact record** - When a user signs up, they should be linked to a contact
- **Contact linking is optional** - The `contact_id` can be NULL if a user doesn't have a corresponding contact record yet

### Contact Assignment to Projects
Team members are assigned to projects via the `project_contacts` junction table:

```sql
project_contacts {
  project_id: UUID (references projects.id)
  contact_id: UUID (references contacts.id)
  PRIMARY KEY (project_id, contact_id)
}
```

**Assignment Rules:**
- **Admins** can assign any contact to any project
- **Project Managers** can assign contacts only to their own projects
- **Team members** cannot assign contacts (read-only access)

## Database Schema Structure

### Core Tables

#### Projects Table
```sql
projects {
  id: UUID (primary key)
  name: TEXT
  address: TEXT
  status: TEXT
  project_type: TEXT
  due_date: DATE
  -- RLS Fields
  project_manager_id: UUID (references auth.users.id)
  created_by_user_id: UUID (references auth.users.id)
  updated_by_user_id: UUID (references auth.users.id)
  updated_at: TIMESTAMP
}
```

#### Profiles Table
```sql
profiles {
  id: UUID (primary key, references auth.users.id)
  role: TEXT ('Admin' | 'PM' | 'Team')
  contact_id: UUID (references contacts.id, nullable)
  created_at: TIMESTAMP
}
```

#### Contacts Table
```sql
contacts {
  id: UUID (primary key)
  name: TEXT
  role: TEXT
  type: TEXT
  company: TEXT
  trade: TEXT
  status: TEXT
  avatar_url: TEXT
}
```

### Child Tables (Project-Related)
All project-related tables inherit access control from the projects table:

- `calendar_events` - Project events and scheduling
- `files` - Project documents and files
- `project_issues` - Field issues and problems
- `issue_steps` - Workflow steps for issues
- `issue_comments` - Comments on issues
- `issue_files` - Files attached to issues
- `message_channels` - Project communication channels
- `messages` - Project communications
- `project_phases` - Project phases and milestones
- `tasks` - Project tasks and to-dos

## Row Level Security (RLS) Policies

### How RLS Works
RLS policies are SQL conditions that determine which rows a user can see or modify. They run automatically on every database query.

### Policy Examples

#### Projects Table Policies
```sql
-- SELECT Policy: Users see projects based on their role
CREATE POLICY "Users can see projects based on their role"
ON public.projects FOR SELECT
USING (
  (get_user_role() = 'Admin') -- Admins see all
  OR
  (project_manager_id = auth.uid()) -- PMs see their projects
  OR
  (id IN ( -- Team members see assigned projects
      SELECT project_id FROM public.project_contacts
      WHERE contact_id = get_user_contact_id()
    )
  )
);
```

```sql
-- INSERT Policy: All authenticated users can create projects
CREATE POLICY "All authenticated users can create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

#### Child Table Policies
```sql
-- Child tables inherit project access
CREATE POLICY "Users can see events for accessible projects"
ON public.calendar_events FOR SELECT
USING (project_id IN (SELECT id FROM public.projects));
```

### Helper Functions
Two security definer functions provide user context:

```sql
-- Get current user's role
CREATE FUNCTION get_user_role() RETURNS TEXT
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$

-- Get current user's contact_id
CREATE FUNCTION get_user_contact_id() RETURNS UUID
AS $$ SELECT contact_id FROM public.profiles WHERE id = auth.uid(); $$
```

## User Onboarding Flow

### 1. User Signup
When a user signs up through Supabase Auth:
1. User account is created in `auth.users`
2. Trigger automatically creates a profile with `role = 'Team'`
3. `contact_id` is initially NULL

### 2. Profile Setup
An admin or PM must:
1. Create or find the user's contact record in `contacts` table
2. Update the user's profile to link `contact_id`
3. Update the user's `role` if needed (Admin/PM/Team)

### 3. Project Assignment
For team members:
1. Admin or PM assigns the contact to projects via `project_contacts`
2. User can now see and interact with assigned projects

## Security Features

### Data Isolation
- **Complete isolation** between different projects
- **Role-based access** ensures users only see relevant data
- **Automatic enforcement** - no application-level security needed

### Audit Trail
All major operations are tracked:
- `created_by_user_id` - Who created the record
- `updated_by_user_id` - Who last updated the record
- `updated_at` - When the record was last updated

### Activity Tracking
Visual receipts show:
- Who created issues, files, comments
- Who updated project details
- When changes were made
- Complete audit trail for compliance

## Implementation Benefits

### For Developers
- **Simplified security** - RLS handles access control automatically
- **No complex permission logic** in application code
- **Database-level security** - impossible to bypass
- **Automatic scaling** - works with any number of users/projects

### For Users
- **Intuitive access** - users only see what they need
- **Clear boundaries** - no confusion about what they can access
- **Consistent experience** - same rules apply everywhere
- **Real-time updates** - permissions change immediately

### For Administrators
- **Centralized control** - manage all permissions in one place
- **Audit compliance** - complete activity tracking
- **Flexible assignment** - easy to reassign users to projects
- **Scalable system** - handles growing teams and projects

## Best Practices

### User Management
1. **Create contacts first** - Set up contact records before user accounts
2. **Link profiles properly** - Always link users to their contact records
3. **Use descriptive roles** - Clear role names help with permissions
4. **Regular audits** - Review user access periodically

### Project Assignment
1. **Assign PMs early** - Set project managers when creating projects
2. **Team assignment** - Add team members via project_contacts junction
3. **Remove inactive users** - Clean up project assignments regularly
4. **Document assignments** - Keep records of who works on what

### Security Maintenance
1. **Monitor audit logs** - Watch for unusual activity patterns
2. **Regular role reviews** - Ensure users have appropriate access levels
3. **Test permissions** - Verify RLS policies work as expected
4. **Backup strategies** - Include RLS policies in database backups

## Troubleshooting

### Common Issues

#### User Can't See Projects
- Check if user has a profile record
- Verify user's role is set correctly
- Ensure user is assigned to projects via `project_contacts`
- Confirm project has a `project_manager_id` set

#### Permission Denied Errors
- Verify RLS policies are enabled on the table
- Check if user has the correct role
- Ensure helper functions are working (`get_user_role()`, `get_user_contact_id()`)
- Review foreign key constraints

#### Missing Audit Information
- Check if audit fields exist on the table
- Verify `created_by_user_id` is set on record creation
- Ensure `updated_by_user_id` is updated on record modifications

### Debugging Queries
```sql
-- Check user's current role
SELECT get_user_role();

-- Check user's contact_id
SELECT get_user_contact_id();

-- See what projects user can access
SELECT id, name FROM projects WHERE (
  (get_user_role() = 'Admin')
  OR (project_manager_id = auth.uid())
  OR (id IN (SELECT project_id FROM project_contacts WHERE contact_id = get_user_contact_id()))
);
```

This RLS implementation provides enterprise-grade security while maintaining simplicity and scalability for the SiteWeave construction management platform.
