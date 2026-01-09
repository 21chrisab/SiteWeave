/**
 * User Management Service
 * Handles user invitation and management for Organization Admins
 */

/**
 * Invite a user to join the organization
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} email - Email address to invite
 * @param {string} organizationId - Organization ID
 * @param {string} roleId - Role ID to assign (optional)
 * @param {string} invitedByUserId - User ID of inviter
 * @returns {Promise<{success: boolean, invitationId?: string, error?: string}>}
 */
export async function inviteUser(supabase, email, organizationId, roleId, invitedByUserId) {
  try {
    // Generate invitation token
    const invitationToken = generateInvitationToken();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        organization_id: organizationId,
        role_id: roleId || null,
        invited_by_user_id: invitedByUserId,
        invitation_token: invitationToken,
        status: 'pending'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return { success: false, error: invitationError.message };
    }

    // TODO: Send invitation email with deep link
    // For now, return the invitation token for manual distribution
    return {
      success: true,
      invitationId: invitation.id,
      invitationToken: invitationToken
    };
  } catch (error) {
    console.error('Error inviting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a secure invitation token
 * @returns {string} Invitation token
 */
function generateInvitationToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a user account directly (for Organization Admins)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} email - Email address
 * @param {string} password - Password
 * @param {string} organizationId - Organization ID
 * @param {string} roleId - Role ID to assign
 * @param {string} fullName - Full name
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function createUser(supabase, email, password, organizationId, roleId, fullName) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData?.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Create contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        name: fullName,
        email: email.toLowerCase(),
        type: 'Team',
        organization_id: organizationId
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
      // Continue anyway - contact can be created later
    }

    // Update profile with organization and role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: organizationId,
        role_id: roleId,
        contact_id: contact?.id || null
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return { success: false, error: 'User created but profile update failed' };
    }

    return {
      success: true,
      userId: authData.user.id
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a user from the organization
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID to remove
 * @param {string} organizationId - Organization ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeUserFromOrganization(supabase, userId, organizationId) {
  try {
    // Update profile to remove organization association
    const { error } = await supabase
      .from('profiles')
      .update({
        organization_id: null,
        role_id: null
      })
      .eq('id', userId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing user from organization:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all users in an organization
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of user profiles with roles
 */
export async function getOrganizationUsers(supabase, organizationId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        role_id,
        contact_id,
        is_super_admin,
        created_at,
        roles (
          id,
          name,
          permissions
        ),
        contacts!fk_profiles_contact (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching organization users:', error);
    throw error;
  }
}

