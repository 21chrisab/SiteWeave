  # Backfill Project Creators - Fix Missing Team Members

## Problem

Project creators are not showing up on their project teams because:
1. The `auto_add_project_creator` trigger may not have been active when projects were created
2. Some profiles don't have a `contact_id`
3. Old projects don't have the creator in `project_contacts`

## Solution

Run these SQL scripts **in order** in Supabase SQL Editor:

### Step 1: Fix Missing contact_ids

Run `apps/web/scripts/fix-missing-contact-ids.sql`

This ensures all users have a `contact_id` so they can be added to projects.

### Step 2: Backfill Project Creators

Run `apps/web/scripts/backfill-project-creators.sql`

This adds all project creators to their respective projects.

### Step 3: Verify Trigger is Active

Check that the trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_add_project_creator';
```

If it doesn't exist, run the trigger creation from `schema.sql` (lines ~894-897).

## What This Fixes

✅ **All existing projects** - Creators are now on their project teams
✅ **Future projects** - Trigger automatically adds creators
✅ **No email required** - People are added immediately (email is just notification)
✅ **Owner always visible** - Project creator always shows in team list

## Testing

1. Check your existing projects - you should see yourself in the team
2. Create a new project - you should automatically be on the team
3. Add someone to a project - they should appear immediately (no waiting for email)

## How It Works Now

### When Creating a Project:
1. User creates project with `created_by_user_id` = their ID
2. **Trigger automatically runs** and adds creator to `project_contacts`
3. Creator immediately sees project and is on the team

### When Adding People:
1. Contact is created or found by email
2. **Immediately added** to `project_contacts`
3. Email sent as **notification only** (not for acceptance)
4. Person shows up on team right away

No acceptance needed - it's like Slack, not like GitHub where you accept invites!
