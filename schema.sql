-- SiteWeave Database Schema
-- Complete production schema with RLS implementation
-- This is the single source of truth for the database structure

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

-- Projects Table (Main entity)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    status TEXT,
    status_color TEXT,
    project_type TEXT,
    due_date DATE,
    next_milestone TEXT,
    milestones JSONB,
    notification_count INTEGER DEFAULT 0,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    type TEXT NOT NULL,
    company TEXT,
    trade TEXT,
    status TEXT DEFAULT 'Available',
    avatar_url TEXT,
    email TEXT,
    phone TEXT
);

-- Profiles Table (Links auth.users to contacts and stores roles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Team' CHECK (role IN ('Admin', 'PM', 'Team')),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    title TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    color TEXT,
    description TEXT,
    category TEXT DEFAULT 'other',
    location TEXT,
    attendees TEXT,
    is_all_day BOOLEAN DEFAULT false,
    recurrence TEXT,
    user_id UUID,
    external_id TEXT,
    external_source TEXT
);

-- Event Categories Table
CREATE TABLE IF NOT EXISTS event_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    name TEXT NOT NULL,
    type TEXT,
    file_url TEXT,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    size_kb INTEGER
);

-- Issue Comments Table
CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER,
    step_id INTEGER,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'comment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Issue Files Table
CREATE TABLE IF NOT EXISTS issue_files (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER,
    step_id INTEGER,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_kb INTEGER,
    uploaded_by_user_id UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Issue Steps Table
CREATE TABLE IF NOT EXISTS issue_steps (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER,
    step_order INTEGER NOT NULL,
    description TEXT NOT NULL,
    assigned_to_user_id UUID,
    assigned_to_name VARCHAR(255) NOT NULL,
    assigned_to_role VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_user_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_to_contact_id UUID
);

-- Message Channels Table
CREATE TABLE IF NOT EXISTS message_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name TEXT NOT NULL
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID,
    user_id UUID,
    topic TEXT NOT NULL,
    extension TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    payload JSONB,
    file_name TEXT,
    event TEXT,
    type TEXT DEFAULT 'text',
    private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    inserted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- Project Contacts Junction Table
CREATE TABLE IF NOT EXISTS project_contacts (
    project_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    PRIMARY KEY (project_id, contact_id)
);

-- Project Issues Table
CREATE TABLE IF NOT EXISTS project_issues (
    id SERIAL PRIMARY KEY,
    project_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    current_step_id INTEGER,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    due_date DATE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id UUID REFERENCES auth.users(id)
);

-- Project Phases Table
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    budget NUMERIC DEFAULT 0,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    text TEXT NOT NULL,
    due_date DATE,
    priority TEXT,
    completed BOOLEAN DEFAULT false,
    assignee_id UUID,
    recurrence TEXT,
    parent_task_id UUID REFERENCES tasks(id),
    is_recurring_instance BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity Log Table (for tracking user actions)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'project', 'task', 'file', 'message', 'issue', etc.
    entity_id UUID,
    entity_name TEXT, -- Human-readable name of the entity
    project_id UUID REFERENCES projects(id),
    details JSONB, -- Additional context about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invitations Table (for inviting external users to projects and tasks)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    project_id UUID,
    issue_id INTEGER,
    step_id INTEGER,
    invited_by_user_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invitation_token TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add email and phone columns to contacts table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'email') THEN
        ALTER TABLE contacts ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'phone') THEN
        ALTER TABLE contacts ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'created_by_user_id') THEN
        ALTER TABLE contacts ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add missing columns to messages table (if they don't exist)
DO $$ 
BEGIN
    -- Add topic column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                     AND table_name = 'messages' 
                     AND column_name = 'topic') THEN
        -- Add as nullable first to handle existing rows
        ALTER TABLE messages ADD COLUMN topic TEXT;
        -- Update existing rows with default value
        UPDATE messages SET topic = 'General' WHERE topic IS NULL;
        -- Now make it NOT NULL with default
        ALTER TABLE messages ALTER COLUMN topic SET NOT NULL;
        ALTER TABLE messages ALTER COLUMN topic SET DEFAULT '';
    END IF;
    
    -- Add extension column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                     AND table_name = 'messages' 
                     AND column_name = 'extension') THEN
        -- Add as nullable first to handle existing rows
        ALTER TABLE messages ADD COLUMN extension TEXT;
        -- Update existing rows with default value
        UPDATE messages SET extension = 'txt' WHERE extension IS NULL;
        -- Now make it NOT NULL with default
        ALTER TABLE messages ALTER COLUMN extension SET NOT NULL;
        ALTER TABLE messages ALTER COLUMN extension SET DEFAULT 'txt';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                     AND table_name = 'messages' 
                     AND column_name = 'updated_at') THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
    END IF;
    
    -- Add inserted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                     AND table_name = 'messages' 
                     AND column_name = 'inserted_at') THEN
        ALTER TABLE messages ADD COLUMN inserted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;

