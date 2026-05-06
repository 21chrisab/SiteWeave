/**
 * Org-scoped list helpers for mobile — keep filtering consistent across tabs.
 */

export function filterByOrganizationId(items, orgId) {
  if (!Array.isArray(items)) return []
  if (orgId == null || orgId === '') return []
  return items.filter((item) => item?.organization_id === orgId)
}

export function matchesOrganization(record, orgId) {
  if (!record || orgId == null || orgId === '') return false
  return record.organization_id === orgId
}
