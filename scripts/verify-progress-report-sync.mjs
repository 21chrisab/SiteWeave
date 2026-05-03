import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function fail(message) {
  console.error(`progress-report sync check failed: ${message}`);
  process.exit(1);
}

function normalizeFunctionSource(source, functionName) {
  const matcher = new RegExp(`export\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*(?::\\s*[^\\{]+)?\\{[\\s\\S]*?\\n\\}`, 'm');
  const match = source.match(matcher);
  if (!match) return null;
  const fn = match[0];
  const bodyStart = fn.indexOf('{');
  const bodyEnd = fn.lastIndexOf('}');
  const body = bodyStart >= 0 && bodyEnd > bodyStart ? fn.slice(bodyStart + 1, bodyEnd) : fn;
  return body
    .replace(/;+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function expectedSharedTemplateContent() {
  const srcPath = path.join(root, 'src/utils/progressReportEmailTemplates.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  let transformed = src.replace(/import i18n from '\.\.\/i18n\/config';\s*/s, '');
  transformed = transformed.replace(/i18n\.language \|\| 'en'/g, "'en-US'");
  transformed = transformed.replace(/^export function generate/gm, 'function generate');
  transformed = transformed.replace(/^export const generateClientReportEmail.*$/m, '');
  const head = `// AUTO-GENERATED from src/utils/progressReportEmailTemplates.js — run: node scripts/sync-progress-report-templates.mjs
// deno-lint-ignore-file no-explicit-any

`;
  const tail = `
export function buildProgressReportEmail(reportData, filteredData, schedule, branding) {
  const audience = schedule.report_audience_type || 'standard';
  if (audience === 'executive') return generateExecutiveReportEmail(filteredData, schedule, branding);
  // standard / client / internal all use the unified standard template
  return generateStandardReportEmail(filteredData, schedule, branding);
}
`;
  return `${head}${transformed}${tail}`;
}

const sharedTemplatePath = path.join(root, 'supabase/functions/_shared/progressReportEmailTemplates.ts');
const sharedTemplateCurrent = fs.readFileSync(sharedTemplatePath, 'utf8');
if (sharedTemplateCurrent !== expectedSharedTemplateContent()) {
  fail('shared template file is out of sync. Run: npm run sync:progress-report-templates');
}

const srcPdfPath = path.join(root, 'src/utils/progressReportPdfFilename.js');
const appPdfPath = path.join(root, 'apps/web/src/utils/progressReportPdfFilename.js');
const sharedPdfPath = path.join(root, 'supabase/functions/_shared/progressReportPdf.ts');
const srcPdf = fs.readFileSync(srcPdfPath, 'utf8');
const appPdf = fs.readFileSync(appPdfPath, 'utf8');
const sharedPdf = fs.readFileSync(sharedPdfPath, 'utf8');

const srcFn = normalizeFunctionSource(srcPdf, 'defaultProgressReportPdfFilename');
const appFn = normalizeFunctionSource(appPdf, 'defaultProgressReportPdfFilename');
const sharedFn = normalizeFunctionSource(sharedPdf, 'defaultProgressReportPdfFilename');
if (!srcFn || !appFn || !sharedFn) {
  fail('could not parse one or more defaultProgressReportPdfFilename functions');
}

if (srcFn !== sharedFn || srcFn !== appFn) {
  fail('PDF filename helpers are out of sync across src/apps-web/supabase shared files');
}

console.log('progress-report sync check passed');