-- ============================================================================
-- ADD AUDIT FIELDS TO EXISTING TABLES
-- ============================================================================

-- Add RLS audit fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Add RLS audit fields to calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add external calendar sync fields
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_source TEXT;

-- Add RLS audit fields to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add RLS audit fields to issue_steps table
ALTER TABLE issue_steps ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE issue_steps ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Add recurrence fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT false;

-- Add workflow steps to tasks table (stored as JSONB)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workflow_steps JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_workflow_step INTEGER DEFAULT 1;

-- ============================================================================
-- DATA CLEANUP BEFORE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Clean up invalid user_id references before adding foreign key constraints
-- Set invalid user_id values to NULL to avoid foreign key violations

-- Clean calendar_events user_id references
UPDATE calendar_events 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Clean issue_comments user_id references
UPDATE issue_comments 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Clean issue_files uploaded_by_user_id references
UPDATE issue_files 
SET uploaded_by_user_id = NULL 
WHERE uploaded_by_user_id IS NOT NULL 
  AND uploaded_by_user_id NOT IN (SELECT id FROM auth.users);

-- Clean issue_steps assigned_to_user_id references
UPDATE issue_steps 
SET assigned_to_user_id = NULL 
WHERE assigned_to_user_id IS NOT NULL 
  AND assigned_to_user_id NOT IN (SELECT id FROM auth.users);

-- Clean issue_steps completed_by_user_id references
UPDATE issue_steps 
SET completed_by_user_id = NULL 
WHERE completed_by_user_id IS NOT NULL 
  AND completed_by_user_id NOT IN (SELECT id FROM auth.users);

-- Clean messages user_id references
UPDATE messages 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Clean project_issues created_by_user_id references
UPDATE project_issues 
SET created_by_user_id = NULL 
WHERE created_by_user_id IS NOT NULL 
  AND created_by_user_id NOT IN (SELECT id FROM auth.users);

-- Clean tasks assignee_id references
UPDATE tasks 
SET assignee_id = NULL 
WHERE assignee_id IS NOT NULL 
  AND assignee_id NOT IN (SELECT id FROM auth.users);

-- Clean user_preferences user_id references
UPDATE user_preferences 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Projects constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_project_manager') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_project_manager FOREIGN KEY (project_manager_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_created_by') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_updated_by') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Profiles constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_contact') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_contact FOREIGN KEY (contact_id) REFERENCES contacts(id);
    END IF;
END $$;

-- Contacts constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contacts_created_by') THEN
        ALTER TABLE contacts ADD CONSTRAINT fk_contacts_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Calendar events constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_project_id') THEN
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_user_id') THEN
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_created_by') THEN
        ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_updated_by') THEN
        ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Files constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_files_project_id') THEN
ALTER TABLE files ADD CONSTRAINT fk_files_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_files_created_by') THEN
        ALTER TABLE files ADD CONSTRAINT fk_files_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_files_updated_by') THEN
        ALTER TABLE files ADD CONSTRAINT fk_files_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Issue comments constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_comments_issue_id') THEN
