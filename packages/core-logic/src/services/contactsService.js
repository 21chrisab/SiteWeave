/**
 * Contacts Service
 * Handles all contact-related database operations
 */

/**
 * Fetch all contacts
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @returns {Promise<Array>} Array of contacts
 */
export async function fetchContacts(supabase) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch contacts for a specific project
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of contacts assigned to the project
 */
export async function fetchProjectContacts(supabase, projectId) {
  const { data, error } = await supabase
    .from('project_contacts')
    .select('contact_id, contacts!fk_project_contacts_contact_id(*)')
    .eq('project_id', projectId);
  
  if (error) throw error;
  return (data || []).map(item => item.contacts).filter(Boolean);
}

/**
 * Fetch a single contact by ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} contactId - Contact ID
 * @returns {Promise<Object>} Contact object
 */
export async function fetchContact(supabase, contactId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

