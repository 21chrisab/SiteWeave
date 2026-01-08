-- Demo Account Seed Script for App Store Reviewers
-- Creates a permanent "Demo Organization" and "Demo User" for testing

-- ============================================================================
-- CREATE DEMO ORGANIZATION
-- ============================================================================

DO $$
DECLARE
    demo_org_id UUID;
    demo_user_id UUID;
    demo_role_id UUID;
    demo_contact_id UUID;
BEGIN
    -- Create Demo Organization
    INSERT INTO organizations (name, slug, created_at, updated_at)
    VALUES ('SiteWeave Demo', 'demo', now(), now())
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO demo_org_id;
    
    -- If organization already exists, get its ID
    IF demo_org_id IS NULL THEN
        SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo';
    END IF;
    
    -- ========================================================================
    -- CREATE DEMO USER (via Supabase Auth - this requires manual creation)
    -- ========================================================================
    -- Note: User must be created via Supabase Auth API or Dashboard first
    -- This script assumes the user exists in auth.users with email: demo@siteweave.app
    -- After creating the user, run this script to link them to the demo organization
    
    -- Get demo user ID (if exists)
    SELECT id INTO demo_user_id 
    FROM auth.users 
    WHERE email = 'demo@siteweave.app' 
    LIMIT 1;
    
    -- If user doesn't exist, you'll need to create it via Supabase Auth first
    -- For now, we'll create a placeholder that will be updated when user is created
    
    -- ========================================================================
    -- CREATE ORGANIZATION ADMIN ROLE
    -- ========================================================================
    
    INSERT INTO roles (organization_id, name, permissions, is_system_role, created_at, updated_at)
    VALUES (
        demo_org_id,
        'OrganizationAdmin',
        '{
            "can_create_tasks": true,
            "can_view_financials": true,
            "can_manage_users": true,
            "can_delete_projects": true,
            "can_assign_tasks": true,
            "can_view_reports": true,
            "can_manage_contacts": true,
            "can_create_projects": true,
            "can_edit_projects": true
        }'::jsonb,
        true,
        now(),
        now()
    )
    ON CONFLICT (organization_id, name) DO UPDATE
    SET permissions = EXCLUDED.permissions,
        updated_at = now()
    RETURNING id INTO demo_role_id;
    
    -- ========================================================================
    -- CREATE DEMO CONTACT
    -- ========================================================================
    
    INSERT INTO contacts (name, type, email, organization_id, created_by_user_id, created_at)
    VALUES (
        'Demo User',
        'Team',
        'demo@siteweave.app',
        demo_org_id,
        demo_user_id,
        now()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO demo_contact_id;
    
    -- If contact already exists, get its ID
    IF demo_contact_id IS NULL THEN
        SELECT id INTO demo_contact_id 
        FROM contacts 
        WHERE email = 'demo@siteweave.app' AND organization_id = demo_org_id;
    END IF;
    
    -- ========================================================================
    -- UPDATE OR CREATE PROFILE FOR DEMO USER
    -- ========================================================================
    
    IF demo_user_id IS NOT NULL THEN
        -- Update existing profile or create new one
        INSERT INTO profiles (id, role_id, contact_id, organization_id, is_super_admin, created_at)
        VALUES (demo_user_id, demo_role_id, demo_contact_id, demo_org_id, false, now())
        ON CONFLICT (id) DO UPDATE
        SET role_id = demo_role_id,
            contact_id = demo_contact_id,
            organization_id = demo_org_id,
            is_super_admin = false;
    END IF;
    
    -- ========================================================================
    -- CREATE SAMPLE PROJECTS FOR DEMONSTRATION
    -- ========================================================================
    
    -- Only create sample projects if demo user exists
    IF demo_user_id IS NOT NULL THEN
        -- Sample Project 1
        INSERT INTO projects (
            name, 
            address, 
            status, 
            status_color, 
            project_type, 
            due_date, 
            next_milestone,
            color,
            organization_id,
            created_by_user_id,
            project_manager_id,
            created_at
        )
        VALUES (
            'Demo Residential Project',
            '123 Demo Street, Demo City, DC 12345',
            'In Progress',
            '#10B981',
            'Residential',
            CURRENT_DATE + INTERVAL '90 days',
            'Foundation Complete',
            '#3B82F6',
            demo_org_id,
            demo_user_id,
            demo_user_id,
            now()
        )
        ON CONFLICT DO NOTHING;
        
        -- Sample Project 2
        INSERT INTO projects (
            name, 
            address, 
            status, 
            status_color, 
            project_type, 
            due_date, 
            next_milestone,
            color,
            organization_id,
            created_by_user_id,
            project_manager_id,
            created_at
        )
        VALUES (
            'Demo Commercial Project',
            '456 Business Ave, Demo City, DC 12345',
            'Planning',
            '#3B82F6',
            'Commercial',
            CURRENT_DATE + INTERVAL '180 days',
            'Permits Approved',
            '#8B5CF6',
            demo_org_id,
            demo_user_id,
            demo_user_id,
            now()
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Demo account setup complete!';
    RAISE NOTICE 'Organization ID: %', demo_org_id;
    RAISE NOTICE 'Demo User ID: %', demo_user_id;
    RAISE NOTICE 'Note: If demo user does not exist, create it via Supabase Auth first with email: demo@siteweave.app';
    
END $$;

-- ============================================================================
-- INSTRUCTIONS FOR MANUAL USER CREATION
-- ============================================================================

-- To complete the demo account setup:
-- 1. Create a user in Supabase Auth Dashboard with email: demo@siteweave.app
-- 2. Set a password (e.g., "Demo123!@#") or use password reset link
-- 3. Run this script again to link the user to the demo organization
-- 4. Provide credentials to App Store reviewers:
--    Email: demo@siteweave.app
--    Password: [set via Supabase Auth]

