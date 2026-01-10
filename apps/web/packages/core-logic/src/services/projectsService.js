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
 * @returns {Promise<Object|null>} Project object or null if not found
 */
export async function fetchProject(supabase, projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  
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
    .select('project_id, projects!fk_project_contacts_project_id(*)')
    .eq('contact_id', contactId);
  
  if (error) throw error;
  return (data || []).map(item => item.projects).filter(Boolean);
}

/**
 * Fetch active projects count for a user
 * Uses RLS policies to automatically filter projects based on user role
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID (auth.users.id) - not used but kept for API consistency
 * @returns {Promise<number>} Count of active projects
 */
export async function fetchActiveProjectsCount(supabase, userId) {
  // Use RLS policies - they automatically filter based on:
  // - Admins: all projects
  // - PMs: projects where project_manager_id = auth.uid()
  // - Team: projects where created_by_user_id = auth.uid() OR in project_contacts
  const { data, error } = await supabase
    .from('projects')
    .select('id, status')
    .neq('status', 'completed');
  
  if (error) throw error;
  
  return (data || []).length;
}

/**
 * Fetch user projects with calculated progress
 * Uses RLS policies to automatically filter projects based on user role
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID (auth.users.id) - not used but kept for API consistency
 * @returns {Promise<Array>} Array of projects with progress
 */
export async function fetchUserProjectsWithProgress(supabase, userId) {
  // Use RLS policies - they automatically filter based on:
  // - Admins: all projects
  // - PMs: projects where project_manager_id = auth.uid()
  // - Team: projects where created_by_user_id = auth.uid() OR in project_contacts
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  
  const projectsList = projects || [];
  
  // Calculate progress for each project
  const projectsWithProgress = await Promise.all(
    projectsList.map(async (project) => {
      // Get phases for this project
      const { data: phases, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', project.id)
        .order('order');
      
      if (phasesError || !phases || phases.length === 0) {
        return { ...project, progress: 0 };
      }
      
      // Calculate weighted progress
      const totalBudget = phases.reduce((sum, phase) => sum + (phase.budget || 0), 0);
      if (totalBudget === 0) {
        return { ...project, progress: 0 };
      }
      
      const totalWeightedProgress = phases.reduce((sum, phase) => {
        const phaseWeight = (phase.budget || 0) / totalBudget;
        return sum + (phase.progress * phaseWeight);
      }, 0);
      
      return { ...project, progress: Math.round(totalWeightedProgress) };
    })
  );
  
  return projectsWithProgress;
}

