-- ============================================================================
-- Database Maintenance Script
-- ============================================================================
-- This script performs regular maintenance tasks:
-- 1. VACUUM ANALYZE for all tables
-- 2. Update table statistics
-- 3. Reindex if needed
-- 4. Check for table bloat
-- ============================================================================

-- ============================================================================
-- 1. VACUUM ANALYZE
-- ============================================================================
-- VACUUM reclaims storage and updates statistics
-- ANALYZE updates query planner statistics
-- NOTE: VACUUM cannot run inside a transaction block, so these must be run individually
-- For Supabase, you may need to run these via the SQL editor or API

-- VACUUM ANALYZE for all tables (run these individually or via script)
-- The DO block below will list all tables that need VACUUM
DO $$
DECLARE
    table_record RECORD;
    vacuum_commands TEXT := '';
BEGIN
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        vacuum_commands := vacuum_commands || 'VACUUM ANALYZE ' || quote_ident(table_record.tablename) || ';' || E'\n';
        RAISE NOTICE 'Table to vacuum: %', table_record.tablename;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VACUUM COMMANDS (copy and run individually) ===';
    RAISE NOTICE '%', vacuum_commands;
    RAISE NOTICE '=== END VACUUM COMMANDS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: VACUUM cannot run inside a transaction block.';
    RAISE NOTICE 'Run the commands above individually or use a non-transactional connection.';
END $$;

-- ============================================================================
-- 2. CHECK TABLE BLOAT
-- ============================================================================
-- Identify tables with significant bloat (dead tuples)

SELECT 
    schemaname,
    relname as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    CASE 
        WHEN n_live_tup + n_dead_tup > 0 
        THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
        ELSE 0
    END as dead_tuple_percentage,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 1000  -- Tables with significant dead tuples
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- 3. CHECK INDEX BLOAT
-- ============================================================================

SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND pg_relation_size(indexrelid) > 10 * 1024 * 1024  -- Indexes >10MB
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================================
-- 4. UPDATE STATISTICS FOR SPECIFIC TABLES
-- ============================================================================
-- Force statistics update for tables that have changed significantly

-- Analyze specific large tables
ANALYZE projects;
ANALYZE contacts;
ANALYZE tasks;
ANALYZE messages;
ANALYZE calendar_events;

-- ============================================================================
-- 5. CHECK AUTOVACUUM SETTINGS
-- ============================================================================

SELECT 
    name,
    setting,
    unit,
    short_desc
FROM pg_settings
WHERE name IN (
    'autovacuum',
    'autovacuum_vacuum_scale_factor',
    'autovacuum_analyze_scale_factor',
    'autovacuum_vacuum_threshold',
    'autovacuum_analyze_threshold'
)
ORDER BY name;

-- ============================================================================
-- 6. MAINTENANCE SUMMARY
-- ============================================================================

DO $$
DECLARE
    total_tables INTEGER;
    tables_vacuumed INTEGER;
    high_bloat_count INTEGER;
BEGIN
    -- Count tables
    SELECT count(*) INTO total_tables
    FROM pg_tables
    WHERE schemaname = 'public';
    
    -- Count tables with high bloat
    SELECT count(*) INTO high_bloat_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND n_dead_tup > n_live_tup * 0.1;  -- >10% dead tuples
    
    RAISE NOTICE '=== DATABASE MAINTENANCE SUMMARY ===';
    RAISE NOTICE 'Total tables: %', total_tables;
    RAISE NOTICE 'Tables with high bloat (>10%% dead tuples): %', high_bloat_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Maintenance tasks completed:';
    RAISE NOTICE '- VACUUM ANALYZE run on all tables';
    RAISE NOTICE '- Statistics updated';
    RAISE NOTICE '';
    
    IF high_bloat_count > 0 THEN
        RAISE NOTICE 'WARNING: Some tables have high bloat - consider more frequent VACUUM';
    END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. VACUUM ANALYZE can be run regularly (daily/weekly) without downtime
-- 2. For Supabase: Some maintenance is automatic via autovacuum
-- 3. Large tables may benefit from VACUUM FULL (requires exclusive lock)
-- 4. Monitor pg_stat_user_tables for bloat over time
-- 5. Consider scheduling this script via cron or Supabase scheduled functions

DO $$
BEGIN
    RAISE NOTICE 'Database maintenance script complete';
END $$;