ALTER TABLE issue_comments ADD CONSTRAINT fk_issue_comments_issue_id FOREIGN KEY (issue_id) REFERENCES project_issues(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_comments_step_id') THEN
ALTER TABLE issue_comments ADD CONSTRAINT fk_issue_comments_step_id FOREIGN KEY (step_id) REFERENCES issue_steps(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_comments_user_id') THEN
ALTER TABLE issue_comments ADD CONSTRAINT fk_issue_comments_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Issue files constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_files_issue_id') THEN
ALTER TABLE issue_files ADD CONSTRAINT fk_issue_files_issue_id FOREIGN KEY (issue_id) REFERENCES project_issues(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_files_step_id') THEN
ALTER TABLE issue_files ADD CONSTRAINT fk_issue_files_step_id FOREIGN KEY (step_id) REFERENCES issue_steps(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_files_uploaded_by') THEN
ALTER TABLE issue_files ADD CONSTRAINT fk_issue_files_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Issue steps constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_steps_issue_id') THEN
ALTER TABLE issue_steps ADD CONSTRAINT fk_issue_steps_issue_id FOREIGN KEY (issue_id) REFERENCES project_issues(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_steps_assigned_to_user') THEN
ALTER TABLE issue_steps ADD CONSTRAINT fk_issue_steps_assigned_to_user FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_steps_assigned_to_contact') THEN
ALTER TABLE issue_steps ADD CONSTRAINT fk_issue_steps_assigned_to_contact FOREIGN KEY (assigned_to_contact_id) REFERENCES contacts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_steps_created_by') THEN
        ALTER TABLE issue_steps ADD CONSTRAINT fk_issue_steps_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_issue_steps_updated_by') THEN
        ALTER TABLE issue_steps ADD CONSTRAINT fk_issue_steps_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Message channels constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_channels_project_id') THEN
ALTER TABLE message_channels ADD CONSTRAINT fk_message_channels_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Messages constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_channel_id') THEN
        ALTER TABLE messages ADD CONSTRAINT fk_messages_channel_id FOREIGN KEY (channel_id) REFERENCES message_channels(id) ON DELETE CASCADE;
    END IF;
    -- Drop and recreate the user_id constraint to ensure it references auth.users, not contacts
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_user_id') THEN
        ALTER TABLE messages DROP CONSTRAINT fk_messages_user_id;
    END IF;
    -- Also drop if it exists with the default PostgreSQL naming
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
    -- Recreate the constraint to reference auth.users(id)
    ALTER TABLE messages ADD CONSTRAINT fk_messages_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);
END $$;

-- Message reactions constraints
DO $$ 
DECLARE
    message_id_type TEXT;
    message_reactions_exists BOOLEAN;
BEGIN
    -- Check if message_reactions table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_reactions'
    ) INTO message_reactions_exists;
    
    -- Only proceed if table exists
    IF message_reactions_exists THEN
        -- Get the actual data type of messages.id column
        SELECT data_type INTO message_id_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'messages'
          AND column_name = 'id';
        
        -- Add constraints only if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_reactions_message_id') THEN
            ALTER TABLE message_reactions ADD CONSTRAINT fk_message_reactions_message_id FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_reactions_user_id') THEN
            ALTER TABLE message_reactions ADD CONSTRAINT fk_message_reactions_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Project contacts constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_contacts_project_id') THEN
ALTER TABLE project_contacts ADD CONSTRAINT fk_project_contacts_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_contacts_contact_id') THEN
ALTER TABLE project_contacts ADD CONSTRAINT fk_project_contacts_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id);
    END IF;
END $$;

-- Project issues constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_issues_project_id') THEN
ALTER TABLE project_issues ADD CONSTRAINT fk_project_issues_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_issues_current_step') THEN
ALTER TABLE project_issues ADD CONSTRAINT fk_project_issues_current_step FOREIGN KEY (current_step_id) REFERENCES issue_steps(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_issues_created_by') THEN
        ALTER TABLE project_issues ADD CONSTRAINT fk_project_issues_created_by FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Project phases constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_phases_project_id') THEN
        ALTER TABLE project_phases ADD CONSTRAINT fk_project_phases_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Tasks constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_project_id') THEN
        ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    -- Drop and recreate the assignee_id constraint to ensure it references contacts, not users
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_assignee_id') THEN
        ALTER TABLE tasks DROP CONSTRAINT fk_tasks_assignee_id;
    END IF;
    -- Also drop if it exists with the default PostgreSQL naming
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
    -- Recreate the constraint to reference contacts(id)
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignee_id FOREIGN KEY (assignee_id) REFERENCES contacts(id);
END $$;

-- User preferences constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_preferences_user_id') THEN
        ALTER TABLE user_preferences ADD CONSTRAINT fk_user_preferences_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Activity log constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_log_user_id') THEN
        ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
    -- Drop and recreate the project_id constraint with CASCADE to allow project deletion
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_log_project_id') THEN
        ALTER TABLE activity_log DROP CONSTRAINT fk_activity_log_project_id;
    END IF;
    ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
END $$;

-- Invitations constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_project_id') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_issue_id') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_issue_id FOREIGN KEY (issue_id) REFERENCES project_issues(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_step_id') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_step_id FOREIGN KEY (step_id) REFERENCES issue_steps(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_invited_by') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Gets the role of the currently logged-in user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Gets the contact_id of the currently logged-in user
CREATE OR REPLACE FUNCTION get_user_contact_id()
RETURNS UUID AS $$
  SELECT contact_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  contact_uuid UUID;
BEGIN
  -- Attempt to find an existing contact by email and link it
  SELECT id INTO contact_uuid
  FROM public.contacts
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  INSERT INTO public.profiles (id, role, contact_id)
  VALUES (NEW.id, 'Team', contact_uuid);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROLE AND STRUCTURE UPDATES FOR SHARING MODEL
-- ============================================================================

-- Ensure profiles.role allows 'Client'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'PM', 'Team', 'Client'));

