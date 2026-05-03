/**
 * Default .pdf filename for exported / emailed progress reports.
 * Prefer schedule `name` (report name); fall back to email subject.
 * Keep in sync with `supabase/functions/_shared/progressReportPdf.ts`.
 */
export function defaultProgressReportPdfFilename(reportName, subject = '') {
  const primary = String(reportName ?? '').trim()
  const fallback = String(subject ?? '').trim()
  const raw = primary || fallback || 'progress-report'
  const base =
    raw
      .replace(/[^\w\s-]/g, '')
      .trim()
      .slice(0, 80) || 'progress-report'
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`
}
