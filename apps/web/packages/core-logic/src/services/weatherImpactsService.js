/**
 * Weather / schedule impact events for a project (manual reporting + optional date shift).
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} projectId
 * @param {string|null} organizationId
 * @returns {Promise<Array>}
 */
export async function listWeatherImpactsForProject(supabase, projectId, organizationId = null) {
    let query = supabase
        .from('weather_impacts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (organizationId) {
        query = query.eq('organization_id', organizationId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 * @returns {Promise<object>}
 */
export async function createWeatherImpact(supabase, row) {
    const { data, error } = await supabase
        .from('weather_impacts')
        .insert({
            ...row,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateWeatherImpact(supabase, id, updates) {
    const { data, error } = await supabase
        .from('weather_impacts')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteWeatherImpact(supabase, id) {
    const { error } = await supabase
        .from('weather_impacts')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