-- Add optional per-project role on project_contacts
ALTER TABLE project_contacts ADD COLUMN IF NOT EXISTS role TEXT;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can see projects based on their role" ON public.projects;
DROP POLICY IF EXISTS "Only admins can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs can create projects" ON public.projects;
DROP POLICY IF EXISTS "All authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins, PMs, and creators can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Users can see their own profile and admins see all" ON public.profiles;
DROP POLICY IF EXISTS "Users can see their own profile" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated users can see profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only system can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile, admins can update any" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;

-- Explicitly disable RLS on profiles to prevent infinite recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Only admins can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Only admins can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Only admins can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

DROP POLICY IF EXISTS "Users can see events for projects they have access to" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create events for accessible projects" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update events for accessible projects" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete events for accessible projects" ON public.calendar_events;

DROP POLICY IF EXISTS "All authenticated users can view event categories" ON public.event_categories;
DROP POLICY IF EXISTS "Only admins can create event categories" ON public.event_categories;
DROP POLICY IF EXISTS "Only admins can update event categories" ON public.event_categories;
DROP POLICY IF EXISTS "Only admins can delete event categories" ON public.event_categories;

DROP POLICY IF EXISTS "Users can see files for projects they have access to" ON public.files;
DROP POLICY IF EXISTS "Users can upload files to accessible projects" ON public.files;
DROP POLICY IF EXISTS "Users can update files for accessible projects" ON public.files;
DROP POLICY IF EXISTS "Users can delete files for accessible projects" ON public.files;

DROP POLICY IF EXISTS "Users can see comments for accessible projects" ON public.issue_comments;
DROP POLICY IF EXISTS "Users can create comments for accessible projects" ON public.issue_comments;
DROP POLICY IF EXISTS "Users can update their own comments or admins/PMs can update any" ON public.issue_comments;
DROP POLICY IF EXISTS "Users can delete their own comments within 15 minutes or admins/PMs can delete any" ON public.issue_comments;

DROP POLICY IF EXISTS "Users can see issue files for accessible projects" ON public.issue_files;
DROP POLICY IF EXISTS "Users can upload issue files for accessible projects" ON public.issue_files;
DROP POLICY IF EXISTS "Users can update issue files for accessible projects" ON public.issue_files;
DROP POLICY IF EXISTS "Users can delete issue files for accessible projects" ON public.issue_files;

DROP POLICY IF EXISTS "Users can see issue steps for accessible projects" ON public.issue_steps;
DROP POLICY IF EXISTS "Users can create issue steps for accessible projects" ON public.issue_steps;
DROP POLICY IF EXISTS "Users can update their assigned steps or admins/PMs can update any" ON public.issue_steps;
DROP POLICY IF EXISTS "Admins and PMs can delete issue steps" ON public.issue_steps;

DROP POLICY IF EXISTS "Users can see channels for projects they have access to" ON public.message_channels;
DROP POLICY IF EXISTS "Users can create channels for accessible projects" ON public.message_channels;
DROP POLICY IF EXISTS "Users can update channels for accessible projects" ON public.message_channels;
DROP POLICY IF EXISTS "Users can delete channels for accessible projects" ON public.message_channels;

DROP POLICY IF EXISTS "Users can see messages for accessible projects" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages for accessible projects" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages or admins/PMs can update any" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages or admins/PMs can delete any" ON public.messages;

DROP POLICY IF EXISTS "Users can see reactions for accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can create reactions for accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;

DROP POLICY IF EXISTS "Users can see project contacts for accessible projects" ON public.project_contacts;
DROP POLICY IF EXISTS "Admins and PMs can assign contacts to projects" ON public.project_contacts;
DROP POLICY IF EXISTS "Admins and PMs can update project contacts" ON public.project_contacts;
DROP POLICY IF EXISTS "Admins and PMs can remove contacts from projects" ON public.project_contacts;

