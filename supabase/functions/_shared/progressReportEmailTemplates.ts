// AUTO-GENERATED from src/utils/progressReportEmailTemplates.js — run: node scripts/sync-progress-report-templates.mjs
// deno-lint-ignore-file no-explicit-any

/**
 * Progress Report Email Templates
 * Generates HTML email templates for different audience types.
 *
 * Design principles: excellent typography, generous whitespace, deterministic
 * copy (no AI for narrative). Zero heavy animations.
 *
 * Edge functions use a generated copy: run `npm run sync:progress-report-templates`
 * after changing this file so `send-progress-report` / `export-progress-report-pdf` stay in sync.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReportPeriod(startDate, endDate) {
  if (!startDate && !endDate) return '';
  if (startDate && endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }
  return startDate ? `Since ${formatDate(startDate)}` : `Up to ${formatDate(endDate)}`;
}

function translateToClientFriendly(status) {
  const map = { 'In Progress': 'Active', 'On Hold': 'Paused', 'Completed': 'Finished' };
  return map[status] || status;
}

/** Derive which sections are enabled; default all content sections true, detail flags false. */
function resolveSections(schedule) {
  const s = schedule?.report_sections || {};
  const weeklySetting = s.weekly_plan ?? s.lookahead;
  return {
    status_changes:   s.status_changes   !== false,
    task_completion:  s.task_completion  !== false,
    phase_changes:    s.phase_changes    !== false,
    vitals:           s.vitals           !== false,
    weekly_plan:      weeklySetting      !== false,
    // detail-level toggles (default off = clean client-facing output)
    show_assignees:         s.show_assignees        === true,
    show_dates:             s.show_dates            === true,
    show_who_changed:       s.show_who_changed      === true,
    show_phase_delta:       s.show_phase_delta      === true,
    show_blockers:          s.show_blockers         === true,
    show_weather_impacts:   s.show_weather_impacts  === true,
    include_task_photos:    s.include_task_photos === true,
    client_friendly_labels: s.client_friendly_labels !== false, // default true
  };
}

// ─── shared email shell ────────────────────────────────────────────────────────

