import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const service = read('packages/core-logic/src/services/progressReportService.js');
  assert(
    !/sendManualReport[\s\S]*updateProgressReportSchedule\(/m.test(service),
    'sendManualReport should not write last_sent_at client-side',
  );

  const sendFn = read('supabase/functions/send-progress-report/index.ts');
  const exportFn = read('supabase/functions/export-progress-report-pdf/index.ts');
  assert(
    sendFn.includes("from '../_shared/generateProgressReportClient.ts'"),
    'send-progress-report should use shared generate client',
  );
  assert(
    exportFn.includes("from '../_shared/generateProgressReportClient.ts'"),
    'export-progress-report-pdf should use shared generate client',
  );

  const generateFn = read('supabase/functions/generate-progress-report/index.ts');
  const requiredErrorMarkers = [
    'Failed to load organization for report generation',
    'Failed to load activity log for report generation',
    'Failed to load project tasks for report generation',
    'Failed to load organization tasks for report generation',
  ];
  for (const marker of requiredErrorMarkers) {
    assert(generateFn.includes(marker), `generate-progress-report missing error marker: ${marker}`);
  }

  console.log('progress-report stability tests passed');
}

run();
