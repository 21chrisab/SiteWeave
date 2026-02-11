/**
 * Branding Service
 * Handles organization branding configuration for email reports
 */

/**
 * Get organization branding settings
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Branding configuration
 */
export async function getOrganizationBranding(supabase, organizationId) {
  const { data, error } = await supabase
    .from('organization_branding')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  
  if (error) throw error;
  
  // Return default branding if none exists
  if (!data) {
    return getDefaultBranding();
  }
  
  return data;
}

/**
 * Update organization branding
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @param {Object} brandingData - Branding configuration
 * @returns {Promise<Object>} Updated branding
 */
export async function updateOrganizationBranding(supabase, organizationId, brandingData) {
  const { data, error } = await supabase
    .from('organization_branding')
    .upsert({
      organization_id: organizationId,
      ...brandingData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Upload logo to Supabase Storage
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @param {File} logoFile - Logo file to upload
 * @returns {Promise<string>} Public URL of uploaded logo
 */
export async function uploadLogo(supabase, organizationId, logoFile) {
  const fileExt = logoFile.name.split('.').pop();
  const fileName = `${organizationId}/logo.${fileExt}`;
  const filePath = `branding/${fileName}`;
  
  // Upload file
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, logoFile, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);
  
  // Update branding with logo URL
  await updateOrganizationBranding(supabase, organizationId, {
    logo_url: urlData.publicUrl
  });
  
  return urlData.publicUrl;
}

/**
 * Get default branding configuration
 * @returns {Object} Default branding settings
 */
export function getDefaultBranding() {
  return {
    logo_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    company_footer: null,
    email_signature: null
  };
}