DROP POLICY IF EXISTS "Users can see issues for projects they have access to" ON public.project_issues;
DROP POLICY IF EXISTS "Users can create issues for accessible projects" ON public.project_issues;
DROP POLICY IF EXISTS "Users can update issues for accessible projects" ON public.project_issues;
DROP POLICY IF EXISTS "Admins and PMs can delete issues" ON public.project_issues;
DROP POLICY IF EXISTS "Admins, PMs, and creators can delete issues" ON public.project_issues;

DROP POLICY IF EXISTS "Users can see phases for projects they have access to" ON public.project_phases;
DROP POLICY IF EXISTS "Users can create phases for accessible projects" ON public.project_phases;
DROP POLICY IF EXISTS "Users can update phases for accessible projects" ON public.project_phases;
DROP POLICY IF EXISTS "Users can delete phases for accessible projects" ON public.project_phases;

DROP POLICY IF EXISTS "Users can see tasks for projects they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for accessible projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks or admins/PMs can update any" ON public.tasks;
DROP POLICY IF EXISTS "Admins and PMs can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins, PMs, and creators can delete tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can only see their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

DROP POLICY IF EXISTS "Users can see activity for projects they have access to" ON public.activity_log;
DROP POLICY IF EXISTS "Users can create activity logs for accessible projects" ON public.activity_log;
DROP POLICY IF EXISTS "Users can update their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can delete their own activity logs" ON public.activity_log;

DROP POLICY IF EXISTS "Users can see invitations they sent or received" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update their sent invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can delete their sent invitations" ON public.invitations;

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- DISABLED to prevent infinite recursion
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Projects SELECT policy
CREATE POLICY "Users can see projects based on their role"
ON public.projects
FOR SELECT
USING (
  (get_user_role() = 'Admin') -- Admins see all
  OR
  (project_manager_id = auth.uid()) -- PMs see their projects
  OR
  (created_by_user_id = auth.uid()) -- creators can see their projects
  OR
  (id IN ( -- Team members see projects they are linked to
      SELECT project_id
      FROM public.project_contacts
      WHERE contact_id = get_user_contact_id()
    )
  )
);

-- Projects INSERT policy
CREATE POLICY "All authenticated users can create projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Projects UPDATE policy
CREATE POLICY "Admins and PMs can update projects"
ON public.projects
FOR UPDATE
USING (
  (get_user_role() = 'Admin')
  OR
  (project_manager_id = auth.uid())
);

-- Projects DELETE policy
CREATE POLICY "Admins, PMs, and creators can delete projects"
ON public.projects
FOR DELETE
USING (
  (get_user_role() = 'Admin')
  OR
  (project_manager_id = auth.uid())
  OR
  (created_by_user_id = auth.uid())
);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- ALL PROFILES POLICIES DISABLED TO PREVENT INFINITE RECURSION
-- The profiles table is used by helper functions in other RLS policies,
-- so it cannot have RLS enabled without causing circular dependencies.

-- Profiles SELECT policy - DISABLED
-- CREATE POLICY "All authenticated users can see profiles"
-- ON public.profiles FOR SELECT
-- USING (auth.uid() IS NOT NULL);

-- Profiles INSERT policy - DISABLED
-- CREATE POLICY "Users can create their own profile"
-- ON public.profiles FOR INSERT
-- WITH CHECK (id = auth.uid());

-- Profiles UPDATE policy - DISABLED
-- CREATE POLICY "Users can update their own profile, admins can update any"
-- ON public.profiles FOR UPDATE
-- USING ((id = auth.uid()) OR (get_user_role() = 'Admin'));

-- Profiles DELETE policy - DISABLED
-- CREATE POLICY "Only admins can delete profiles"
-- ON public.profiles FOR DELETE
-- USING (get_user_role() = 'Admin');

-- ============================================================================
-- CONTACTS TABLE POLICIES
-- ============================================================================

-- Contacts SELECT policy
CREATE POLICY "Users can view their own contacts"
ON public.contacts
FOR SELECT
USING (created_by_user_id = auth.uid());

-- Contacts INSERT policy
CREATE POLICY "Authenticated users can create contacts"
ON public.contacts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Contacts UPDATE policy
CREATE POLICY "Users can update their own contacts"
ON public.contacts
FOR UPDATE
USING (created_by_user_id = auth.uid());

-- Contacts DELETE policy
CREATE POLICY "Users can delete their own contacts"
ON public.contacts
FOR DELETE
USING (created_by_user_id = auth.uid());

-- ============================================================================
-- CALENDAR EVENTS TABLE POLICIES
-- ============================================================================

