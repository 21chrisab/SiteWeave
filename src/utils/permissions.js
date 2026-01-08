/**
 * Permissions Utility
 * Handles dynamic RBAC permission checks based on JSONB permissions in roles table
 */

/**
 * Get user's role with permissions
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object|null>} Role object with permissions or null
 */
export async function getUserRole(supabase, userId, organizationId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        role_id,
        roles (
          id,
          name,
          permissions,
          is_system_role
        )
      `)
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data?.roles || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} permission - Permission key (e.g., 'can_create_tasks')
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user has permission
 */
export async function hasPermission(supabase, userId, permission, organizationId) {
  try {
    const role = await getUserRole(supabase, userId, organizationId);
    if (!role || !role.permissions) return false;
    
    // Check if permission exists and is true
    return role.permissions[permission] === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user can manage users (Organization Admin only)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can manage users
 */
export async function canManageUsers(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_manage_users', organizationId);
}

/**
 * Check if user can manage projects
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can manage projects
 */
export async function canManageProjects(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_edit_projects', organizationId);
}

/**
 * Check if user can create projects
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can create projects
 */
export async function canCreateProjects(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_create_projects', organizationId);
}

/**
 * Check if user can delete projects
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can delete projects
 */
export async function canDeleteProjects(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_delete_projects', organizationId);
}

/**
 * Check if user can create tasks
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can create tasks
 */
export async function canCreateTasks(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_create_tasks', organizationId);
}

/**
 * Check if user can assign tasks
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can assign tasks
 */
export async function canAssignTasks(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_assign_tasks', organizationId);
}

/**
 * Check if user can manage contacts
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can manage contacts
 */
export async function canManageContacts(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_manage_contacts', organizationId);
}

/**
 * Check if user can view financials
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can view financials
 */
export async function canViewFinancials(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_view_financials', organizationId);
}

/**
 * Check if user can view reports
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<boolean>} True if user can view reports
 */
export async function canViewReports(supabase, userId, organizationId) {
  return hasPermission(supabase, userId, 'can_view_reports', organizationId);
}

