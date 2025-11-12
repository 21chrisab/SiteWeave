-- ============================================================================
-- Generate Complete Fake Construction Industry Data
-- ============================================================================
-- This script generates comprehensive fake data for all tables in the schema
-- All data is created by user ID: 2bf44424-6397-4ffe-a2a5-ff786a399a96
--
-- Usage in Supabase SQL Editor:
--   1. Run this entire script
--   2. All data will be generated and linked together
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID := '2bf44424-6397-4ffe-a2a5-ff786a399a96';
    v_user_name TEXT := 'Demo User';
    
    -- Arrays for fake data
    v_first_names TEXT[] := ARRAY[
        'James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph',
        'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
        'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George',
        'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary',
        'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
        'Benjamin', 'Samuel', 'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick',
        'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Zachary',
        'Henry', 'Douglas', 'Peter', 'Kyle', 'Noah', 'Ethan', 'Jeremy', 'Walter',
        'Christian', 'Keith', 'Roger', 'Terry', 'Austin', 'Sean', 'Gerald', 'Carl',
        'Harold', 'Dylan', 'Arthur', 'Lawrence', 'Jordan', 'Jesse', 'Bryan', 'Billy',
        'Bruce', 'Gabriel', 'Joe', 'Logan', 'Alan', 'Juan', 'Wayne', 'Ralph', 'Roy',
        'Eugene', 'Louis', 'Philip', 'Johnny', 'Howard', 'Vincent', 'Bobby', 'Randy'
    ];
    v_last_names TEXT[] := ARRAY[
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
        'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
        'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
        'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
        'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter',
        'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz',
        'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook',
        'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed',
        'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
        'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
        'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross'
    ];
    v_companies TEXT[] := ARRAY[
        'Apex Construction', 'BuildRight Contractors', 'Coastal Builders', 'Diamond Construction',
        'Elite Builders', 'Foundation First', 'Golden Hammer Construction', 'Heritage Builders',
        'Iron Works Construction', 'Junction Builders', 'Keystone Construction', 'Liberty Builders',
        'Mountain View Construction', 'North Star Builders', 'Oak Ridge Construction', 'Pacific Builders',
        'Quality First Construction', 'Riverside Builders', 'Summit Construction', 'Titan Builders',
        'United Construction', 'Valley Builders', 'West Coast Construction', 'Xcel Builders',
        'Yard Construction', 'Zenith Builders', 'Alpha Construction', 'Beta Builders',
        'Gamma Construction', 'Delta Builders'
    ];
    v_trades TEXT[] := ARRAY[
        'General Contractor', 'Electrician', 'Plumber', 'Carpenter', 'HVAC Technician',
        'Roofer', 'Concrete Finisher', 'Mason', 'Drywall Installer', 'Painter',
        'Flooring Installer', 'Welder', 'Heavy Equipment Operator', 'Surveyor',
        'Architect', 'Structural Engineer', 'Project Manager', 'Site Supervisor',
        'Safety Inspector', 'Quality Control', 'Excavator', 'Framer', 'Insulation Installer',
        'Landscaper', 'Fence Installer', 'Window Installer', 'Door Installer', 'Tile Setter',
        'Cabinet Maker', 'Millwright', 'Ironworker', 'Glazier', 'Sheet Metal Worker'
    ];
    v_roles TEXT[] := ARRAY[
        'Project Manager', 'Site Supervisor', 'Foreman', 'Lead Technician', 'Senior Technician',
        'Technician', 'Apprentice', 'Specialist', 'Inspector', 'Estimator', 'Coordinator',
        'Supervisor', 'Team Lead', 'Crew Leader', 'Master Craftsman', 'Journeyman'
    ];
    v_statuses TEXT[] := ARRAY['Available', 'On Site', 'On Leave', 'Unavailable'];
    v_type TEXT;
    v_project_statuses TEXT[] := ARRAY['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
    v_project_types TEXT[] := ARRAY['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Renovation'];
    v_task_priorities TEXT[] := ARRAY['Low', 'Medium', 'High'];
    v_issue_priorities TEXT[] := ARRAY['Low', 'Medium', 'High', 'Critical'];
    v_issue_statuses TEXT[] := ARRAY['open', 'in_progress', 'resolved', 'closed'];
    v_step_statuses TEXT[] := ARRAY['pending', 'in_progress', 'completed'];
    
    v_project_names TEXT[] := ARRAY[
        'Downtown Office Complex', 'Riverside Residential Development', 'Highway Bridge Renovation',
        'Shopping Mall Expansion', 'Industrial Warehouse Facility', 'Luxury Condominium Tower',
        'Hospital Wing Addition', 'School Campus Renovation', 'Parking Garage Construction',
        'Retail Strip Center', 'Apartment Complex Phase 2', 'Office Building Retrofit',
        'Residential Subdivision', 'Commercial Plaza', 'Manufacturing Plant Upgrade',
        'Hotel Renovation Project', 'Sports Complex', 'Community Center', 'Library Expansion',
        'Mixed-Use Development', 'Warehouse Distribution Center', 'Medical Office Building',
        'Senior Living Facility', 'Student Housing Complex', 'Corporate Headquarters'
    ];
    
    v_addresses TEXT[] := ARRAY[
        '123 Main Street, Downtown', '456 Oak Avenue, Riverside', '789 Elm Boulevard, Midtown',
        '321 Pine Road, Westside', '654 Maple Drive, Eastside', '987 Cedar Lane, Northside',
        '147 Birch Street, Southside', '258 Spruce Way, Uptown', '369 Willow Court, Downtown',
        '741 Ash Avenue, Riverside', '852 Poplar Road, Midtown', '963 Hickory Drive, Westside',
        '159 Cherry Street, Eastside', '357 Walnut Lane, Northside', '468 Chestnut Way, Southside',
        '579 Sycamore Court, Uptown', '680 Magnolia Avenue, Downtown', '791 Dogwood Road, Riverside',
        '802 Redwood Drive, Midtown', '913 Cypress Lane, Westside', '124 Fir Street, Eastside',
        '235 Hemlock Way, Northside', '346 Juniper Court, Southside', '457 Cedar Avenue, Uptown',
        '568 Pine Road, Downtown'
    ];
    
    v_file_types TEXT[] := ARRAY['pdf', 'docx', 'xlsx', 'jpg', 'png', 'dwg', 'zip'];
    v_file_names TEXT[] := ARRAY[
        'Site Plan', 'Architectural Drawings', 'Structural Analysis', 'Electrical Schematic',
        'Plumbing Layout', 'HVAC Design', 'Material List', 'Safety Report', 'Progress Photos',
        'Inspection Report', 'Change Order', 'Invoice', 'Contract', 'Permit Application',
        'Environmental Assessment', 'Survey Report', 'Soil Test Results', 'Budget Estimate',
        'Schedule Timeline', 'Quality Checklist', 'Meeting Minutes', 'Daily Log',
        'Equipment List', 'Subcontractor Agreement', 'Warranty Document'
    ];
    
    v_message_topics TEXT[] := ARRAY[
        'Site Update', 'Schedule Change', 'Material Delivery', 'Safety Concern', 'Quality Issue',
        'Progress Report', 'Meeting Request', 'Change Order', 'Budget Update', 'Timeline Adjustment',
        'Equipment Needed', 'Subcontractor Coordination', 'Inspection Scheduled', 'Weather Delay',
        'Material Substitution', 'Design Clarification', 'Permit Status', 'Payment Request',
        'Daily Summary', 'Weekly Review', 'Issue Resolution', 'Next Steps', 'Coordination Meeting'
    ];
    
    v_phase_names TEXT[] := ARRAY[
        'Site Preparation', 'Foundation', 'Framing', 'Rough-In', 'Exterior Work',
        'Interior Finishing', 'Mechanical Systems', 'Electrical Installation', 'Plumbing',
        'Final Inspection', 'Punch List', 'Closeout'
    ];
    
    -- Variables for generated data
    v_contact_ids UUID[] := ARRAY[]::UUID[];
    v_project_ids UUID[] := ARRAY[]::UUID[];
    v_channel_ids UUID[] := ARRAY[]::UUID[];
    v_issue_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_step_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Counters and temp variables
    v_i INTEGER;
    v_j INTEGER;
    v_k INTEGER;
    v_contact_id UUID;
    v_project_id UUID;
    v_channel_id UUID;
    v_issue_id INTEGER;
    v_step_id INTEGER;
    v_first_name TEXT;
    v_last_name TEXT;
    v_company TEXT;
    v_trade TEXT;
    v_role TEXT;
    v_status TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_project_name TEXT;
    v_address TEXT;
    v_project_status TEXT;
    v_project_type TEXT;
    v_due_date DATE;
    v_start_date DATE;
    v_end_date DATE;
    v_created_at TIMESTAMP WITH TIME ZONE;
    v_area_code INTEGER;
    v_exchange INTEGER;
    v_number TEXT;
    v_email_format INTEGER;
    v_priority TEXT;
    v_issue_title TEXT;
    v_issue_desc TEXT;
    v_step_desc TEXT;
    v_comment_text TEXT;
    v_file_name TEXT;
    v_file_type TEXT;
    v_message_topic TEXT;
    v_message_content TEXT;
    v_phase_name TEXT;
    v_progress INTEGER;
    v_budget NUMERIC;
    v_milestone_text TEXT;
    v_task_text TEXT;
    v_task_due_date DATE;
    v_event_title TEXT;
    v_event_desc TEXT;
    v_location TEXT;
    v_category TEXT;
    v_assignee_id UUID;
    v_workflow_steps JSONB;
    v_num_steps INTEGER;
    v_step_description TEXT;
    v_step_contact_id UUID;
    v_step_contact_name TEXT;
    v_step_contact_role TEXT;
    v_current_step INTEGER;
    v_has_workflow BOOLEAN;
    v_assigned_contact_id UUID;
    v_assigned_name TEXT;
    v_assigned_role TEXT;
    v_step_status TEXT;
    v_step_order INTEGER;
    v_current_step_id INTEGER;
    v_resolved_at TIMESTAMP WITH TIME ZONE;
    v_completed_at TIMESTAMP WITH TIME ZONE;
    v_activity_action TEXT;
    v_activity_entity_type TEXT;
    v_activity_entity_name TEXT;
BEGIN
    RAISE NOTICE 'Starting fake data generation for user: %', v_user_id;
    
    -- ========================================================================
    -- 1. GENERATE CONTACTS (50 contacts)
    -- ========================================================================
    RAISE NOTICE 'Generating contacts...';
    FOR v_i IN 1..50 LOOP
        v_first_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int];
        v_last_name := v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
        v_company := v_companies[1 + floor(random() * array_length(v_companies, 1))::int];
        v_trade := v_trades[1 + floor(random() * array_length(v_trades, 1))::int];
        v_role := v_roles[1 + floor(random() * array_length(v_roles, 1))::int];
        v_status := v_statuses[1 + floor(random() * array_length(v_statuses, 1))::int];
        
        IF random() > 0.3 THEN
            v_type := 'Subcontractor';
        ELSE
            v_type := 'Team';
        END IF;
        
        -- Generate phone
        v_area_code := 200 + floor(random() * 800)::int;
        v_exchange := 200 + floor(random() * 800)::int;
        v_number := lpad(floor(random() * 10000)::text, 4, '0');
        v_phone := format('(%s) %s-%s', v_area_code, v_exchange, v_number);
        
        -- Generate email
        v_email_format := 1 + floor(random() * 4)::int;
        CASE v_email_format
            WHEN 1 THEN v_email := lower(v_first_name || '.' || v_last_name);
            WHEN 2 THEN v_email := lower(v_first_name || v_last_name);
            WHEN 3 THEN v_email := lower(substring(v_first_name, 1, 1) || v_last_name);
            ELSE v_email := lower(v_first_name || substring(v_last_name, 1, 1) || floor(random() * 100)::text);
        END CASE;
        
        IF random() > 0.3 THEN
            v_email := v_email || '@' || lower(replace(v_company, ' ', '')) || '.com';
        ELSE
            v_email := v_email || '@' || (ARRAY['gmail.com', 'yahoo.com', 'outlook.com'])[1 + floor(random() * 3)::int];
        END IF;
        
        INSERT INTO contacts (name, role, type, company, trade, status, email, phone, created_by_user_id)
        VALUES (v_first_name || ' ' || v_last_name, v_role, v_type, v_company, v_trade, v_status, v_email, v_phone, v_user_id)
        RETURNING id INTO v_contact_id;
        
        v_contact_ids := array_append(v_contact_ids, v_contact_id);
    END LOOP;
    RAISE NOTICE 'Generated % contacts', array_length(v_contact_ids, 1);
    
    -- ========================================================================
    -- 2. GENERATE PROJECTS (10 projects)
    -- ========================================================================
    RAISE NOTICE 'Generating projects...';
    FOR v_i IN 1..10 LOOP
        v_project_name := v_project_names[1 + floor(random() * array_length(v_project_names, 1))::int];
        v_address := v_addresses[1 + floor(random() * array_length(v_addresses, 1))::int];
        v_project_status := v_project_statuses[1 + floor(random() * array_length(v_project_statuses, 1))::int];
        v_project_type := v_project_types[1 + floor(random() * array_length(v_project_types, 1))::int];
        v_due_date := CURRENT_DATE + (floor(random() * 365)::int || ' days')::INTERVAL;
        
        INSERT INTO projects (
            name, address, status, status_color, project_type, due_date,
            next_milestone, color, created_by_user_id, project_manager_id,
            created_at
        ) VALUES (
            v_project_name,
            v_address,
            v_project_status,
            CASE v_project_status
                WHEN 'Planning' THEN '#3B82F6'
                WHEN 'In Progress' THEN '#10B981'
                WHEN 'On Hold' THEN '#F59E0B'
                WHEN 'Completed' THEN '#6B7280'
                ELSE '#EF4444'
            END,
            v_project_type,
            v_due_date,
            v_phase_names[1 + floor(random() * array_length(v_phase_names, 1))::int],
            (ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[1 + floor(random() * 5)::int],
            v_user_id,
            v_user_id,
            CURRENT_TIMESTAMP - (floor(random() * 180)::int || ' days')::INTERVAL
        )
        RETURNING id INTO v_project_id;
        
        v_project_ids := array_append(v_project_ids, v_project_id);
    END LOOP;
    RAISE NOTICE 'Generated % projects', array_length(v_project_ids, 1);
    
    -- ========================================================================
    -- 3. LINK CONTACTS TO PROJECTS (project_contacts)
    -- ========================================================================
    RAISE NOTICE 'Linking contacts to projects...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        
        -- First project gets exactly 10 members, others get 3-8
        IF v_i = 1 THEN
            -- Assign exactly 10 contacts to the first project
            -- Make sure we have enough contacts
            IF array_length(v_contact_ids, 1) >= 10 THEN
                -- Use first 10 contacts (or random selection if you prefer)
                FOR v_j IN 1..10 LOOP
                    v_contact_id := v_contact_ids[v_j];
                    BEGIN
                        INSERT INTO project_contacts (project_id, contact_id)
                        VALUES (v_project_id, v_contact_id)
                        ON CONFLICT DO NOTHING;
                    EXCEPTION WHEN OTHERS THEN
                        -- Skip duplicates
                    END;
                END LOOP;
            ELSE
                -- If we don't have 10 contacts, assign all available ones
                FOR v_j IN 1..array_length(v_contact_ids, 1) LOOP
                    v_contact_id := v_contact_ids[v_j];
                    BEGIN
                        INSERT INTO project_contacts (project_id, contact_id)
                        VALUES (v_project_id, v_contact_id)
                        ON CONFLICT DO NOTHING;
                    EXCEPTION WHEN OTHERS THEN
                        -- Skip duplicates
                    END;
                END LOOP;
            END IF;
        ELSE
            -- Other projects: Assign 3-8 contacts per project
            FOR v_j IN 1..(3 + floor(random() * 6)::int) LOOP
                v_contact_id := v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::int];
                BEGIN
                    INSERT INTO project_contacts (project_id, contact_id)
                    VALUES (v_project_id, v_contact_id)
                    ON CONFLICT DO NOTHING;
                EXCEPTION WHEN OTHERS THEN
                    -- Skip duplicates
                END;
            END LOOP;
        END IF;
    END LOOP;
    
    -- ========================================================================
    -- 4. GENERATE PROJECT PHASES
    -- ========================================================================
    RAISE NOTICE 'Generating project phases...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        v_k := 0;
        FOR v_j IN 1..(4 + floor(random() * 5)::int) LOOP
            v_phase_name := v_phase_names[1 + floor(random() * array_length(v_phase_names, 1))::int];
            v_progress := floor(random() * 101)::int;
            v_budget := (10000 + floor(random() * 500000))::NUMERIC;
            v_k := v_k + 1;
            
            INSERT INTO project_phases (project_id, name, progress, budget, "order")
            VALUES (v_project_id, v_phase_name, v_progress, v_budget, v_k);
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- 5. GENERATE TASKS (5-10 per project, some with workflows)
    -- ========================================================================
    RAISE NOTICE 'Generating tasks...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        FOR v_j IN 1..(5 + floor(random() * 6)::int) LOOP
            v_task_text := (ARRAY[
                'Review architectural drawings', 'Schedule site inspection', 'Order materials',
                'Coordinate with subcontractors', 'Update project timeline', 'Submit permit application',
                'Conduct safety meeting', 'Review budget', 'Update progress report', 'Schedule equipment delivery',
                'Complete quality checklist', 'Review change orders', 'Update client', 'Prepare invoice',
                'Schedule final inspection', 'Complete punch list', 'Coordinate cleanup', 'Final walkthrough'
            ])[1 + floor(random() * 18)::int];
            
            v_priority := v_task_priorities[1 + floor(random() * array_length(v_task_priorities, 1))::int];
            v_task_due_date := CURRENT_DATE + (floor(random() * 90)::int || ' days')::INTERVAL;
            
            IF random() > 0.4 THEN
                v_assignee_id := v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::int];
            ELSE
                v_assignee_id := NULL;
            END IF;
            
            -- 40% of tasks will have workflows
            v_has_workflow := random() < 0.4;
            v_workflow_steps := NULL;
            v_current_step := 1;
            
            IF v_has_workflow AND array_length(v_contact_ids, 1) > 0 THEN
                -- Generate 3-6 workflow steps
                v_num_steps := 3 + floor(random() * 4)::int;
                v_workflow_steps := '[]'::JSONB;
                
                FOR v_k IN 1..v_num_steps LOOP
                    -- Select a random contact for this step
                    v_step_contact_id := v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::int];
                    SELECT name, role INTO v_step_contact_name, v_step_contact_role
                    FROM contacts WHERE id = v_step_contact_id;
                    
                    -- Generate step description
                    v_step_description := (ARRAY[
                        'Initial review and assessment',
                        'Gather required documentation',
                        'Perform quality inspection',
                        'Coordinate with stakeholders',
                        'Complete necessary approvals',
                        'Final verification and sign-off'
                    ])[1 + floor(random() * 6)::int];
                    
                    -- Add step to workflow_steps JSONB array
                    v_workflow_steps := v_workflow_steps || jsonb_build_array(
                        jsonb_build_object(
                            'step_order', v_k,
                            'description', v_step_description,
                            'assigned_to_contact_id', v_step_contact_id::TEXT,
                            'assigned_to_name', COALESCE(v_step_contact_name, 'Team Member'),
                            'assigned_to_role', COALESCE(v_step_contact_role, 'Team')
                        )
                    );
                END LOOP;
                
                -- Set current step (1 to num_steps, weighted towards earlier steps)
                v_current_step := 1 + floor(random() * LEAST(v_num_steps, 3))::int;
            END IF;
            
            -- Insert task with or without workflow
            IF v_has_workflow THEN
                INSERT INTO tasks (project_id, text, due_date, priority, completed, assignee_id, workflow_steps, current_workflow_step, created_at)
                VALUES (
                    v_project_id,
                    v_task_text,
                    v_task_due_date,
                    v_priority,
                    random() > 0.7,
                    v_assignee_id,
                    v_workflow_steps,
                    v_current_step,
                    CURRENT_TIMESTAMP - (floor(random() * 60)::int || ' days')::INTERVAL
                );
            ELSE
                INSERT INTO tasks (project_id, text, due_date, priority, completed, assignee_id, created_at)
                VALUES (
                    v_project_id,
                    v_task_text,
                    v_task_due_date,
                    v_priority,
                    random() > 0.7,
                    v_assignee_id,
                    CURRENT_TIMESTAMP - (floor(random() * 60)::int || ' days')::INTERVAL
                );
            END IF;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- 6. GENERATE PROJECT ISSUES (2-5 per project)
    -- ========================================================================
    RAISE NOTICE 'Generating project issues...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        FOR v_j IN 1..(2 + floor(random() * 4)::int) LOOP
            v_issue_title := (ARRAY[
                'Foundation crack discovered', 'Material delivery delay', 'Electrical code violation',
                'Plumbing leak in basement', 'Structural support concern', 'Safety hazard identified',
                'Quality control issue', 'Schedule conflict', 'Budget overrun', 'Permit issue',
                'Weather damage', 'Equipment malfunction', 'Subcontractor delay', 'Design change needed',
                'Inspection failure', 'Material defect', 'Access road blocked', 'Utility conflict'
            ])[1 + floor(random() * 18)::int];
            
            v_issue_desc := 'Issue description: ' || v_issue_title || '. Requires immediate attention and resolution.';
            v_priority := v_issue_priorities[1 + floor(random() * array_length(v_issue_priorities, 1))::int];
            v_status := v_issue_statuses[1 + floor(random() * array_length(v_issue_statuses, 1))::int];
            v_due_date := CURRENT_DATE + (floor(random() * 30)::int || ' days')::INTERVAL;
            v_created_at := CURRENT_TIMESTAMP - (floor(random() * 45)::int || ' days')::INTERVAL;
            
            IF v_status IN ('resolved', 'closed') THEN
                v_resolved_at := v_created_at + (floor(random() * 30)::int || ' days')::INTERVAL;
            ELSE
                v_resolved_at := NULL;
            END IF;
            
            INSERT INTO project_issues (
                project_id, title, description, status, priority, due_date,
                created_by_user_id, created_at, updated_at, resolved_at
            )
            VALUES (
                v_project_id, v_issue_title, v_issue_desc, v_status, v_priority, v_due_date,
                v_user_id, v_created_at, v_created_at, v_resolved_at
            )
            RETURNING id INTO v_issue_id;
            
            v_issue_ids := array_append(v_issue_ids, v_issue_id);
            
            -- Generate issue steps (2-4 steps per issue)
            v_current_step_id := NULL;
            FOR v_k IN 1..(2 + floor(random() * 3)::int) LOOP
                v_step_desc := (ARRAY[
                    'Investigate and document issue', 'Notify relevant parties', 'Develop solution plan',
                    'Obtain approvals', 'Implement fix', 'Verify resolution', 'Update documentation',
                    'Schedule follow-up inspection', 'Close out issue'
                ])[1 + floor(random() * 9)::int];
                
                IF random() > 0.3 THEN
                    v_assigned_contact_id := v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::int];
                    SELECT name, role INTO v_assigned_name, v_assigned_role
                    FROM contacts WHERE id = v_assigned_contact_id;
                ELSE
                    v_assigned_contact_id := NULL;
                    v_assigned_name := 'Unassigned';
                    v_assigned_role := 'Team';
                END IF;
                
                v_step_status := v_step_statuses[1 + floor(random() * array_length(v_step_statuses, 1))::int];
                
                IF v_step_status = 'completed' THEN
                    v_completed_at := v_created_at + (floor(random() * 20)::int || ' days')::INTERVAL;
                ELSE
                    v_completed_at := NULL;
                END IF;
                
                INSERT INTO issue_steps (
                    issue_id, step_order, description, assigned_to_contact_id,
                    assigned_to_name, assigned_to_role, status, completed_at,
                    created_at, updated_at
                )
                VALUES (
                    v_issue_id, v_k, v_step_desc, v_assigned_contact_id,
                    v_assigned_name, v_assigned_role, v_step_status, v_completed_at,
                    v_created_at, v_created_at
                )
                RETURNING id INTO v_step_id;
                
                v_step_ids := array_append(v_step_ids, v_step_id);
                
                IF v_k = 1 THEN
                    v_current_step_id := v_step_id;
                END IF;
                
                -- Generate comments for some steps
                IF random() > 0.5 THEN
                    v_comment_text := (ARRAY[
                        'Working on this now', 'Need more information', 'Waiting for approval',
                        'Completed successfully', 'Issue resolved', 'Following up on this',
                        'Need to coordinate with team', 'Reviewing documentation', 'Scheduled for next week'
                    ])[1 + floor(random() * 9)::int];
                    
                    INSERT INTO issue_comments (issue_id, step_id, user_id, user_name, comment, created_at)
                    VALUES (v_issue_id, v_step_id, v_user_id, v_user_name, v_comment_text, v_created_at + (floor(random() * 5)::int || ' days')::INTERVAL);
                END IF;
            END LOOP;
            
            -- Update issue with current step
            IF v_current_step_id IS NOT NULL THEN
                UPDATE project_issues SET current_step_id = v_current_step_id WHERE id = v_issue_id;
            END IF;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Generated % issues', array_length(v_issue_ids, 1);
    
    -- ========================================================================
    -- 7. GENERATE FILES (3-8 per project)
    -- ========================================================================
    RAISE NOTICE 'Generating files...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        FOR v_j IN 1..(3 + floor(random() * 6)::int) LOOP
            v_file_name := v_file_names[1 + floor(random() * array_length(v_file_names, 1))::int];
            v_file_type := v_file_types[1 + floor(random() * array_length(v_file_types, 1))::int];
            
            INSERT INTO files (
                project_id, name, type, file_url, size_kb,
                created_by_user_id, modified_at
            )
            VALUES (
                v_project_id,
                v_file_name || '.' || v_file_type,
                v_file_type,
                'https://example.com/files/' || gen_random_uuid()::text || '.' || v_file_type,
                (100 + floor(random() * 10000))::INTEGER,
                v_user_id,
                CURRENT_TIMESTAMP - (floor(random() * 30)::int || ' days')::INTERVAL
            );
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- 8. GENERATE MESSAGE CHANNELS AND MESSAGES
    -- ========================================================================
    RAISE NOTICE 'Generating message channels and messages...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        
        -- Create 1-3 channels per project
        FOR v_j IN 1..(1 + floor(random() * 3)::int) LOOP
            INSERT INTO message_channels (project_id, name)
            VALUES (
                v_project_id,
                (ARRAY['General', 'Updates', 'Issues', 'Coordination', 'Daily Log'])[1 + floor(random() * 5)::int]
            )
            RETURNING id INTO v_channel_id;
            
            v_channel_ids := array_append(v_channel_ids, v_channel_id);
            
            -- Generate 5-15 messages per channel
            FOR v_k IN 1..(5 + floor(random() * 11)::int) LOOP
                v_message_topic := v_message_topics[1 + floor(random() * array_length(v_message_topics, 1))::int];
                v_message_content := 'Message about: ' || v_message_topic || '. This is a sample message for demo purposes.';
                
                INSERT INTO messages (
                    channel_id, user_id, topic, extension, content, type,
                    created_at, updated_at, inserted_at
                )
                VALUES (
                    v_channel_id,
                    v_user_id,
                    v_message_topic,
                    'txt',
                    v_message_content,
                    'text',
                    CURRENT_TIMESTAMP - (floor(random() * 20)::int || ' days')::INTERVAL,
                    CURRENT_TIMESTAMP - (floor(random() * 20)::int || ' days')::INTERVAL,
                    CURRENT_TIMESTAMP - (floor(random() * 20)::int || ' days')::INTERVAL
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- 9. GENERATE CALENDAR EVENTS (3-6 per project)
    -- ========================================================================
    RAISE NOTICE 'Generating calendar events...';
    FOR v_i IN 1..array_length(v_project_ids, 1) LOOP
        v_project_id := v_project_ids[v_i];
        FOR v_j IN 1..(3 + floor(random() * 4)::int) LOOP
            v_event_title := (ARRAY[
                'Site Inspection', 'Team Meeting', 'Material Delivery', 'Safety Review',
                'Progress Review', 'Client Meeting', 'Subcontractor Coordination', 'Final Walkthrough',
                'Permit Inspection', 'Budget Review', 'Schedule Update', 'Quality Check'
            ])[1 + floor(random() * 12)::int];
            
            v_event_desc := 'Event: ' || v_event_title || ' for project coordination.';
            v_location := v_addresses[1 + floor(random() * array_length(v_addresses, 1))::int];
            -- Use allowed category values: meeting, work, personal, deadline, other
            v_category := (ARRAY['meeting', 'work', 'personal', 'deadline', 'other'])[1 + floor(random() * 5)::int];
            
            v_start_date := CURRENT_TIMESTAMP + (floor(random() * 60)::int || ' days')::INTERVAL;
            v_end_date := v_start_date + ((1 + floor(random() * 4))::int || ' hours')::INTERVAL;
            
            INSERT INTO calendar_events (
                project_id, title, start_time, end_time, description, location,
                category, user_id, created_by_user_id
            )
            VALUES (
                v_project_id, v_event_title, v_start_date, v_end_date, v_event_desc,
                v_location, v_category, v_user_id, v_user_id
            );
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- 10. GENERATE ACTIVITY LOG ENTRIES
    -- ========================================================================
    RAISE NOTICE 'Generating activity log entries...';
    FOR v_i IN 1..(50 + floor(random() * 50)::int) LOOP
        v_project_id := v_project_ids[1 + floor(random() * array_length(v_project_ids, 1))::int];
        v_activity_action := (ARRAY[
            'created', 'updated', 'deleted', 'assigned', 'completed', 'commented', 'uploaded', 'shared'
        ])[1 + floor(random() * 8)::int];
        v_activity_entity_type := (ARRAY[
            'project', 'task', 'file', 'message', 'issue', 'contact', 'event'
        ])[1 + floor(random() * 7)::int];
        v_activity_entity_name := 'Sample ' || v_activity_entity_type;
        
        INSERT INTO activity_log (
            user_id, user_name, action, entity_type, entity_name, project_id, created_at
        )
        VALUES (
            v_user_id, v_user_name, v_activity_action, v_activity_entity_type,
            v_activity_entity_name, v_project_id,
            CURRENT_TIMESTAMP - (floor(random() * 60)::int || ' days')::INTERVAL
        );
    END LOOP;
    
    RAISE NOTICE 'Fake data generation completed successfully!';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Contacts: %', array_length(v_contact_ids, 1);
    RAISE NOTICE '  - Projects: %', array_length(v_project_ids, 1);
    RAISE NOTICE '  - Issues: %', array_length(v_issue_ids, 1);
    RAISE NOTICE '  - Message Channels: %', array_length(v_channel_ids, 1);
    
END $$;

