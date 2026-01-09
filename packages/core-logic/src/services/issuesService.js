/**
 * Issues Service
 * Handles all field issue-related database operations
 */

/**
 * Fetch field issues for a project
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @param {string} status - Issue status filter (default: 'open')
 * @returns {Promise<Array>} Array of field issues
 */
export async function fetchProjectIssues(supabase, projectId, status = 'open') {
  const { data, error } = await supabase
    .from('project_issues')
    .select(`
      *,
      issue_steps:issue_steps!issue_steps_issue_id_fkey(*, contacts:contacts!fk_issue_steps_assigned_to_contact(name, role, avatar_url)),
      issue_files!fk_issue_files_issue_id(*)
    `)
    .eq('project_id', projectId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch issues assigned to a user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of issues
 */
export async function fetchUserIssues(supabase, userId) {
  // First get the user's contact_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('contact_id')
    .eq('id', userId)
    .single();
  
  if (!profile?.contact_id) {
    return [];
  }
  
  // Then get issues where the user is assigned to a step
  const { data: issueSteps } = await supabase
    .from('issue_steps')
    .select('issue_id')
    .eq('assigned_to_contact_id', profile.contact_id)
    .eq('status', 'pending');
  
  if (!issueSteps || issueSteps.length === 0) {
    return [];
  }
  
  const issueIds = issueSteps.map(step => step.issue_id);
  
  const { data, error } = await supabase
    .from('project_issues')
    .select(`
      *,
      issue_steps:issue_steps!issue_steps_issue_id_fkey(*, contacts:contacts!fk_issue_steps_assigned_to_contact(name, role, avatar_url))
    `)
    .in('id', issueIds)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Create a new field issue
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue
 */
export async function createFieldIssue(supabase, issueData) {
  const { data, error } = await supabase
    .from('project_issues')
    .insert({
      ...issueData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a field issue
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {number} issueId - Issue ID
 * @param {Object} updates - Issue updates
 * @returns {Promise<Object>} Updated issue
 */
export async function updateFieldIssue(supabase, issueId, updates) {
  const { data, error } = await supabase
    .from('project_issues')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', issueId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