function emailShell({ subject, branding, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:24px 20px 32px;">
        <div style="max-width:600px;margin:0 auto;">
          <div style="padding:8px 0 20px;">
            ${branding.logo_url ? `<div style="text-align:center;margin-bottom:24px;">
              <img src="${branding.logo_url}" alt="Logo" style="max-height:56px;max-width:180px;">
            </div>` : ''}
            ${bodyHtml}
          </div>
          ${branding.company_footer ? `
          <div style="padding:16px 0 0;margin-top:12px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">${branding.company_footer}</p>
          </div>` : ''}
          ${branding.email_signature ? `
          <div style="padding:12px 0 0;margin-top:12px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">${escapeHtml(branding.email_signature)}</p>
          </div>` : ''}
          <div style="padding:12px 0 0;margin-top:12px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">Automated progress report from ${escapeHtml(branding.organization_name || 'SiteWeave')}</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── vitals row ────────────────────────────────────────────────────────────────

function vitalsHtml(vitals, primary, secondary) {
  if (!vitals) return '';
  const cells = [];
  if (vitals.tasks_completed_count != null) {
    cells.push({ val: vitals.tasks_completed_count, label: 'Total completed', color: secondary });
  }
  if (vitals.open_tasks_count != null) {
    cells.push({ val: vitals.open_tasks_count, label: 'Open Tasks', color: primary });
  }
  if (vitals.current_phase) {
    cells.push({
      val: vitals.current_phase,
      subVal: vitals.phase_progress_pct != null ? `${vitals.phase_progress_pct}% complete` : null,
      label: 'Current Phase',
      color: '#374151',
      isText: true,
    });
  }
  if (cells.length === 0) return '';
  const width = `${Math.floor(100 / cells.length)}%`;
  const cellHtml = cells.map((c, idx) => `
    <td style="width:${width};text-align:center;padding:16px 12px;${idx > 0 ? 'border-left:1px solid #e5e7eb;' : ''}">
      ${c.isText
        ? `<p style="margin:0;font-size:15px;font-weight:600;color:${c.color};line-height:1.3;">${escapeHtml(String(c.val))}</p>
           ${c.subVal ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${escapeHtml(c.subVal)}</p>` : ''}`
        : `<p style="margin:0;font-size:30px;font-weight:700;color:${c.color};line-height:1;">${escapeHtml(String(c.val))}</p>`}
      <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:500;">${escapeHtml(c.label)}</p>
    </td>`).join('');
  return `
  <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin-bottom:28px;">
    <tr>${cellHtml}</tr>
  </table>`;
}

// ─── lookahead section ─────────────────────────────────────────────────────────

function weeklyPlanHtml(reportData, primary) {
  const lastWeek = reportData.last_week_done || [];
  const thisWeek = reportData.this_week_plan || [];
  const nextWeek = reportData.next_week_plan || [];
  const hasAny = lastWeek.length > 0 || thisWeek.length > 0 || nextWeek.length > 0;
  if (!hasAny) {
    return `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Weekly Plan', primary)}
      <p style="margin:0;color:#6b7280;font-size:13px;">No updates were scheduled for last week, this week, or next week.</p>
    </div>`;
  }
  return `
  <div style="margin-bottom:28px;">
    ${sectionHeading('Weekly Plan', primary)}
    <div style="margin-bottom:14px;">
      <p style="margin:0 0 6px;color:#065f46;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">We did this last week</p>
      ${lastWeek.length
        ? `<ul style="margin:0;padding-left:18px;color:#374151;">${lastWeek.map((task) => `<li style="margin-bottom:6px;font-size:13px;line-height:1.5;">${escapeHtml(task.text || 'Task')}</li>`).join('')}</ul>`
        : '<p style="margin:0;color:#6b7280;font-size:13px;">No completed tasks in the last week.</p>'}
    </div>
    <div style="margin-bottom:14px;">
      <p style="margin:0 0 6px;color:#1e3a8a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Here is what we are doing this week</p>
      ${thisWeek.length
        ? `<ul style="margin:0;padding-left:18px;color:#374151;">${thisWeek.map((task) => `<li style="margin-bottom:6px;font-size:13px;line-height:1.5;">${escapeHtml(task.text || 'Task')}${task.start_date ? `<span style="color:#9ca3af;font-size:11px;"> (starts ${escapeHtml(String(task.start_date))})</span>` : ''}</li>`).join('')}</ul>`
        : '<p style="margin:0;color:#6b7280;font-size:13px;">No tasks scheduled this week.</p>'}
    </div>
    <div>
      <p style="margin:0 0 6px;color:#3730a3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Here is what we will do next week</p>
      ${nextWeek.length
        ? `<ul style="margin:0;padding-left:18px;color:#374151;">${nextWeek.map((task) => `<li style="margin-bottom:6px;font-size:13px;line-height:1.5;">${escapeHtml(task.text || 'Task')}${task.start_date ? `<span style="color:#9ca3af;font-size:11px;"> (starts ${escapeHtml(String(task.start_date))})</span>` : ''}</li>`).join('')}</ul>`
        : '<p style="margin:0;color:#6b7280;font-size:13px;">No tasks scheduled for next week.</p>'}
    </div>
  </div>`;
}

// ─── section heading helper ────────────────────────────────────────────────────

function sectionHeading(title, primary) {
  return `<h2 style="color:#1f2937;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid ${primary};">${escapeHtml(title)}</h2>`;
}

function weatherImpactsHtml(reportData, primary) {
  const items = reportData.weather_impacts || [];
  if (!items.length) return '';
  return `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Weather & schedule impacts', primary)}
      <ul style="margin:0;padding-left:18px;color:#374151;">
        ${items.map((w) => `
          <li style="margin-bottom:12px;font-size:14px;line-height:1.6;">
            <strong>${escapeHtml(w.title || 'Impact')}</strong>
            ${w.project_name ? ` <span style="color:#9ca3af;font-size:12px;">(${escapeHtml(w.project_name)})</span>` : ''}
            <br/>
            <span style="color:#6b7280;">${escapeHtml(String(w.days_lost ?? ''))} calendar day${Number(w.days_lost) !== 1 ? 's' : ''} lost</span>
            ${w.schedule_shift_applied ? ' · <span style="color:#059669;">schedule updated</span>' : ' · <span style="color:#9ca3af;">logged only</span>'}
            ${w.description ? `<br/><span>${escapeHtml(w.description)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>`;
}

function taskPhotosHtml(photos = []) {
  if (!photos || photos.length === 0) return '';
  return `
  <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;">
    ${photos.map((photo) => `
      <div style="width:120px;">
        <a href="${escapeHtml(photo.full_url || photo.thumbnail_url || '#')}" target="_blank" rel="noreferrer" style="display:block;text-decoration:none;">
          <img
            src="${escapeHtml(photo.thumbnail_url || photo.full_url || '')}"
            alt="${escapeHtml(photo.caption || 'Task photo')}"
            style="display:block;width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;background:#f9fafb;"
          >
        </a>
        ${photo.caption ? `<p style="margin:6px 0 0;color:#6b7280;font-size:11px;line-height:1.4;">${escapeHtml(photo.caption)}</p>` : ''}
        ${photo.is_completion_photo ? `<p style="margin:4px 0 0;color:#059669;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Completion photo</p>` : ''}
      </div>`).join('')}
  </div>`;
}

// ─── STANDARD template (replaces both Client and Internal) ────────────────────
// Detail-level flags in report_sections control what recipients see.

function generateStandardReportEmail(reportData, schedule, branding) {
  const subject = schedule.custom_subject || `Progress Update: ${reportData.project_name || 'Your Project'}`;
  const period  = formatReportPeriod(reportData.start_date, reportData.end_date);
  const primary   = branding.primary_color   || '#3B82F6';
  const secondary = branding.secondary_color || '#10B981';
  const sections  = resolveSections(schedule);
  const isInternalAudience = schedule.report_audience_type === 'internal';
  const showTaskPhotos = isInternalAudience || sections.include_task_photos;

  const hasActivity =
    (reportData.status_changes  && reportData.status_changes.length  > 0) ||
    (reportData.completed_tasks && reportData.completed_tasks.length > 0) ||
    (reportData.phase_progress  && reportData.phase_progress.length  > 0) ||
    (reportData.weather_impacts && reportData.weather_impacts.length > 0);

  const snap = reportData.snapshot;
  const snapshotSection = !hasActivity && snap && (snap.open_tasks?.length || snap.phases?.length || snap.open_total != null)
    ? `<div style="margin-bottom:28px;padding:20px;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 14px;color:#6b7280;font-size:14px;line-height:1.6;">No changes recorded in this reporting window. Here is a snapshot as of today.</p>
        ${snap.open_total != null || snap.completed_total != null
          ? `<p style="margin:0 0 14px;color:#374151;font-size:14px;"><strong>${snap.open_total ?? 0}</strong> open, <strong>${snap.completed_total ?? 0}</strong> completed overall.</p>`
          : ''}
        ${snap.open_tasks?.length ? `
          <p style="margin:0 0 8px;color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Open work</p>
          <ul style="margin:0 0 16px;padding-left:18px;color:#374151;">
            ${snap.open_tasks.map(ot => `<li style="margin-bottom:5px;font-size:13px;line-height:1.5;">
              ${escapeHtml(ot.text || 'Task')}
              ${ot.due_date ? `<span style="color:#9ca3af;font-size:11px;"> — due ${escapeHtml(String(ot.due_date))}</span>` : ''}
              ${showTaskPhotos && ot.photos?.length ? taskPhotosHtml(ot.photos) : ''}
            </li>`).join('')}
          </ul>` : ''}
        ${snap.phases?.length ? `
          <p style="margin:0 0 8px;color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Phase progress</p>
          ${snap.phases.map(ph => `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;color:#374151;">${escapeHtml(ph.name || 'Phase')}</span>
                <span style="font-size:12px;color:#6b7280;">${ph.progress || 0}%</span>
              </div>
              <div style="background-color:#e5e7eb;border-radius:3px;height:6px;overflow:hidden;">
                <div style="background-color:${secondary};height:100%;width:${Math.min(100, Math.max(0, ph.progress || 0))}%;"></div>
              </div>
            </div>`).join('')}` : ''}
      </div>` : '';

  // Completed tasks — table (with assignee/date columns) or simple list
  const tasksHtml = sections.task_completion && reportData.completed_tasks?.length
    ? `<div style="margin-bottom:28px;">
        ${sectionHeading('Completed This Period', primary)}
        ${showTaskPhotos
          ? `${reportData.completed_tasks.map(task => `
              <div style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
                <div style="display:flex;align-items:flex-start;gap:8px;font-size:14px;color:#374151;line-height:1.5;">
                  <span style="color:${secondary};font-weight:700;flex-shrink:0;">✓</span>
                  <div style="flex:1;">
                    <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">${escapeHtml(task.text || task.title)}</p>
                    <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">
                      ${task.assignee ? `@${escapeHtml(task.assignee)}` : ''}
                      ${task.assignee && task.completed_at ? ' · ' : ''}
                      ${task.completed_at ? formatDate(task.completed_at) : ''}
                    </p>
                    ${taskPhotosHtml(task.photos || [])}
                  </div>
                </div>
              </div>`).join('')}`
          : (sections.show_assignees || sections.show_dates)
          ? `<table role="presentation" style="width:100%;border-collapse:collapse;">
              ${reportData.completed_tasks.map(task => `
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:8px 8px 8px 0;width:20px;color:${secondary};font-weight:700;">✓</td>
                  <td style="padding:8px 0;font-size:14px;color:#374151;">${escapeHtml(task.text || task.title)}</td>
                  ${sections.show_assignees && task.assignee
                    ? `<td style="padding:8px 0 8px 8px;font-size:12px;color:#9ca3af;text-align:right;white-space:nowrap;">@${escapeHtml(task.assignee)}</td>`
                    : '<td></td>'}
                  ${sections.show_dates && task.completed_at
                    ? `<td style="padding:8px 0 8px 8px;font-size:11px;color:#9ca3af;text-align:right;white-space:nowrap;">${formatDate(task.completed_at)}</td>`
                    : '<td></td>'}
                </tr>`).join('')}
            </table>`
          : `<ul style="margin:0;padding:0;list-style:none;">
              ${reportData.completed_tasks.map(task => `
                <li style="padding:7px 0;border-bottom:1px solid #f3f4f6;display:flex;align-items:flex-start;gap:8px;font-size:14px;color:#374151;line-height:1.5;">
                  <span style="color:${secondary};font-weight:700;flex-shrink:0;">✓</span>
                  <span>${escapeHtml(task.text || task.title)}</span>
                </li>`).join('')}
            </ul>`}
      </div>`
    : '';

  const headerProjectTitle = reportData.project_name || reportData.organization_name || 'Project';
  let body = `
    <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 6px;">Progress Update</h1>
    <p style="color:#1d4ed8;font-size:16px;font-weight:600;margin:0 0 8px;">${escapeHtml(headerProjectTitle)}</p>
    <p style="color:#6b7280;font-size:13px;margin:0 0 28px;">${escapeHtml(period)}</p>

    ${schedule.custom_message ? `
    <div style="background-color:#f0f9ff;border-left:4px solid ${secondary};padding:14px 16px;margin-bottom:28px;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.7;">${escapeHtml(schedule.custom_message)}</p>
    </div>` : ''}

    ${sections.vitals ? vitalsHtml(reportData.vitals, primary, secondary) : ''}

    ${sections.status_changes && reportData.status_changes?.length ? `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Status Update', primary)}
      ${reportData.status_changes.map(change => {
        const label = sections.client_friendly_labels
          ? translateToClientFriendly(change.new_status)
          : (change.new_status || '');
        return `
        <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 14px;margin-bottom:8px;">
          <p style="margin:0;color:#166534;font-weight:600;font-size:14px;">${escapeHtml(change.project_name || 'Project')}</p>
          <p style="margin:5px 0 0;color:#15803d;font-size:13px;">
            <span style="text-decoration:line-through;color:#9ca3af;">${escapeHtml(change.old_status)}</span>
            <span style="margin:0 6px;color:#6b7280;">→</span>
            <strong style="color:${secondary};">${escapeHtml(label)}</strong>
            ${sections.show_who_changed && change.changed_by ? `<span style="color:#9ca3af;font-size:11px;margin-left:6px;">· ${escapeHtml(change.changed_by)}</span>` : ''}
            ${sections.show_who_changed && change.changed_at ? `<span style="color:#9ca3af;font-size:11px;margin-left:4px;">${formatDate(change.changed_at)}</span>` : ''}
          </p>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${tasksHtml}

    ${sections.phase_changes && reportData.phase_progress?.length ? `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Phase Progress', primary)}
      ${reportData.phase_progress.map(phase => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:13px;font-weight:500;color:#374151;">${escapeHtml(phase.name)}</span>
            <span style="font-size:13px;font-weight:600;color:${primary};">
              ${sections.show_phase_delta && phase.old_progress != null
                ? `${phase.old_progress || 0}% → ${phase.progress || 0}%`
                : `${phase.progress || 0}%`}
            </span>
          </div>
          <div style="background-color:#e5e7eb;border-radius:3px;height:8px;overflow:hidden;">
            <div style="background-color:${secondary};height:100%;width:${phase.progress || 0}%;"></div>
          </div>
        </div>`).join('')}
    </div>` : ''}

    ${snapshotSection}

    ${sections.weekly_plan ? weeklyPlanHtml(reportData, primary) : ''}

    ${sections.show_weather_impacts && reportData.weather_impacts?.length ? weatherImpactsHtml(reportData, primary) : ''}

    ${sections.show_blockers && reportData.blockers?.length ? `
    <div style="margin-bottom:28px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px 18px;">
      <h2 style="color:#991b1b;font-size:14px;font-weight:600;margin:0 0 10px;">Blockers &amp; Issues</h2>
      <ul style="margin:0;padding-left:18px;color:#7f1d1d;">
        ${reportData.blockers.map(b => `<li style="margin-bottom:7px;font-size:14px;line-height:1.6;">${escapeHtml(b)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${reportData.next_steps?.length ? `
    <div style="margin-bottom:28px;">
      ${sectionHeading("What's Next", primary)}
      <ul style="margin:0;padding-left:18px;color:#374151;">
        ${reportData.next_steps.map(step => `<li style="margin-bottom:7px;font-size:14px;line-height:1.6;">${escapeHtml(step)}</li>`).join('')}
      </ul>
    </div>` : ''}
  `;

  const html = emailShell({ subject, branding: { ...branding, organization_name: reportData.organization_name }, bodyHtml: body });
  const text = generateTextVersion(reportData, schedule, period);
  return { subject, html, text };
}

// Backward-compat alias so any external callers still work


// ─── EXECUTIVE template ───────────────────────────────────────────────────────

function generateExecutiveReportEmail(reportData, schedule, branding) {
  const subject = schedule.custom_subject || `Executive Brief: ${reportData.organization_name || 'Organization'} Status`;
  const period  = formatReportPeriod(reportData.start_date, reportData.end_date);
  const primary   = branding.primary_color   || '#3B82F6';
  const secondary = branding.secondary_color || '#10B981';
  const sections = resolveSections(schedule);

  const headerProjectTitle = reportData.project_name || reportData.organization_name || 'Organization';
  let body = `
    <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 6px;">Executive Brief</h1>
    <p style="color:#1d4ed8;font-size:16px;font-weight:600;margin:0 0 8px;">${escapeHtml(headerProjectTitle)}</p>
    <p style="color:#6b7280;font-size:13px;margin:0 0 28px;">${escapeHtml(period)}</p>

    ${reportData.executive_summary ? `
    <div style="background-color:#f0f9ff;border-left:4px solid ${primary};padding:18px 20px;margin-bottom:28px;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#1e3a8a;font-size:15px;line-height:1.8;">${escapeHtml(reportData.executive_summary)}</p>
    </div>` : ''}

    ${reportData.at_a_glance ? `
    <div style="margin-bottom:28px;">
      <h2 style="color:#111827;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">At a Glance</h2>
      <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px;">
        <tr>
          <td style="width:33%;text-align:center;padding:18px 12px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">
            <p style="margin:0;font-size:36px;font-weight:700;color:${secondary};line-height:1;">${reportData.at_a_glance.on_track || 0}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">On Track</p>
          </td>
          <td style="width:33%;text-align:center;padding:18px 12px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
            <p style="margin:0;font-size:36px;font-weight:700;color:#d97706;line-height:1;">${reportData.at_a_glance.at_risk || 0}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">At Risk</p>
          </td>
          <td style="width:33%;text-align:center;padding:18px 12px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;">
            <p style="margin:0;font-size:36px;font-weight:700;color:#ef4444;line-height:1;">${reportData.at_a_glance.behind || 0}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#991b1b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Behind</p>
          </td>
        </tr>
      </table>
    </div>` : ''}

    ${reportData.key_highlights?.length ? `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Key Highlights', primary)}
      <ul style="margin:0;padding-left:18px;color:#374151;">
        ${reportData.key_highlights.map(h => `<li style="margin-bottom:9px;font-size:14px;line-height:1.6;">${escapeHtml(h)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${sections.show_weather_impacts && reportData.weather_impacts?.length ? weatherImpactsHtml(reportData, primary) : ''}

    ${reportData.project_summary?.length ? `
    <div style="margin-bottom:28px;">
      ${sectionHeading('Project Status', primary)}
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        ${reportData.project_summary.map(project => {
          const statusColor = project.status === 'on_track' ? secondary : project.status === 'at_risk' ? '#d97706' : '#ef4444';
          const dot = project.status === 'on_track' ? `background-color:${secondary};` : project.status === 'at_risk' ? 'background-color:#d97706;' : 'background-color:#ef4444;';
          return `<tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:12px 0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;${dot}flex-shrink:0;"></span>
                <div>
                  <p style="margin:0;color:#1f2937;font-weight:600;font-size:14px;">${escapeHtml(project.name)}</p>
                  <p style="margin:3px 0 0;color:#6b7280;font-size:12px;">${escapeHtml(project.status_text || project.status)}</p>
                </div>
              </div>
            </td>
            <td style="padding:12px 0;text-align:right;white-space:nowrap;">
              <span style="font-size:16px;font-weight:700;color:${statusColor};">${project.progress || 0}%</span>
            </td>
          </tr>`;
        }).join('')}
      </table>
    </div>` : ''}

    ${reportData.attention_required?.length ? `
    <div style="margin-bottom:28px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px 18px;">
      <h2 style="color:#991b1b;font-size:14px;font-weight:600;margin:0 0 10px;">Attention Required</h2>
      <ul style="margin:0;padding-left:18px;color:#7f1d1d;">
        ${reportData.attention_required.map(item => `<li style="margin-bottom:7px;font-size:14px;line-height:1.6;">${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>` : ''}
  `;

  const html = emailShell({ subject, branding: { ...branding, organization_name: reportData.organization_name }, bodyHtml: body });
  const text = generateTextVersion(reportData, schedule, period);
  return { subject, html, text };
}

// ─── plain-text fallback ──────────────────────────────────────────────────────

function generateTextVersion(reportData, schedule, period) {
  let text = `${schedule.custom_subject || 'Progress Report'}\n\n`;
  text += `${period}\n\n`;

  if (schedule.custom_message) text += `${schedule.custom_message}\n\n`;

  if (reportData.vitals) {
    const v = reportData.vitals;
    if (v.tasks_completed_count != null) text += `Total completed: ${v.tasks_completed_count}\n`;
    if (v.open_tasks_count != null)      text += `Open tasks: ${v.open_tasks_count}\n`;
    if (v.current_phase)                 text += `Current phase: ${v.current_phase}${v.phase_progress_pct != null ? ` (${v.phase_progress_pct}%)` : ''}\n`;
    text += '\n';
  }

  if (reportData.executive_summary) {
    text += `Summary:\n${reportData.executive_summary}\n\n`;
  }

  if (reportData.status_changes?.length) {
    text += `Status Changes:\n`;
    reportData.status_changes.forEach(c => {
      text += `- ${c.project_name || 'Project'}: ${c.old_status} → ${c.new_status}\n`;
    });
    text += '\n';
  }

  if (reportData.completed_tasks?.length) {
    text += `Completed this period:\n`;
    reportData.completed_tasks.forEach(t => {
      text += `- ✓ ${t.text || t.title}${t.assignee ? ` (@${t.assignee})` : ''}${t.photos?.length ? ` [${t.photos.length} photo(s)]` : ''}\n`;
    });
    text += '\n';
  }

  if (reportData.phase_progress?.length) {
    text += `Phase Progress:\n`;
    reportData.phase_progress.forEach(p => {
      text += `- ${p.name}: ${p.progress || 0}%\n`;
    });
    text += '\n';
  }

  const sections = resolveSections(schedule);
  if (sections.show_weather_impacts && reportData.weather_impacts?.length) {
    text += `Weather & schedule impacts:\n`;
    reportData.weather_impacts.forEach((w) => {
      text += `- ${w.title || 'Impact'}: ${w.days_lost} day(s) lost${w.schedule_shift_applied ? ' (schedule updated)' : ' (logged only)'}\n`;
      if (w.description) text += `  ${w.description}\n`;
    });
    text += '\n';
  }

  if (sections.weekly_plan) {
    text += `Weekly Plan:\n`;
    text += `We did this last week:\n`;
    if (reportData.last_week_done?.length) {
      reportData.last_week_done.forEach((t) => {
        text += `- ${t.text || 'Task'}\n`;
      });
    } else {
      text += `- No completed tasks in the last week.\n`;
    }
    text += `\nHere's what we are doing this week:\n`;
    if (reportData.this_week_plan?.length) {
      reportData.this_week_plan.forEach((t) => {
        text += `- ${t.text || 'Task'}${t.start_date ? ` (starts ${t.start_date})` : ''}\n`;
      });
    } else {
      text += `- No tasks scheduled this week.\n`;
    }
    text += `\nHere's what we will do next week:\n`;
    if (reportData.next_week_plan?.length) {
      reportData.next_week_plan.forEach((t) => {
        text += `- ${t.text || 'Task'}${t.start_date ? ` (starts ${t.start_date})` : ''}\n`;
      });
    } else {
      text += `- No tasks scheduled for next week.\n`;
    }
    text += '\n';
  }

  const hasAct =
    reportData.status_changes?.length  ||
    reportData.completed_tasks?.length ||
    reportData.phase_progress?.length ||
    (sections.show_weather_impacts && reportData.weather_impacts?.length);
  const snap = reportData.snapshot;
  if (!hasAct && snap) {
    text += `No activity recorded this window.\n`;
    text += `Snapshot: ${snap.open_total ?? 0} open, ${snap.completed_total ?? 0} completed overall.\n\n`;
    snap.open_tasks?.forEach(ot => { text += `- ${ot.text || 'Task'}\n`; });
    snap.phases?.forEach(ph => { text += `- ${ph.name}: ${ph.progress || 0}%\n`; });
  }

  return text;
}

export function buildProgressReportEmail(reportData, filteredData, schedule, branding) {
  const audience = schedule.report_audience_type || 'standard';
  if (audience === 'executive') return generateExecutiveReportEmail(filteredData, schedule, branding);
  // standard / client / internal all use the unified standard template
  return generateStandardReportEmail(filteredData, schedule, branding);
}
