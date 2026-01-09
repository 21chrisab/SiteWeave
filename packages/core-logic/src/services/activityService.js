/**
 * Activity Service
 * Handles activity log operations
 */

/**
 * Fetch recent activity log entries
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {number} limit - Number of entries to fetch (default: 50)
 * @returns {Promise<Array>} Array of activity log entries
 */
export async function fetchActivityLog(supabase, limit = 50) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch recent activity for a specific user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {number} limit - Number of entries to fetch (default: 10)
 * @returns {Promise<Array>} Array of activity log entries
 */
export async function fetchUserActivity(supabase, userId, limit = 10) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

