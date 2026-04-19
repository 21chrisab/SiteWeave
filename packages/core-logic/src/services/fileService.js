/**
 * File Service
 * Handles file upload and download operations with Supabase Storage
 */

/**
 * Upload a file to Supabase Storage
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @param {File|Blob} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with public URL
 */
export async function uploadFile(supabase, bucket, path, file, options = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      ...options
    });
  
  if (error) {
    // Provide more helpful error message for missing bucket
    if (error.message && error.message.includes('Bucket not found')) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Please create it in your Supabase dashboard: ` +
        `Storage > New bucket > Name: "${bucket}" > Public bucket (if needed)`
      );
    }
    throw error;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return {
    ...data,
    publicUrl: urlData.publicUrl
  };
}

/**
 * Delete a file from Supabase Storage
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @returns {Promise<void>}
 */
export async function deleteFile(supabase, bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
}

/**
 * Get public URL for a file
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @returns {string} Public URL
 */
export function getFileUrl(supabase, bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Create a signed URL for a private file
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @param {number} expiresIn - Expiry in seconds
 * @returns {Promise<string|null>} Signed URL or null when no path is provided
 */
export async function createSignedFileUrl(supabase, bucket, path, expiresIn = 3600) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data?.signedUrl || null;
}

/**
 * Create signed URLs for multiple private files
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {Array<string>} paths - File paths in storage
 * @param {number} expiresIn - Expiry in seconds
 * @returns {Promise<Array<string|null>>} Signed URLs aligned to the input paths
 */
export async function createSignedFileUrls(supabase, bucket, paths, expiresIn = 3600) {
  return Promise.all((paths || []).map((path) => createSignedFileUrl(supabase, bucket, path, expiresIn)));
}

/**
 * List files in a storage bucket
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Array>} Array of file objects
 */
export async function listFiles(supabase, bucket, folder = '') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder);
  
  if (error) throw error;
  return data || [];
}

