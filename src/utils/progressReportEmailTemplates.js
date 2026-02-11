/**
 * Progress Report Email Templates
 * Generates HTML email templates for different audience types
 */

import i18n from '../i18n/config';

/**
 * Generate client report email template
 * @param {Object} reportData - Filtered report data
 * @param {Object} schedule - Schedule configuration
 * @param {Object} branding - Organization branding
 * @returns {Object} {subject, html, text}
 */
export function generateClientReportEmail(reportData, schedule, branding) {
  const subject = schedule.custom_subject || `Progress Update: ${reportData.project_name || 'Your Project'}`;
  const period = formatReportPeriod(reportData.start_date, reportData.end_date);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: ${branding.primary_color || '#3B82F6'};">
        ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px;">` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px; background-color: #ffffff; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">Progress Update</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0;">${period}</p>
        
        ${schedule.custom_message ? `
        <div style="background-color: #f9fafb; border-left: 4px solid ${branding.secondary_color || '#10B981'}; padding: 15px; margin-bottom: 30px;">
          <p style="margin: 0; color: #374151; line-height: 1.6;">${escapeHtml(schedule.custom_message)}</p>
        </div>
        ` : ''}
        
        ${reportData.status_changes && reportData.status_changes.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Status Update</h2>
          ${reportData.status_changes.map(change => `
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
              <p style="margin: 0; color: #166534; font-weight: 500;">${escapeHtml(change.project_name || 'Project')}</p>
              <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">
                Status: <span style="text-decoration: line-through; color: #6b7280;">${escapeHtml(change.old_status)}</span> 
                → <strong style="color: ${branding.secondary_color || '#10B981'}">${escapeHtml(change.new_status)}</strong>
              </p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${reportData.completed_tasks && reportData.completed_tasks.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Completed Work</h2>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${reportData.completed_tasks.map(task => `
              <li style="margin-bottom: 8px; line-height: 1.6;">
                <span style="color: ${branding.secondary_color || '#10B981'}; font-weight: bold;">✓</span> 
                ${escapeHtml(task.text || task.title)}
                ${task.completed_at ? `<span style="color: #6b7280; font-size: 12px;"> (${formatDate(task.completed_at)})</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${reportData.phase_progress && reportData.phase_progress.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Current Phase</h2>
          ${reportData.phase_progress.map(phase => `
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 5px 0; color: #374151; font-weight: 500;">${escapeHtml(phase.name)}</p>
              <div style="background-color: #e5e7eb; border-radius: 4px; height: 24px; overflow: hidden;">
                <div style="background-color: ${branding.secondary_color || '#10B981'}; height: 100%; width: ${phase.progress || 0}%; transition: width 0.3s;"></div>
              </div>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">${phase.progress || 0}% Complete</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${reportData.next_steps && reportData.next_steps.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">What's Next</h2>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${reportData.next_steps.map(step => `
              <li style="margin-bottom: 8px; line-height: 1.6;">${escapeHtml(step)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${branding.company_footer ? `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          ${branding.company_footer}
        </div>
        ` : ''}
        
        ${branding.email_signature ? `
        <div style="margin-top: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${branding.email_signature}
        </div>
        ` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">This is an automated progress report from ${escapeHtml(reportData.organization_name || 'SiteWeave')}</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  const text = generateTextVersion(reportData, schedule, period);
  
  return { subject, html, text };
}

/**
 * Generate internal report email template
 * @param {Object} reportData - Full report data
 * @param {Object} schedule - Schedule configuration
 * @param {Object} branding - Organization branding
 * @returns {Object} {subject, html, text}
 */
export function generateInternalReportEmail(reportData, schedule, branding) {
  const subject = schedule.custom_subject || `Internal Progress Report: ${reportData.project_name || 'All Projects'}`;
  const period = formatReportPeriod(reportData.start_date, reportData.end_date);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: ${branding.primary_color || '#3B82F6'};">
        ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px;">` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px; background-color: #ffffff; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">Internal Progress Report</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0;">${period}</p>
        
        ${schedule.custom_message ? `
        <div style="background-color: #eff6ff; border-left: 4px solid ${branding.primary_color || '#3B82F6'}; padding: 15px; margin-bottom: 30px;">
          <p style="margin: 0; color: #1e40af; line-height: 1.6;">${escapeHtml(schedule.custom_message)}</p>
        </div>
        ` : ''}
        
        ${reportData.summary_stats ? `
        <div style="display: table; width: 100%; margin-bottom: 30px;">
          <div style="display: table-cell; width: 33%; text-align: center; padding: 15px; background-color: #f9fafb; border-radius: 6px; margin-right: 10px;">
            <div style="font-size: 28px; font-weight: bold; color: ${branding.primary_color || '#3B82F6'};">${reportData.summary_stats.tasks_completed || 0}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Tasks Completed</div>
          </div>
          <div style="display: table-cell; width: 33%; text-align: center; padding: 15px; background-color: #f9fafb; border-radius: 6px; margin: 0 10px;">
            <div style="font-size: 28px; font-weight: bold; color: ${branding.secondary_color || '#10B981'};">${reportData.summary_stats.status_changes || 0}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Status Changes</div>
          </div>
          <div style="display: table-cell; width: 33%; text-align: center; padding: 15px; background-color: #f9fafb; border-radius: 6px; margin-left: 10px;">
            <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${reportData.summary_stats.phases_updated || 0}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Phases Updated</div>
          </div>
        </div>
        ` : ''}
        
        ${reportData.status_changes && reportData.status_changes.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Status Changes</h2>
          ${reportData.status_changes.map(change => `
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">${escapeHtml(change.project_name || 'Project')}</p>
              <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">
                <span style="text-decoration: line-through; color: #6b7280;">${escapeHtml(change.old_status)}</span> 
                → <strong style="color: ${branding.primary_color || '#3B82F6'}">${escapeHtml(change.new_status)}</strong>
                ${change.changed_by ? `<span style="color: #6b7280; font-size: 12px;"> by ${escapeHtml(change.changed_by)}</span>` : ''}
                ${change.changed_at ? `<span style="color: #6b7280; font-size: 12px;"> on ${formatDate(change.changed_at)}</span>` : ''}
              </p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${reportData.completed_tasks && reportData.completed_tasks.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Completed Tasks</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${reportData.completed_tasks.map(task => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: ${branding.secondary_color || '#10B981'}; font-weight: bold;">✓</span>
                  <span style="color: #374151; margin-left: 8px;">${escapeHtml(task.text || task.title)}</span>
                  ${task.assignee ? `<span style="color: #6b7280; font-size: 12px; margin-left: 8px;">(@${escapeHtml(task.assignee)})</span>` : ''}
                  ${task.completed_at ? `<span style="color: #6b7280; font-size: 12px; margin-left: 8px;">${formatDate(task.completed_at)}</span>` : ''}
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}
        
        ${reportData.phase_progress && reportData.phase_progress.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Phase Progress</h2>
          ${reportData.phase_progress.map(phase => `
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <p style="margin: 0; color: #374151; font-weight: 500;">${escapeHtml(phase.name)}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${phase.old_progress || 0}% → ${phase.progress || 0}%</p>
              </div>
              <div style="background-color: #e5e7eb; border-radius: 4px; height: 24px; overflow: hidden;">
                <div style="background-color: ${phase.progress >= 100 ? branding.secondary_color || '#10B981' : branding.primary_color || '#3B82F6'}; height: 100%; width: ${phase.progress || 0}%; transition: width 0.3s;"></div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${reportData.blockers && reportData.blockers.length > 0 ? `
        <div style="margin-bottom: 30px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px;">
          <h2 style="color: #991b1b; font-size: 18px; margin: 0 0 15px 0;">⚠️ Blockers & Issues</h2>
          <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
            ${reportData.blockers.map(blocker => `
              <li style="margin-bottom: 8px; line-height: 1.6;">${escapeHtml(blocker)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${branding.company_footer ? `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          ${branding.company_footer}
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${reportData.app_url || '#'}" style="display: inline-block; padding: 10px 20px; background-color: ${branding.primary_color || '#3B82F6'}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Project in App</a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  const text = generateTextVersion(reportData, schedule, period);
  
  return { subject, html, text };
}

/**
 * Generate executive report email template
 * @param {Object} reportData - Aggregated report data
 * @param {Object} schedule - Schedule configuration
 * @param {Object} branding - Organization branding
 * @returns {Object} {subject, html, text}
 */
export function generateExecutiveReportEmail(reportData, schedule, branding) {
  const subject = schedule.custom_subject || `Executive Brief: ${reportData.organization_name || 'Organization'} Status`;
  const period = formatReportPeriod(reportData.start_date, reportData.end_date);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: ${branding.primary_color || '#3B82F6'};">
        ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px;">` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px; background-color: #ffffff; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">Executive Brief</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0;">${period}</p>
        
        ${reportData.executive_summary ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid ${branding.primary_color || '#3B82F6'}; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0; color: #1e3a8a; line-height: 1.8; font-size: 15px;">${escapeHtml(reportData.executive_summary)}</p>
        </div>
        ` : ''}
        
        ${reportData.at_a_glance ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">At a Glance</h2>
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 33%; text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 6px; margin-right: 10px;">
              <div style="font-size: 36px; font-weight: bold; color: ${branding.secondary_color || '#10B981'};">${reportData.at_a_glance.on_track || 0}</div>
              <div style="font-size: 12px; color: #166534; margin-top: 5px; font-weight: 500;">On Track</div>
            </div>
            <div style="display: table-cell; width: 33%; text-align: center; padding: 20px; background-color: #fef3c7; border-radius: 6px; margin: 0 10px;">
              <div style="font-size: 36px; font-weight: bold; color: #f59e0b;">${reportData.at_a_glance.at_risk || 0}</div>
              <div style="font-size: 12px; color: #92400e; margin-top: 5px; font-weight: 500;">At Risk</div>
            </div>
            <div style="display: table-cell; width: 33%; text-align: center; padding: 20px; background-color: #fef2f2; border-radius: 6px; margin-left: 10px;">
              <div style="font-size: 36px; font-weight: bold; color: #ef4444;">${reportData.at_a_glance.behind || 0}</div>
              <div style="font-size: 12px; color: #991b1b; margin-top: 5px; font-weight: 500;">Behind</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${reportData.key_highlights && reportData.key_highlights.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Key Highlights</h2>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${reportData.key_highlights.map(highlight => `
              <li style="margin-bottom: 10px; line-height: 1.6; font-size: 15px;">${escapeHtml(highlight)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${reportData.project_summary && reportData.project_summary.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid ${branding.primary_color || '#3B82F6'}; padding-bottom: 5px;">Project Status</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${reportData.project_summary.map(project => {
              const statusColor = project.status === 'on_track' ? branding.secondary_color || '#10B981' : 
                                 project.status === 'at_risk' ? '#f59e0b' : '#ef4444';
              const statusIndicator = project.status === 'on_track' ? '🟢' : 
                                      project.status === 'at_risk' ? '🟡' : '🔴';
              return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <p style="margin: 0; color: #1f2937; font-weight: 500;">${statusIndicator} ${escapeHtml(project.name)}</p>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">${escapeHtml(project.status_text || project.status)}</p>
                      </div>
                      <div style="text-align: right;">
                        <p style="margin: 0; color: ${statusColor}; font-weight: bold; font-size: 18px;">${project.progress || 0}%</p>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </table>
        </div>
        ` : ''}
        
        ${reportData.attention_required && reportData.attention_required.length > 0 ? `
        <div style="margin-bottom: 30px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px;">
          <h2 style="color: #991b1b; font-size: 18px; margin: 0 0 15px 0;">⚠️ Attention Required</h2>
          <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
            ${reportData.attention_required.map(item => `
              <li style="margin-bottom: 8px; line-height: 1.6;">${escapeHtml(item)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${branding.company_footer ? `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          ${branding.company_footer}
        </div>
        ` : ''}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  const text = generateTextVersion(reportData, schedule, period);
  
  return { subject, html, text };
}

// Helper functions

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
  return date.toLocaleDateString(i18n.language || 'en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReportPeriod(startDate, endDate) {
  if (!startDate && !endDate) return '';
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  return startDate ? `Since ${formatDate(startDate)}` : `Up to ${formatDate(endDate)}`;
}

function generateTextVersion(reportData, schedule, period) {
  let text = `${schedule.custom_subject || 'Progress Report'}\n\n`;
  text += `${period}\n\n`;
  
  if (schedule.custom_message) {
    text += `${schedule.custom_message}\n\n`;
  }
  
  if (reportData.status_changes && reportData.status_changes.length > 0) {
    text += `Status Changes:\n`;
    reportData.status_changes.forEach(change => {
      text += `- ${change.project_name || 'Project'}: ${change.old_status} → ${change.new_status}\n`;
    });
    text += '\n';
  }
  
  if (reportData.completed_tasks && reportData.completed_tasks.length > 0) {
    text += `Completed Tasks:\n`;
    reportData.completed_tasks.forEach(task => {
      text += `- ✓ ${task.text || task.title}\n`;
    });
    text += '\n';
  }
  
  if (reportData.phase_progress && reportData.phase_progress.length > 0) {
    text += `Phase Progress:\n`;
    reportData.phase_progress.forEach(phase => {
      text += `- ${phase.name}: ${phase.progress || 0}%\n`;
    });
    text += '\n';
  }
  
  return text;
}
