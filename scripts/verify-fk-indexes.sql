-- ============================================================================
-- Verify Foreign Key Indexes
-- ============================================================================
-- This script verifies that all foreign key columns have supporting indexes
-- Foreign keys without indexes can cause slow joins and constraint checks
-- ============================================================================

-- ============================================================================
-- CHECK FOR MISSING FOREIGN KEY INDEXES
-- ============================================================================

SELECT
    'MISSING INDEX' as status,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes idx
    ON idx.tablename = tc.table_name
    AND idx.schemaname = tc.table_schema
    AND (
        idx.indexdef LIKE '%' || kcu.column_name || '%'
        OR idx.indexdef LIKE kcu.column_name || '%'
    )
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND idx.indexname IS NULL
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- VERIFY EXISTING FOREIGN KEY INDEXES
-- ============================================================================

SELECT
    'HAS INDEX' as status,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    idx.indexname,
    idx.indexdef
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN pg_indexes idx
    ON idx.tablename = tc.table_name
    AND idx.schemaname = tc.table_schema
    AND (
        idx.indexdef LIKE '%' || kcu.column_name || '%'
        OR idx.indexdef LIKE kcu.column_name || '%'
    )
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
    total_fks INTEGER;
    indexed_fks INTEGER;
    missing_fks INTEGER;
BEGIN
    -- Count total foreign keys
    SELECT count(*) INTO total_fks
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public';
    
    -- Count indexed foreign keys
    SELECT count(DISTINCT tc.table_name || '.' || kcu.column_name) INTO indexed_fks
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN pg_indexes idx
        ON idx.tablename = tc.table_name
        AND idx.indexdef LIKE '%' || kcu.column_name || '%'
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    
    missing_fks := total_fks - indexed_fks;
    
    RAISE NOTICE '=== FOREIGN KEY INDEX VERIFICATION ===';
    RAISE NOTICE 'Total foreign keys: %', total_fks;
    RAISE NOTICE 'Indexed foreign keys: %', indexed_fks;
    RAISE NOTICE 'Missing indexes: %', missing_fks;
    
    IF missing_fks > 0 THEN
        RAISE NOTICE 'WARNING: Some foreign keys are missing indexes';
        RAISE NOTICE 'Review the query results above to identify which ones';
    ELSE
        RAISE NOTICE 'SUCCESS: All foreign keys have supporting indexes';
    END IF;
END $$;
