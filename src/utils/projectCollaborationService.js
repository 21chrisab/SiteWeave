/**
 * Project Collaboration Service
 * Handles guest access (project collaborators) for subcontractors
 */

/**
 * Add a user as a project collaborator (guest access)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to add as collaborator
 * @param {string} organizationId - Project's organization ID
 * @param {string} accessLevel - Access level: 'viewer', 'editor', or 'admin'
 * @param {string} invitedByUserId - User ID of inviter
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addProjectCollaborator(
  supabase,
  projectId,
  userId,
  organizationId,
  accessLevel = 'viewer',
  invitedByUserId
) {
  try {
    const { data, error } = await supabase
      .from('project_collaborators')
      .insert({
        project_id: projectId,
        user_id: userId,
        organization_id: organizationId,
        access_level: accessLevel,
        invited_by_user_id: invitedByUserId
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (user already collaborator)
      if (error.code === '23505') {
        return { success: false, error: 'User is already a collaborator on this project' };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error adding project collaborator:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a user from project collaborators
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeProjectCollaborator(supabase, projectId, userId) {
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing project collaborator:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update collaborator access level
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @param {string} accessLevel - New access level: 'viewer', 'editor', or 'admin'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateCollaboratorAccess(
  supabase,
  projectId,
  userId,
  accessLevel
) {
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .update({ access_level: accessLevel })
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating collaborator access:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all collaborators for a project
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of collaborators with user info
 */
export async function getProjectCollaborators(supabase, projectId) {
  try {
    const { data, error } = await supabase
      .from('project_collaborators')
      .select(`
        id,
        user_id,
        access_level,
        created_at,
        invited_by_user_id,
        profiles!project_collaborators_user_id_fkey (
          id,
          contacts (
            id,
            name,
            email,
            avatar_url
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching project collaborators:', error);
    throw error;
  }
}

/**
 * Get all projects a user is collaborating on (as guest)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of projects
 */
export async function getUserCollaborationProjects(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('project_collaborators')
      .select(`
        project_id,
        access_level,
        created_at,
        projects (
          id,
          name,
          address,
          status,
          project_type,
          organization_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user collaboration projects:', error);
    throw error;
  }
}

