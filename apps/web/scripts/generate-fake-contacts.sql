-- ============================================================================
-- Generate Fake Construction Industry Contacts
-- ============================================================================
-- This script generates fake construction industry contacts for demo purposes
-- 
-- Usage in Supabase SQL Editor:
--   1. Make sure you're authenticated as the user who should own these contacts
--   2. Run this entire script
--   3. Or call: SELECT generate_fake_contacts(auth.uid(), 50);
--
-- To generate contacts for a specific user ID:
--   SELECT generate_fake_contacts('your-user-id-here'::uuid, 50);
-- ============================================================================

-- Function to generate fake construction contacts
CREATE OR REPLACE FUNCTION generate_fake_contacts(
    p_user_id UUID,
    p_count INTEGER DEFAULT 50
)
RETURNS TABLE(inserted_count INTEGER) AS $$
DECLARE
    v_inserted INTEGER := 0;
    v_contact RECORD;
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
    v_i INTEGER;
    v_first_name TEXT;
    v_last_name TEXT;
    v_company TEXT;
    v_trade TEXT;
    v_role TEXT;
    v_status TEXT;
    v_type TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_area_code INTEGER;
    v_exchange INTEGER;
    v_number TEXT;
    v_email_format INTEGER;
BEGIN
    -- Validate input
    IF p_count <= 0 OR p_count > 1000 THEN
        RAISE EXCEPTION 'Count must be between 1 and 1000';
    END IF;

    -- Generate and insert contacts
    FOR v_i IN 1..p_count LOOP
        -- Random selection from arrays
        v_first_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int];
        v_last_name := v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
        v_company := v_companies[1 + floor(random() * array_length(v_companies, 1))::int];
        v_trade := v_trades[1 + floor(random() * array_length(v_trades, 1))::int];
        v_role := v_roles[1 + floor(random() * array_length(v_roles, 1))::int];
        v_status := v_statuses[1 + floor(random() * array_length(v_statuses, 1))::int];
        
        -- 70% Subcontractors, 30% Team
        IF random() > 0.3 THEN
            v_type := 'Subcontractor';
        ELSE
            v_type := 'Team';
        END IF;
        
        -- Generate phone number
        v_area_code := 200 + floor(random() * 800)::int;
        v_exchange := 200 + floor(random() * 800)::int;
        v_number := lpad(floor(random() * 10000)::text, 4, '0');
        v_phone := format('(%s) %s-%s', v_area_code, v_exchange, v_number);
        
        -- Generate email
        v_email_format := 1 + floor(random() * 4)::int;
        CASE v_email_format
            WHEN 1 THEN
                v_email := lower(v_first_name || '.' || v_last_name);
            WHEN 2 THEN
                v_email := lower(v_first_name || v_last_name);
            WHEN 3 THEN
                v_email := lower(substring(v_first_name, 1, 1) || v_last_name);
            ELSE
                v_email := lower(v_first_name || substring(v_last_name, 1, 1) || floor(random() * 100)::text);
        END CASE;
        
        -- Use company domain or generic domain
        IF random() > 0.3 THEN
            v_email := v_email || '@' || lower(replace(v_company, ' ', '')) || '.com';
        ELSE
            v_email := v_email || '@' || 
                (ARRAY['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'])[1 + floor(random() * 4)::int];
        END IF;
        
        -- Insert contact
        INSERT INTO contacts (
            name,
            role,
            type,
            company,
            trade,
            status,
            email,
            phone,
            created_by_user_id
        ) VALUES (
            v_first_name || ' ' || v_last_name,
            v_role,
            v_type,
            v_company,
            v_trade,
            v_status,
            v_email,
            v_phone,
            p_user_id
        );
        
        v_inserted := v_inserted + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Quick Usage Examples:
-- ============================================================================
-- Generate 50 contacts for the currently authenticated user:
--   SELECT generate_fake_contacts(auth.uid(), 50);
--
-- Generate 100 contacts for a specific user ID:
--   SELECT generate_fake_contacts('your-user-id-here'::uuid, 100);
--
-- Generate 25 contacts (default would be 50, but we're specifying 25):
--   SELECT generate_fake_contacts(auth.uid(), 25);
-- ============================================================================

-- Uncomment the line below to automatically generate 50 contacts for the current user
-- SELECT generate_fake_contacts(auth.uid(), 50);

