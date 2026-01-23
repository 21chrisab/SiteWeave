-- ============================================================================
-- Index Audit Script
-- ============================================================================
-- This script identifies:
-- 1. Duplicate indexes (same columns, different names)
-- 2. Unused indexes (low idx_scan count)
-- 3. Missing indexes on foreign keys
-- 4. Indexes that could be combined into composite indexes
-- ============================================================================

-- ============================================================================
-- 1. FIND DUPLICATE INDEXES
-- ============================================================================
-- Indexes on the same table with the same column(s) but different names

SELECT 
    schemaname,
    tablename,
    array_agg(indexname ORDER BY indexname) as duplicate_indexes,
    array_agg(indexdef ORDER BY indexname) as index_definitions,
    count(*) as duplicate_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, 
    -- Extract column list from index definition (simplified)
    regexp_replace(indexdef, '.*\(([^)]+)\).*', '\1', 'g')
HAVING count(*) > 1
ORDER BY tablename, duplicate_count DESC;

-- ============================================================================
-- 2. FIND UNUSED INDEXES
-- ============================================================================
-- Indexes that are rarely or never used (low scan count)

SELECT 
    si.schemaname,
    si.relname as tablename,
    si.indexrelname as indexname,
    si.idx_scan as times_used,
    pg_size_pretty(pg_relation_size(si.indexrelid)) as index_size,
    pi.indexdef
FROM pg_stat_user_indexes si
LEFT JOIN pg_indexes pi
    ON pi.schemaname = si.schemaname
    AND pi.tablename = si.relname
    AND pi.indexname = si.indexrelname
WHERE si.schemaname = 'public'
    AND si.idx_scan < 10  -- Threshold: used less than 10 times
    AND si.indexrelid IS NOT NULL
ORDER BY si.idx_scan ASC, pg_relation_size(si.indexrelid) DESC;

-- ============================================================================
-- 3. FIND MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================
-- Foreign key columns that don't have indexes (can cause slow joins)

SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN idx.indexname IS NULL THEN 'MISSING INDEX'
        ELSE 'HAS INDEX'
    END as index_status
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
    AND idx.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND idx.indexname IS NULL
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 4. FIND POTENTIAL COMPOSITE INDEX OPPORTUNITIES
-- ============================================================================
-- Single-column indexes that are frequently used together in queries
-- (This requires query log analysis - showing structure here)

-- Check for tables with multiple single-column indexes that could be composite
SELECT 
    tablename,
    array_agg(indexname ORDER BY indexname) as single_column_indexes,
    array_agg(
        regexp_replace(indexdef, '.*\(([^)]+)\).*', '\1', 'g')
        ORDER BY indexname
    ) as indexed_columns,
    count(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexdef NOT LIKE '%WHERE%'  -- Exclude partial indexes
    AND indexdef LIKE '%(%'  -- Has columns
GROUP BY tablename
HAVING count(*) >= 3  -- Tables with 3+ single-column indexes
ORDER BY index_count DESC;

-- ============================================================================
-- 5. INDEX SIZE ANALYSIS
-- ============================================================================
-- Identify large indexes that might benefit from optimization

SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    idx_scan as times_used,
    CASE 
        WHEN pg_relation_size(indexrelid) > pg_relation_size(relid) * 0.5 
        THEN 'LARGE INDEX'
        ELSE 'NORMAL'
    END as size_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================================
-- 6. SUMMARY REPORT
-- ============================================================================

DO $$
DECLARE
    duplicate_count INTEGER;
    unused_count INTEGER;
    missing_fk_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT count(*) INTO duplicate_count
    FROM (
        SELECT tablename, 
            regexp_replace(indexdef, '.*\(([^)]+)\).*', '\1', 'g') as cols
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename, cols
        HAVING count(*) > 1
    ) dupes;
    
    -- Count unused
    SELECT count(*) INTO unused_count
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
        AND idx_scan < 10;
    
    -- Count missing FK indexes
    SELECT count(*) INTO missing_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN pg_indexes idx
        ON idx.tablename = tc.table_name
        AND idx.indexdef LIKE '%' || kcu.column_name || '%'
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND idx.indexname IS NULL;
    
    RAISE NOTICE '=== INDEX AUDIT SUMMARY ===';
    RAISE NOTICE 'Duplicate indexes: %', duplicate_count;
    RAISE NOTICE 'Unused indexes (scan < 10): %', unused_count;
    RAISE NOTICE 'Missing FK indexes: %', missing_fk_count;
    RAISE NOTICE 'Review the queries above for detailed information';
END $$;