-- Calendar events SELECT policy
CREATE POLICY "Users can see events for projects they have access to"
ON public.calendar_events
FOR SELECT
USING (
  (project_id IS NULL AND (user_id = auth.uid()))
  OR
  (project_id IN (SELECT id FROM public.projects))
);

-- Calendar events INSERT policy
CREATE POLICY "Users can create events for accessible projects"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  (project_id IS NULL AND (user_id = auth.uid()))
  OR
  (project_id IN (SELECT id FROM public.projects))
);

-- Calendar events UPDATE policy
CREATE POLICY "Users can update events for accessible projects"
ON public.calendar_events
FOR UPDATE
USING (
  (project_id IS NULL AND (user_id = auth.uid()))
  OR
  (project_id IN (SELECT id FROM public.projects))
);

-- Calendar events DELETE policy
CREATE POLICY "Users can delete events for accessible projects"
ON public.calendar_events
FOR DELETE
USING (
  (project_id IS NULL AND (user_id = auth.uid()))
  OR
  (project_id IN (SELECT id FROM public.projects))
);

-- ============================================================================
-- EVENT CATEGORIES TABLE POLICIES
-- ============================================================================

-- Event categories SELECT policy
CREATE POLICY "All authenticated users can view event categories"
ON public.event_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Event categories INSERT policy
CREATE POLICY "Only admins can create event categories"
ON public.event_categories
FOR INSERT
WITH CHECK (get_user_role() = 'Admin');

-- Event categories UPDATE policy
CREATE POLICY "Only admins can update event categories"
ON public.event_categories
FOR UPDATE
USING (get_user_role() = 'Admin');

-- Event categories DELETE policy
CREATE POLICY "Only admins can delete event categories"
ON public.event_categories
FOR DELETE
USING (get_user_role() = 'Admin');

-- ============================================================================
-- FILES TABLE POLICIES
-- ============================================================================

-- Files SELECT policy
CREATE POLICY "Users can see files for projects they have access to"
ON public.files
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Files INSERT policy
CREATE POLICY "Users can upload files to accessible projects"
ON public.files
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Files UPDATE policy
CREATE POLICY "Users can update files for accessible projects"
ON public.files
FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Files DELETE policy
CREATE POLICY "Users can delete files for accessible projects"
ON public.files
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin' OR created_by_user_id = auth.uid()
  )
);

-- ============================================================================
-- ISSUE COMMENTS TABLE POLICIES
-- ============================================================================

-- Issue comments SELECT policy
CREATE POLICY "Users can see comments for accessible projects"
ON public.issue_comments
FOR SELECT
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue comments INSERT policy
CREATE POLICY "Users can create comments for accessible projects"
ON public.issue_comments
FOR INSERT
WITH CHECK (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue comments UPDATE policy
CREATE POLICY "Users can update their own comments or admins/PMs can update any"
ON public.issue_comments
FOR UPDATE
USING (
  (user_id = auth.uid()) -- Own comments
  OR
  (issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  ))
);

-- Issue comments DELETE policy
CREATE POLICY "Users can delete their own comments within 15 minutes or admins/PMs can delete any"
ON public.issue_comments
FOR DELETE
USING (
  (user_id = auth.uid() AND created_at > NOW() - INTERVAL '15 minutes') -- Own recent comments
  OR
  (issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  ))
);

-- ============================================================================
-- ISSUE FILES TABLE POLICIES
-- ============================================================================

-- Issue files SELECT policy
CREATE POLICY "Users can see issue files for accessible projects"
ON public.issue_files
FOR SELECT
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue files INSERT policy
CREATE POLICY "Users can upload issue files for accessible projects"
ON public.issue_files
FOR INSERT
WITH CHECK (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue files UPDATE policy
CREATE POLICY "Users can update issue files for accessible projects"
ON public.issue_files
FOR UPDATE
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue files DELETE policy
CREATE POLICY "Users can delete issue files for accessible projects"
ON public.issue_files
FOR DELETE
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- ============================================================================
-- ISSUE STEPS TABLE POLICIES
-- ============================================================================

-- Issue steps SELECT policy
CREATE POLICY "Users can see issue steps for accessible projects"
ON public.issue_steps
FOR SELECT
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue steps INSERT policy
CREATE POLICY "Users can create issue steps for accessible projects"
ON public.issue_steps
FOR INSERT
WITH CHECK (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (SELECT id FROM public.projects)
  )
);

