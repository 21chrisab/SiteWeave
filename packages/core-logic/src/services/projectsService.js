/**
 * Projects Service
 * Handles all project-related database operations
 */

/**
 * Fetch all projects
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @returns {Promise<Array>} Array of projects
 */
export async function fetchProjects(supabase) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single project by ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project object
 */
export async function fetchProject(supabase, projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Fetch projects for a specific user (based on project_contacts)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} contactId - Contact ID
 * @returns {Promise<Array>} Array of projects
 */
export async function fetchUserProjects(supabase, contactId) {
  const { data, error } = await supabase
    .from('project_contacts')
    .select('project_id, projects(*)')
    .eq('contact_id', contactId);
  
  if (error) throw error;
  return (data || []).map(item => item.projects).filter(Boolean);
}

