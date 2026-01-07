-- SQL Script to Create Demo Account and Sample Data for SiteWeave Mobile App
-- Run this in your Supabase SQL Editor after creating the demo auth user

-- Demo Account Credentials:
-- Email: demo@siteweave.app
-- Password: DemoSiteWeave2024!

-- STEP 1: First create the auth user in Supabase Dashboard → Authentication → Users
-- Use the credentials above and set "Auto Confirm" to Yes
-- Then get the user_id and replace '3fe6f1e1-17e5-4299-bd27-86130a568da3' below with the actual UUID

-- IMPORTANT: Replace '3fe6f1e1-17e5-4299-bd27-86130a568da3' with your actual demo user UUID from Supabase Auth

DO $$
DECLARE
  -- REPLACE THIS UUID WITH YOUR ACTUAL DEMO USER ID FROM SUPABASE AUTH
  demo_user_id UUID := '3fe6f1e1-17e5-4299-bd27-86130a568da3';
  
  project1_id UUID;
  project2_id UUID;
  project3_id UUID;
  contact1_id UUID;
  contact2_id UUID;
  contact3_id UUID;
  contact4_id UUID;
  contact5_id UUID;
BEGIN
  -- STEP 2: Create sample contacts first (needed for tasks and project_contacts)
  -- Note: type must be either 'Team' or 'Subcontractor' (not 'external')
  INSERT INTO contacts (name, email, phone, company, role, type, created_by_user_id)
  VALUES 
    ('Sarah Johnson', 'sarah.johnson@example.com', '+1-555-0123', 'Design Studio Co', 'Lead Designer', 'Subcontractor', demo_user_id),
    ('Michael Chen', 'michael.chen@example.com', '+1-555-0456', 'Tech Solutions Inc', 'Senior Developer', 'Subcontractor', demo_user_id),
    ('Emily Rodriguez', 'emily.r@example.com', '+1-555-0789', 'Marketing Pro Agency', 'Marketing Director', 'Subcontractor', demo_user_id),
    ('David Kim', 'david.kim@example.com', '+1-555-0321', 'Mobile Apps LLC', 'Product Manager', 'Subcontractor', demo_user_id),
    ('Lisa Anderson', 'lisa.anderson@example.com', '+1-555-0654', 'Creative Agency', 'Content Strategist', 'Subcontractor', demo_user_id);

  -- Get contact IDs
  SELECT id INTO contact1_id FROM contacts WHERE email = 'sarah.johnson@example.com' AND created_by_user_id = demo_user_id;
  SELECT id INTO contact2_id FROM contacts WHERE email = 'michael.chen@example.com' AND created_by_user_id = demo_user_id;
  SELECT id INTO contact3_id FROM contacts WHERE email = 'emily.r@example.com' AND created_by_user_id = demo_user_id;
  SELECT id INTO contact4_id FROM contacts WHERE email = 'david.kim@example.com' AND created_by_user_id = demo_user_id;
  SELECT id INTO contact5_id FROM contacts WHERE email = 'lisa.anderson@example.com' AND created_by_user_id = demo_user_id;

  -- STEP 3: Create sample projects
  INSERT INTO projects (name, status, project_type, due_date, created_by_user_id, project_manager_id)
  VALUES 
    ('Website Redesign', 'In Progress', 'Web Development', CURRENT_DATE + INTERVAL '60 days', demo_user_id, demo_user_id),
    ('Mobile App Development', 'In Progress', 'Mobile Development', CURRENT_DATE + INTERVAL '90 days', demo_user_id, demo_user_id),
    ('Marketing Campaign Q1', 'Planning', 'Marketing', CURRENT_DATE + INTERVAL '45 days', demo_user_id, demo_user_id);

  -- Get the project IDs we just created
  SELECT id INTO project1_id FROM projects WHERE name = 'Website Redesign' AND created_by_user_id = demo_user_id;
  SELECT id INTO project2_id FROM projects WHERE name = 'Mobile App Development' AND created_by_user_id = demo_user_id;
  SELECT id INTO project3_id FROM projects WHERE name = 'Marketing Campaign Q1' AND created_by_user_id = demo_user_id;

  -- STEP 4: Link contacts to projects
  INSERT INTO project_contacts (project_id, contact_id)
  VALUES 
    (project1_id, contact1_id),
    (project1_id, contact2_id),
    (project2_id, contact2_id),
    (project2_id, contact4_id),
    (project3_id, contact3_id),
    (project3_id, contact5_id);

  -- STEP 5: Create sample tasks (using assignee_id which references contacts)
  -- Note: priority must be 'Low', 'Medium', or 'High' (capitalized)
  INSERT INTO tasks (project_id, text, priority, completed, assignee_id, due_date)
  VALUES 
    -- Website Redesign tasks
    (project1_id, 'Design Homepage Mockup', 'High', true, contact1_id, CURRENT_DATE - INTERVAL '5 days'),
    (project1_id, 'Implement Responsive Navigation', 'High', false, contact2_id, CURRENT_DATE + INTERVAL '3 days'),
    (project1_id, 'Optimize Images for Web', 'Medium', false, contact1_id, CURRENT_DATE + INTERVAL '7 days'),
    (project1_id, 'Setup Analytics Tracking', 'Low', false, contact2_id, CURRENT_DATE + INTERVAL '14 days'),
    
    -- Mobile App Development tasks
    (project2_id, 'Setup Development Environment', 'High', true, contact2_id, CURRENT_DATE - INTERVAL '10 days'),
    (project2_id, 'Design App Icon and Splash Screen', 'Medium', true, contact1_id, CURRENT_DATE - INTERVAL '3 days'),
    (project2_id, 'Implement User Authentication', 'High', false, contact2_id, CURRENT_DATE + INTERVAL '2 days'),
    (project2_id, 'Build Product Catalog View', 'High', false, contact4_id, CURRENT_DATE + INTERVAL '10 days'),
    
    -- Marketing Campaign tasks
    (project3_id, 'Develop Campaign Strategy', 'High', false, contact3_id, CURRENT_DATE + INTERVAL '5 days'),
    (project3_id, 'Create Social Media Content', 'Medium', false, contact5_id, CURRENT_DATE + INTERVAL '12 days'),
    (project3_id, 'Launch Email Newsletter', 'High', false, contact3_id, CURRENT_DATE + INTERVAL '20 days');

  -- STEP 6: Create sample calendar events
  INSERT INTO calendar_events (project_id, title, description, start_time, end_time, user_id, category)
  VALUES 
    (project1_id, 'Design Review Meeting', 'Review homepage mockups with stakeholders', CURRENT_DATE + INTERVAL '1 day' + TIME '14:00:00', CURRENT_DATE + INTERVAL '1 day' + TIME '15:00:00', demo_user_id, 'meeting'),
    (project1_id, 'Website Launch', 'Go-live for new website redesign', CURRENT_DATE + INTERVAL '60 days' + TIME '09:00:00', CURRENT_DATE + INTERVAL '60 days' + TIME '10:00:00', demo_user_id, 'deadline'),
    (project2_id, 'Sprint Planning', 'Plan next 2-week sprint for mobile app development', CURRENT_DATE + INTERVAL '2 days' + TIME '10:00:00', CURRENT_DATE + INTERVAL '2 days' + TIME '11:30:00', demo_user_id, 'meeting'),
    (project2_id, 'App Beta Testing', 'Begin beta testing phase with selected users', CURRENT_DATE + INTERVAL '45 days' + TIME '00:00:00', CURRENT_DATE + INTERVAL '60 days' + TIME '23:59:59', demo_user_id, 'work'),
    (project3_id, 'Campaign Kickoff', 'Launch event for Q1 marketing campaign', CURRENT_DATE + INTERVAL '20 days' + TIME '09:00:00', CURRENT_DATE + INTERVAL '20 days' + TIME '17:00:00', demo_user_id, 'meeting');

  -- Display success message
  RAISE NOTICE 'Demo account data created successfully!';
  RAISE NOTICE 'Projects: 3, Tasks: 11, Events: 5, Contacts: 5';