-- Issue steps UPDATE policy
CREATE POLICY "Users can update their assigned steps or admins/PMs can update any"
ON public.issue_steps
FOR UPDATE
USING (
  (assigned_to_user_id = auth.uid()) -- Own assigned steps
  OR
  (issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  ))
);

-- Issue steps DELETE policy
CREATE POLICY "Admins and PMs can delete issue steps"
ON public.issue_steps
FOR DELETE
USING (
  issue_id IN (
    SELECT pi.id 
    FROM public.project_issues pi 
    WHERE pi.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  )
);

-- ============================================================================
-- MESSAGE CHANNELS TABLE POLICIES
-- ============================================================================

-- Message channels SELECT policy
CREATE POLICY "Users can see channels for projects they have access to"
ON public.message_channels
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Message channels INSERT policy
CREATE POLICY "Users can create channels for accessible projects"
ON public.message_channels
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Message channels UPDATE policy
CREATE POLICY "Users can update channels for accessible projects"
ON public.message_channels
FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Message channels DELETE policy
CREATE POLICY "Users can delete channels for accessible projects"
ON public.message_channels
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin' OR created_by_user_id = auth.uid()
  )
);

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Messages SELECT policy
CREATE POLICY "Users can see messages for accessible projects"
ON public.messages
FOR SELECT
USING (
  channel_id IN (
    SELECT mc.id 
    FROM public.message_channels mc 
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

-- Messages INSERT policy
CREATE POLICY "Users can create messages for accessible projects"
ON public.messages
FOR INSERT
WITH CHECK (
  channel_id IN (
    SELECT mc.id 
    FROM public.message_channels mc 
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

-- Messages UPDATE policy
CREATE POLICY "Users can update their own messages or admins/PMs can update any"
ON public.messages
FOR UPDATE
USING (
  (user_id = auth.uid()) -- Own messages
  OR
  (channel_id IN (
    SELECT mc.id 
    FROM public.message_channels mc 
    WHERE mc.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  ))
);

-- Messages DELETE policy
CREATE POLICY "Users can delete their own messages or admins/PMs can delete any"
ON public.messages
FOR DELETE
USING (
  (user_id = auth.uid()) -- Own messages
  OR
  (channel_id IN (
    SELECT mc.id 
    FROM public.message_channels mc 
    WHERE mc.project_id IN (
      SELECT id FROM public.projects 
      WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
    )
  ))
);

-- ============================================================================
-- MESSAGE REACTIONS TABLE POLICIES
-- ============================================================================

-- Message reactions SELECT policy
CREATE POLICY "Users can see reactions for accessible messages"
ON public.message_reactions
FOR SELECT
USING (
  message_id IN (
    SELECT m.id 
    FROM public.messages m
    JOIN public.message_channels mc ON m.channel_id = mc.id
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

-- Message reactions INSERT policy
CREATE POLICY "Users can create reactions for accessible messages"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  message_id IN (
    SELECT m.id 
    FROM public.messages m
    JOIN public.message_channels mc ON m.channel_id = mc.id
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

-- Message reactions DELETE policy
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- PROJECT CONTACTS TABLE POLICIES
-- ============================================================================

-- Project contacts SELECT policy
-- Avoid referencing projects in USING to prevent recursive policy evaluation
CREATE POLICY "Users can see project contacts for accessible projects"
ON public.project_contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Project contacts INSERT policy
CREATE POLICY "Admins and PMs can assign contacts to projects"
ON public.project_contacts
FOR INSERT
WITH CHECK (
  (get_user_role() = 'Admin')
  OR
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid()
  ))
);

-- Project contacts UPDATE policy
CREATE POLICY "Admins and PMs can update project contacts"
ON public.project_contacts
FOR UPDATE
USING (
  (get_user_role() = 'Admin')
  OR
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid()
  ))
);

-- Project contacts DELETE policy
CREATE POLICY "Admins and PMs can remove contacts from projects"
ON public.project_contacts
FOR DELETE
USING (
  (get_user_role() = 'Admin')
  OR
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid()
  ))
);

-- ============================================================================
-- PROJECT ISSUES TABLE POLICIES
-- ============================================================================

-- Project issues SELECT policy
CREATE POLICY "Users can see issues for projects they have access to"
ON public.project_issues
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Project issues INSERT policy
CREATE POLICY "Users can create issues for accessible projects"
ON public.project_issues
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Project issues UPDATE policy
CREATE POLICY "Users can update issues for accessible projects"
ON public.project_issues
FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Project issues DELETE policy
CREATE POLICY "Admins, PMs, and creators can delete issues"
ON public.project_issues
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin' OR created_by_user_id = auth.uid()
  )
);

