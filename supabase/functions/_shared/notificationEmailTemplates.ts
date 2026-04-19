function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type DigestTask = {
  title: string;
  dueLabel?: string | null;
};

type DigestParams = {
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaUrl: string;
  summaryLabel: string;
  summaryValue: string | number;
  tasks: DigestTask[];
  recipientName?: string | null;
  footerText?: string;
};

export function buildMinimalDigestEmail(params: DigestParams): { html: string; text: string } {
  const {
    heading,
    subheading,
    ctaLabel,
    ctaUrl,
    summaryLabel,
    summaryValue,
    tasks,
    recipientName,
    footerText = 'Automated notification from SiteWeave',
  } = params;

  const safeTasks = tasks.slice(0, 8);
  const taskRows = safeTasks
    .map((task) => {
      const due = task.dueLabel ? `<span style="color:#0f766e;font-size:14px;font-weight:500;">${escapeHtml(task.dueLabel)}</span>` : '';
      return `
        <tr>
          <td style="padding:14px 16px;border-top:1px solid #e5e7eb;font-size:18px;color:#6b7280;width:28px;">○</td>
          <td style="padding:14px 8px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#111827;font-size:16px;line-height:1.4;">${escapeHtml(task.title)}</p>
          </td>
          <td style="padding:14px 16px;border-top:1px solid #e5e7eb;text-align:right;white-space:nowrap;">
            ${due}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" style="width:100%;max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 8px;">
              <p style="margin:0;font-size:30px;font-weight:700;color:#7c2d5f;letter-spacing:-0.3px;">siteweave</p>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 0;">
              <h1 style="margin:0;font-size:36px;line-height:1.2;font-weight:500;color:#1f2937;">${escapeHtml(heading)}</h1>
              <p style="margin:10px 0 0;font-size:28px;line-height:1.25;color:#6b7280;">${escapeHtml(subheading)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2f6ce5;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:18px;font-weight:600;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 12px;">
              <div style="background:#f3f4f6;border-radius:10px;padding:14px 18px;text-align:center;color:#047857;font-size:28px;">
                <span style="font-size:18px;">📅</span>
                <span style="margin-left:8px;">${escapeHtml(summaryLabel)}: <strong>${escapeHtml(summaryValue)}</strong></span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 10px;">
              <h2 style="margin:0;font-size:34px;font-weight:500;color:#1f2937;">Tasks due soon</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                ${taskRows || '<tr><td style="padding:14px 16px;color:#6b7280;font-size:14px;">No tasks in this window.</td></tr>'}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px;">
              <p style="margin:0;color:#6b7280;font-size:13px;">${escapeHtml(recipientName ? `Hi ${recipientName},` : 'Hi there,')}</p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:12px;">${escapeHtml(footerText)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const lines = safeTasks.map((task, idx) => `- ${idx + 1}. ${task.title}${task.dueLabel ? ` (${task.dueLabel})` : ''}`).join('\n');
  const text = [
    heading,
    subheading,
    '',
    `${summaryLabel}: ${summaryValue}`,
    '',
    'Tasks due soon:',
    lines || '- No tasks in this window.',
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    footerText,
  ].join('\n');

  return { html, text };
}
