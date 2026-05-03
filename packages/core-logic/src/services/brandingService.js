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

  if (!data) {
    return getDefaultBranding();
  }

  return {
    ...data,
    primary_color: data.primary_color ?? '#3B82F6',
    secondary_color: data.secondary_color ?? '#10B981',
    company_footer: data.company_footer ?? '',
    email_signature: data.email_signature ?? '',
  };
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

/** Storage bucket for org logos (Supabase: Storage → New bucket → name: branding, public read + upload policies). */
const BRANDING_LOGO_BUCKET = 'branding';

/**
 * Same storage path is reused (logo.png / logo.jpg), so the public URL string is stable.
 * Browsers and CDNs cache by URL — append a version query so previews and emails fetch the new bytes.
 */
function publicLogoUrlWithCacheBust(publicUrl) {
  const base = String(publicUrl || '').replace(/[?#].*$/, '');
  return `${base}?v=${Date.now()}`;
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
  const filePath = `${organizationId}/logo.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BRANDING_LOGO_BUCKET)
    .upload(filePath, logoFile, {
      // Short TTL: path is reused on replace; query `v=` on the stored URL is the real cache-bust.
      cacheControl: '120',
      upsert: true,
    });

  if (uploadError) {
    if (uploadError.message && uploadError.message.includes('Bucket not found')) {
      throw new Error(
        `Storage bucket "${BRANDING_LOGO_BUCKET}" not found. In Supabase: Storage → New bucket → name "${BRANDING_LOGO_BUCKET}" → enable Public if using public URLs → add policies for authenticated upload.`
      );
    }
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from(BRANDING_LOGO_BUCKET)
    .getPublicUrl(filePath);

  const logoUrl = publicLogoUrlWithCacheBust(urlData.publicUrl);

  await updateOrganizationBranding(supabase, organizationId, {
    logo_url: logoUrl,
  });

  return logoUrl;
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
    company_footer: '',
    email_signature: ''
  };
}