END $$;

-- STEP 8: Update user metadata (optional - for display name)
-- This should be done via Supabase Dashboard → Authentication → Users → [demo user] → Raw User Meta Data
-- Add: {"full_name": "Demo User"}

-- Verify the data was created (replace UUID with your actual demo user ID)
SELECT 
  'Projects' as entity,
  COUNT(*) as count
FROM projects 
WHERE created_by_user_id = '3fe6f1e1-17e5-4299-bd27-86130a568da3'
UNION ALL
SELECT 
  'Tasks' as entity,
  COUNT(*) as count
FROM tasks 
WHERE project_id IN (
  SELECT id FROM projects WHERE created_by_user_id = '3fe6f1e1-17e5-4299-bd27-86130a568da3'
)
UNION ALL
SELECT 
  'Events' as entity,
  COUNT(*) as count
FROM calendar_events 
WHERE user_id = '3fe6f1e1-17e5-4299-bd27-86130a568da3'
UNION ALL
SELECT 
  'Contacts' as entity,
  COUNT(*) as count
FROM contacts 
WHERE created_by_user_id = '3fe6f1e1-17e5-4299-bd27-86130a568da3';

-- Instructions:
-- 1. Create the auth user in Supabase Dashboard first (demo@siteweave.app)
-- 2. Copy the user_id UUID from the user you just created
-- 3. Replace '3fe6f1e1-17e5-4299-bd27-86130a568da3' in TWO places:
--    - Line 15: In the DECLARE section
--    - Line 105-122: In the verification SELECT statements at the end
-- 4. Run this SQL in Supabase SQL Editor
-- 5. Verify the counts at the end show: 3 projects, 11 tasks, 5 events, 5 contacts
--
-- NOTE: This script uses standard SQL and works in Supabase SQL Editor
-- The UUID '3fe6f1e1-17e5-4299-bd27-86130a568da3' is already set - replace it if needed