-- ============================================================================
-- PROJECT PHASES TABLE POLICIES
-- ============================================================================

-- Project phases SELECT policy
CREATE POLICY "Users can see phases for projects they have access to"
ON public.project_phases
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Project phases INSERT policy
CREATE POLICY "Users can create phases for accessible projects"
ON public.project_phases
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Project phases UPDATE policy
CREATE POLICY "Users can update phases for accessible projects"
ON public.project_phases
FOR UPDATE
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Project phases DELETE policy
CREATE POLICY "Users can delete phases for accessible projects"
ON public.project_phases
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin' OR created_by_user_id = auth.uid()
  )
);

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

-- Tasks SELECT policy
CREATE POLICY "Users can see tasks for projects they have access to"
ON public.tasks
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Tasks INSERT policy
CREATE POLICY "Users can create tasks for accessible projects"
ON public.tasks
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Tasks UPDATE policy
CREATE POLICY "Users can update their assigned tasks or admins/PMs can update any"
ON public.tasks
FOR UPDATE
USING (
  (assignee_id = auth.uid()) -- Own assigned tasks
  OR
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin'
  ))
);

-- Tasks DELETE policy
CREATE POLICY "Admins, PMs, and creators can delete tasks"
ON public.tasks
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid() OR get_user_role() = 'Admin' OR created_by_user_id = auth.uid()
  )
);

-- ============================================================================
-- USER PREFERENCES TABLE POLICIES
-- ============================================================================

-- User preferences SELECT policy
CREATE POLICY "Users can only see their own preferences"
ON public.user_preferences
FOR SELECT
USING (user_id = auth.uid());

-- User preferences INSERT policy
CREATE POLICY "Users can create their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- User preferences UPDATE policy
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (user_id = auth.uid());

-- User preferences DELETE policy
CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- ACTIVITY LOG TABLE POLICIES
-- ============================================================================

-- Activity log SELECT policy
CREATE POLICY "Users can see activity for projects they have access to"
ON public.activity_log
FOR SELECT
USING (
  project_id IN (SELECT id FROM public.projects)
);

-- Activity log INSERT policy
CREATE POLICY "Users can create activity logs for accessible projects"
ON public.activity_log
FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects)
);

-- Activity log UPDATE policy (rarely used, but allow users to update their own logs)
CREATE POLICY "Users can update their own activity logs"
ON public.activity_log
FOR UPDATE
USING (user_id = auth.uid());

-- Activity log DELETE policy (rarely used, but allow users to delete their own logs)
CREATE POLICY "Users can delete their own activity logs"
ON public.activity_log
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- INVITATIONS TABLE POLICIES
-- ============================================================================

-- Invitations SELECT policy
CREATE POLICY "Users can see invitations they sent or received"
ON public.invitations
FOR SELECT
USING (
  (invited_by_user_id = auth.uid()) -- Invitations they sent
  OR
  (email IN (SELECT email FROM auth.users WHERE id = auth.uid())) -- Invitations to their email
);

-- Invitations INSERT policy
CREATE POLICY "Authenticated users can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    invited_by_user_id = auth.uid() -- Can only create invitations as themselves
  )
);

-- Invitations UPDATE policy
CREATE POLICY "Users can update their sent invitations"
ON public.invitations
FOR UPDATE
USING (invited_by_user_id = auth.uid())
WITH CHECK (invited_by_user_id = auth.uid());

-- Invitations DELETE policy
CREATE POLICY "Users can delete their sent invitations"
ON public.invitations
FOR DELETE
USING (invited_by_user_id = auth.uid());

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_step_id ON issue_comments(step_id);
CREATE INDEX IF NOT EXISTS idx_issue_files_issue_id ON issue_files(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_files_step_id ON issue_files(step_id);
CREATE INDEX IF NOT EXISTS idx_issue_steps_issue_id ON issue_steps(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_steps_status ON issue_steps(status);
CREATE INDEX IF NOT EXISTS idx_issue_steps_assigned_to_user ON issue_steps(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_message_channels_project_id ON message_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON project_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_status ON project_issues(status);
CREATE INDEX IF NOT EXISTS idx_project_issues_priority ON project_issues(priority);

-- RLS-specific indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_contact_id ON profiles(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_project_id ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_contact_id ON project_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Audit field indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by ON files(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_issue_steps_created_by ON issue_steps(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_created_by ON project_issues(created_by_user_id);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_project_id ON invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by_user_id);