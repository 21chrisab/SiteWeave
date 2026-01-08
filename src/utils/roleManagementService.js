/**
 * Role Management Service
 * Handles CRUD operations for dynamic roles
 */

/**
 * Get all roles for an organization
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of roles
 */
export async function getRoles(supabase, organizationId) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

/**
 * Get a single role by ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} roleId - Role ID
 * @returns {Promise<Object|null>} Role object or null
 */
export async function getRole(supabase, roleId) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching role:', error);
    throw error;
  }
}

/**
 * Create a new role
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @param {string} name - Role name
 * @param {Object} permissions - Permissions object (JSONB)
 * @returns {Promise<Object>} Created role
 */
export async function createRole(supabase, organizationId, name, permissions) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        organization_id: organizationId,
        name,
        permissions,
        is_system_role: false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
}

/**
 * Update a role
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} roleId - Role ID
 * @param {Object} updates - Updates object (name, permissions, etc.)
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(supabase, roleId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
}

/**
 * Delete a role
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
export async function deleteRole(supabase, roleId) {
  try {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
}

/**
 * Assign a role to a user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Object>} Updated profile
 */
export async function assignRoleToUser(supabase, userId, roleId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role_id: roleId })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning role to user:', error);
    throw error;
  }
}

