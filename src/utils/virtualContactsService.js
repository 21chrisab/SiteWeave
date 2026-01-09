/**
 * Virtual Contacts Service
 * Implements the "Corporate Directory" model:
 * - Group A (Internal): All users where organization_id matches current_user.organization_id
 * - Group B (External/Guests): All users who are project_collaborators on the same projects as the current user
 * 
 * Privacy Guard: Guest users can only see Group B (people on their projects), not Group A
 */

/**
 * Check if a user is a guest (not an organization member)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user is a guest
 */
export async function isGuestUser(supabase, userId) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();
    
    // User is a guest if they have no organization_id
    return !profile?.organization_id;
  } catch (error) {
    console.error('Error checking if user is guest:', error);
    return false;
  }
}

/**
 * Get virtual contacts (Organization Directory + Project Collaborators)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - Current user ID
 * @param {string} organizationId - Current user's organization ID (null for guests)
 * @param {Array<string>} userProjectIds - Array of project IDs the user has access to
 * @returns {Promise<Array>} Array of virtual contacts
 */
export async function getVirtualContacts(supabase, userId, organizationId, userProjectIds = []) {
  try {
    const isGuest = !organizationId;
    const contacts = [];
    const contactMap = new Map(); // Use Map to deduplicate by user ID

    // Group A: Organization Members (only if user is NOT a guest)
    if (!isGuest && organizationId) {
      const { data: orgMembers, error: orgError } = await supabase
        .from('profiles')
        .select(`
          id,
          created_at,
          organization_id,
          contacts!fk_profiles_contact (
            id,
            name,
            email,
            role,
            phone,
            avatar_url,
            status,
            type,
            company,
            trade
          ),
          roles (
            id,
            name,
            permissions
          )
        `)
        .eq('organization_id', organizationId);

      if (orgError) {
        console.error('Error fetching organization members:', orgError);
      } else if (orgMembers) {
        orgMembers.forEach(member => {
          if (member.contacts) {
            const contact = {
              id: member.contacts.id,
              name: member.contacts.name,
              email: member.contacts.email,
              role: member.contacts.role,
              phone: member.contacts.phone,
              avatar_url: member.contacts.avatar_url,
              status: member.contacts.status || 'Available',
              type: member.contacts.type || 'Team',
              company: member.contacts.company,
              trade: member.contacts.trade,
              profile_id: member.id,
              organization_id: member.organization_id,
              role_id: member.roles?.id,
              role_name: member.roles?.name,
              is_internal: true,
              project_contacts: [] // Will be populated separately if needed
            };
            contactMap.set(member.id, contact);
          }
        });
      }
    }

    // Group B: Project Collaborators (users on same projects as current user)
    if (userProjectIds.length > 0) {
      const { data: collaborators, error: collabError } = await supabase
        .from('project_collaborators')
        .select(`
          user_id,
          project_id,
          access_level,
          profiles!project_collaborators_user_id_fkey (
            id,
            organization_id,
            contacts!fk_profiles_contact (
              id,
              name,
              email,
              role,
              phone,
              avatar_url,
              status,
              type,
              company,
              trade
            ),
            roles (
              id,
              name,
              permissions
            )
          )
        `)
        .in('project_id', userProjectIds);

      if (collabError) {
        console.error('Error fetching project collaborators:', collabError);
      } else if (collaborators) {
        collaborators.forEach(collab => {
          const profile = collab.profiles;
          if (profile && profile.contacts) {
            const existingContact = contactMap.get(profile.id);
            
            if (existingContact) {
              // User already in map (internal member), just add project_contact
              if (!existingContact.project_contacts) {
                existingContact.project_contacts = [];
              }
              existingContact.project_contacts.push({
                project_id: collab.project_id,
                access_level: collab.access_level
              });
            } else {
              // New external/guest contact
              const contact = {
                id: profile.contacts.id,
                name: profile.contacts.name,
                email: profile.contacts.email,
                role: profile.contacts.role,
                phone: profile.contacts.phone,
                avatar_url: profile.contacts.avatar_url,
                status: profile.contacts.status || 'Available',
                type: profile.contacts.type || 'Subcontractor',
                company: profile.contacts.company,
                trade: profile.contacts.trade,
                profile_id: profile.id,
                organization_id: profile.organization_id,
                role_id: profile.roles?.id,
                role_name: profile.roles?.name,
                is_internal: false,
                is_guest: !profile.organization_id || profile.organization_id !== organizationId,
                project_contacts: [{
                  project_id: collab.project_id,
                  access_level: collab.access_level
                }]
              };
              contactMap.set(profile.id, contact);
            }
          }
        });
      }
    }

    // Convert Map to Array
    return Array.from(contactMap.values());
  } catch (error) {
    console.error('Error fetching virtual contacts:', error);
    return [];
  }
}

/**
 * Get project_contacts relationships for virtual contacts
 * This is a helper to populate project_contacts for internal members
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Array<string>} contactIds - Array of contact IDs
 * @returns {Promise<Array>} Array of project_contacts relationships
 */
export async function getProjectContactsForContacts(supabase, contactIds) {
  if (!contactIds || contactIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('project_contacts')
      .select('contact_id, project_id')
      .in('contact_id', contactIds);

    if (error) {
      console.error('Error fetching project_contacts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching project_contacts:', error);
    return [];
  }
}
