-- ============================================================================
-- Query Pattern Analysis
-- ============================================================================
-- This script helps identify:
-- 1. Most frequently executed queries
-- 2. Slow queries (>100ms)
-- 3. Queries doing sequential scans
-- 4. Missing index opportunities
-- ============================================================================

-- ============================================================================
-- 1. QUERY STATISTICS (if pg_stat_statements is enabled)
-- ============================================================================

-- Check if pg_stat_statements extension is available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN
        RAISE NOTICE 'pg_stat_statements is enabled - showing query statistics';
    ELSE
        RAISE NOTICE 'pg_stat_statements is not enabled';
        RAISE NOTICE 'Enable it for detailed query analysis: CREATE EXTENSION pg_stat_statements;';
    END IF;
END $$;

-- Most frequently executed queries (if extension enabled)
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 20;

-- Slowest queries (if extension enabled)
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking >100ms on average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================================================
-- 2. SEQUENTIAL SCANS (Full table scans - usually bad)
-- ============================================================================

SELECT 
    schemaname,
    relname as tablename,
    seq_scan as sequential_scans,
    seq_tup_read as tuples_read,
    idx_scan as index_scans,
    seq_tup_read / NULLIF(seq_scan, 0) as avg_tuples_per_scan,
    CASE 
        WHEN seq_scan > idx_scan THEN 'NEEDS INDEX'
        ELSE 'OK'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 20;

-- ============================================================================
-- 3. INDEX USAGE STATISTICS
-- ============================================================================

-- Indexes that are never used
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
    AND si.idx_scan = 0
    AND si.indexrelid IS NOT NULL
ORDER BY pg_relation_size(si.indexrelid) DESC;

-- Most used indexes
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================================
-- 4. TABLE STATISTICS
-- ============================================================================

-- Table sizes and row counts
SELECT 
    schemaname,
    relname as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
LIMIT 20;

-- ============================================================================
-- 5. MISSING INDEX OPPORTUNITIES
-- ============================================================================

-- Tables with high sequential scan to index scan ratio
SELECT 
    t.schemaname,
    t.relname as tablename,
    t.seq_scan,
    t.idx_scan,
    CASE 
        WHEN t.seq_scan + t.idx_scan > 0 
        THEN round(100.0 * t.seq_scan / (t.seq_scan + t.idx_scan), 2)
        ELSE 0
    END as seq_scan_percentage,
    t.n_live_tup as row_count
FROM pg_stat_user_tables t
WHERE t.schemaname = 'public'
    AND t.seq_scan > t.idx_scan * 2  -- More seq scans than index scans
    AND t.n_live_tup > 1000  -- Only tables with significant data
ORDER BY seq_scan_percentage DESC;

-- ============================================================================
-- 6. RECOMMENDATIONS
-- ============================================================================

DO $$
DECLARE
    high_seq_scan_count INTEGER;
    unused_index_count INTEGER;
    large_table_count INTEGER;
BEGIN
    -- Count tables with high sequential scan ratio
    SELECT count(*) INTO high_seq_scan_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND seq_scan > idx_scan * 2
        AND n_live_tup > 1000;
    
    -- Count unused indexes
    SELECT count(*) INTO unused_index_count
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
        AND idx_scan = 0;
    
    -- Count large tables (>100MB)
    SELECT count(*) INTO large_table_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND pg_total_relation_size(schemaname||'.'||relname) > 100 * 1024 * 1024;
    
    RAISE NOTICE '=== QUERY PATTERN ANALYSIS SUMMARY ===';
    RAISE NOTICE 'Tables with high sequential scans: %', high_seq_scan_count;
    RAISE NOTICE 'Unused indexes: %', unused_index_count;
    RAISE NOTICE 'Large tables (>100MB): %', large_table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATIONS:';
    
    IF high_seq_scan_count > 0 THEN
        RAISE NOTICE '- Consider adding indexes for tables with high sequential scan ratios';
    END IF;
    
    IF unused_index_count > 0 THEN
        RAISE NOTICE '- Consider removing unused indexes to reduce write overhead';
    END IF;
    
    IF large_table_count > 0 THEN
        RAISE NOTICE '- Large tables detected - ensure proper indexing and consider partitioning';
    END IF;
END $$;
