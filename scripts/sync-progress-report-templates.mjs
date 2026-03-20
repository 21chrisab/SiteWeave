import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/utils/progressReportEmailTemplates.js'), 'utf8');

let s = src.replace(/import i18n from '\.\.\/i18n\/config';\s*/s, '');
s = s.replace(/i18n\.language \|\| 'en'/g, "'en-US'");
s = s.replace(/^export function generate/gm, 'function generate');

const head = `// AUTO-GENERATED from src/utils/progressReportEmailTemplates.js — run: node scripts/sync-progress-report-templates.mjs
// deno-lint-ignore-file no-explicit-any

`;

const tail = `
export function buildProgressReportEmail(reportData, filteredData, schedule, branding) {
  const audience = schedule.report_audience_type || 'internal';
  if (audience === 'client') return generateClientReportEmail(filteredData, schedule, branding);
  if (audience === 'executive') return generateExecutiveReportEmail(filteredData, schedule, branding);
  const enriched = {
    ...reportData,
    summary_stats: {
      tasks_completed: Array.isArray(reportData.completed_tasks) ? reportData.completed_tasks.length : 0,
      status_changes: Array.isArray(reportData.status_changes) ? reportData.status_changes.length : 0,
      phases_updated: Array.isArray(reportData.phase_progress) ? reportData.phase_progress.length : 0,
    },
  };
  return generateInternalReportEmail(enriched, schedule, branding);
}
`;

const outDir = path.join(root, 'supabase/functions/_shared');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'progressReportEmailTemplates.ts'), head + s + tail);
console.log('Wrote supabase/functions/_shared/progressReportEmailTemplates.ts');
