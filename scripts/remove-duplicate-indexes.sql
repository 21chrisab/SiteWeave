-- ============================================================================
-- Remove Duplicate Indexes
-- ============================================================================
-- This script removes redundant indexes after audit
-- WARNING: Run audit-indexes.sql first to identify duplicates
-- Only removes indexes that are exact duplicates (same columns)
-- ============================================================================

-- ============================================================================
-- IDENTIFY DUPLICATE INDEXES
-- ============================================================================
-- Find indexes on the same table with identical column definitions

WITH index_columns AS (
    SELECT 
        schemaname,
        tablename,
        indexname,
        -- Extract column list from index definition
        regexp_replace(
            regexp_replace(indexdef, '.*\(', ''),
            '\).*', ''
        ) as columns,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
),
duplicate_groups AS (
    SELECT 
        schemaname,
        tablename,
        columns,
        array_agg(indexname ORDER BY indexname) as index_names,
        array_agg(indexdef ORDER BY indexname) as index_defs,
        count(*) as duplicate_count
    FROM index_columns
    GROUP BY schemaname, tablename, columns
    HAVING count(*) > 1
)
SELECT 
    schemaname,
    tablename,
    columns,
    index_names,
    duplicate_count
FROM duplicate_groups
ORDER BY tablename, duplicate_count DESC;

-- ============================================================================
-- REMOVE DUPLICATES (MANUAL REVIEW REQUIRED)
-- ============================================================================
-- This section shows how to remove duplicates
-- UNCOMMENT AND MODIFY based on audit results

/*
-- Example: Remove duplicate index, keeping the better-named one
-- DROP INDEX IF EXISTS idx_projects_organization_id_old;
-- DROP INDEX IF EXISTS idx_projects_org_id;

-- Keep: idx_projects_organization_id (most descriptive name)
*/

-- ============================================================================
-- SAFE REMOVAL FUNCTION
-- ============================================================================
-- Function to safely remove duplicate indexes (keeps the first one alphabetically)

DO $$
DECLARE
    dup_record RECORD;
    index_to_keep TEXT;
    index_to_drop TEXT;
BEGIN
    FOR dup_record IN
        WITH index_columns AS (
            SELECT 
                schemaname,
                tablename,
                indexname,
                regexp_replace(
                    regexp_replace(indexdef, '.*\(', ''),
                    '\).*', ''
                ) as columns
            FROM pg_indexes
            WHERE schemaname = 'public'
        ),
        duplicate_groups AS (
            SELECT 
                schemaname,
                tablename,
                columns,
                array_agg(indexname ORDER BY indexname) as index_names,
                count(*) as duplicate_count
            FROM index_columns
            GROUP BY schemaname, tablename, columns
            HAVING count(*) > 1
        )
        SELECT 
            schemaname,
            tablename,
            columns,
            index_names[1] as keep_index,
            index_names[2:] as drop_indexes
        FROM duplicate_groups
    LOOP
        index_to_keep := dup_record.keep_index;
        
        RAISE NOTICE 'Table: %, Columns: %, Keeping: %', 
            dup_record.tablename, 
            dup_record.columns, 
            index_to_keep;
        
        -- Drop other duplicates (keeping the first alphabetically)
        FOREACH index_to_drop IN ARRAY dup_record.drop_indexes
        LOOP
            RAISE NOTICE '  Would drop: % (REVIEW BEFORE UNCOMMENTING)', index_to_drop;
            -- UNCOMMENT TO ACTUALLY DROP:
            -- EXECUTE format('DROP INDEX IF EXISTS %I.%I', dup_record.schemaname, index_to_drop);
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Duplicate index removal analysis complete';
    RAISE NOTICE 'Review the output above and uncomment DROP statements to remove duplicates';
    RAISE NOTICE 'Always keep the most appropriately named index';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check remaining indexes after removal
SELECT 
    tablename,
    count(*) as index_count,
    array_agg(indexname ORDER BY indexname) as indexes
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Always backup before removing indexes
-- 2. Test query performance after removal
-- 3. Keep indexes with the most descriptive names
-- 4. Prefer keeping indexes that are actively used (check pg_stat_user_indexes)
-- 5. Some "duplicates" may serve different purposes (e.g., different sort orders)

DO $$
BEGIN
    RAISE NOTICE 'Duplicate index removal script complete';
    RAISE NOTICE 'Review output and manually remove duplicates as needed';
END $$;
