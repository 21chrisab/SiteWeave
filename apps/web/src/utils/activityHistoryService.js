/**
 * Paginated reads from activity_log for full history (not the global 50-row widget feed).
 */

const DEFAULT_PAGE_SIZE = 50;

export async function fetchActivityHistoryPage({
  supabase,
  organizationId,
  projectId = null,
  entityType = null,
  offset = 0,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  if (!organizationId) {
    return { rows: [], error: new Error('Missing organizationId') };
  }

  let q = supabase
    .from('activity_log')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (projectId) q = q.eq('project_id', projectId);
  if (entityType) q = q.eq('entity_type', entityType);

  const { data, error } = await q;
  if (error) return { rows: [], error };
  return { rows: data || [], error: null };
}

export { DEFAULT_PAGE_SIZE };
