/**
 * Normalize field issue open/closed for UI, filters, and counts.
 *
 * Badge previously used (status === 'open') ? Open : Closed, so anything else
 * looked "Closed" while counts only matched status === 'closed'. Imported /
 * fake data often uses `resolved` or mixed casing — align everything on one rule.
 *
 * @param {object} issue row from project_issues
 * @returns {'open'|'closed'}
 */
export function getFieldIssueDisplayStatus(issue) {
  if (!issue) return 'open';
  if (issue.resolved_at) return 'closed';

  const s = (issue.status ?? '').toString().trim().toLowerCase();
  if (s === 'closed' || s === 'resolved' || s === 'complete' || s === 'done') {
    return 'closed';
  }
  return 'open';
}
