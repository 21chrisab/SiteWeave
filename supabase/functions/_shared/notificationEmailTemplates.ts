function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Public mark for transactional emails (matches progress report templates). */
const SITEWEAVE_LOGO_URL = 'https://app.siteweave.org/logo.svg'

function stripProjectPrefixFromHeading(heading: string, projectName: string): string {
  const h = String(heading || '').trim()
  const p = String(projectName || '').trim()
  if (!p || !h) return h
  const prefix = `${p}:`
  if (h.length >= prefix.length && h.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
    const rest = h.slice(prefix.length).trim()
    return rest || h
  }
  return h
}

export function formatDigestDueDate(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== 'string') return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Calendar-day difference: due − today in UTC (0 = due today). Returns null if `dueDateIso` is not YYYY-MM-DD. */
export function dueCalendarDiffDays(dueDateIso: string | null | undefined, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dueDateIso ?? '').trim())
  if (!m) return null
  const due = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((due - t) / 86400000)
}

export function formatDueInDaysPhrase(diffDays: number | null): string | null {
  if (diffDays === null || Number.isNaN(diffDays)) return null
  if (diffDays > 1) return `Due in ${diffDays} days`
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays === 0) return 'Due today'
  if (diffDays === -1) return 'Overdue since yesterday'
  if (diffDays < -1) return `Overdue by ${-diffDays} days`
  return null
}

function urgencyVisual(diffDays: number | null): { wrap: string; dateColor: string; phraseColor: string } {
  if (diffDays === null || Number.isNaN(diffDays)) {
    return {
      wrap: 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:10px 0 0;',
      dateColor: '#0f172a',
      phraseColor: '#475569',
    }
  }
  if (diffDays < 0) {
    return {
      wrap: 'background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;margin:10px 0 0;',
      dateColor: '#7f1d1d',
      phraseColor: '#b91c1c',
    }
  }
  if (diffDays === 0) {
    return {
      wrap: 'background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin:10px 0 0;',
      dateColor: '#7c2d12',
      phraseColor: '#c2410c',
    }
  }
  if (diffDays <= 3) {
    return {
      wrap: 'background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin:10px 0 0;',
      dateColor: '#78350f',
      phraseColor: '#b45309',
    }
  }
  return {
    wrap: 'background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;margin:10px 0 0;',
    dateColor: '#1e3a8a',
    phraseColor: '#1d4ed8',
  }
}

export type DigestTask = {
  title: string
  dueLabel?: string | null
  priority?: string | null
  dueDateLabel?: string | null
  /** `YYYY-MM-DD` (or timestamp string); used for “Due in N days” vs send time. */
  dueDateIso?: string | null
}

export type DigestParams = {
  heading: string
  subheading: string
  ctaUrl: string
  /** Prominent review link text (must not include raw HTML). */
  reviewLinkText?: string | null
  summaryLabel: string
  summaryValue: string | number
  tasks: DigestTask[]
  recipientName?: string | null
  footerText?: string
  /** Project name for context block (may match heading). */
  projectName?: string | null
  /** Street / location line when available. */
  projectAddress?: string | null
  /** Section title above task table. */
  tasksSectionTitle?: string | null
  /**
   * When true, omit the reminder headline (h1) and subheading so the task block is the main focus.
   * Plain-text body skips those lines as well.
   */
  omitLeadBlock?: boolean
}

function taskMetaLine(task: DigestTask, now: Date): string {
  const parts: string[] = []
  if (task.dueDateLabel) parts.push(`Due: ${task.dueDateLabel}`)
  else if (task.dueDateIso) {
    const f = formatDigestDueDate(task.dueDateIso)
    if (f) parts.push(`Due: ${f}`)
  }
  if (task.dueLabel) parts.push(String(task.dueLabel))
  const phrase = formatDueInDaysPhrase(dueCalendarDiffDays(task.dueDateIso, now))
  let s = parts.join(' · ')
  if (phrase) s = s ? `${s} · ${phrase}` : phrase
  return s
}

function digestTaskDetailHtml(
  task: DigestTask,
  opts: {
    sentAt: Date
    showInlineReviewLink: boolean
    ctaUrl?: string | null
    reviewLinkText?: string | null
  },
): string {
  const { sentAt, showInlineReviewLink, ctaUrl, reviewLinkText } = opts
  const chunks: string[] = []

  const displayDue = task.dueDateLabel || (task.dueDateIso ? formatDigestDueDate(task.dueDateIso) : null)
  const diff = dueCalendarDiffDays(task.dueDateIso, sentAt)
  const phrase = formatDueInDaysPhrase(diff)
  const hasCalendarDue = Boolean(displayDue || phrase)

  if (hasCalendarDue) {
    const vis = urgencyVisual(diff)
    const dateLine = displayDue
      ? `<p style="margin:4px 0 0;font-size:21px;line-height:1.25;font-weight:800;color:${vis.dateColor};letter-spacing:-0.02em;">${escapeHtml(displayDue)}</p>`
      : ''
    const phraseLine = phrase
      ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.35;font-weight:700;color:${vis.phraseColor};">${escapeHtml(phrase)}</p>`
      : ''
    chunks.push(
      `<div style="${vis.wrap}">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#64748b;">Due</p>
        ${dateLine}
        ${phraseLine}
      </div>`,
    )
  } else if (task.dueLabel) {
    chunks.push(
      `<p style="margin:10px 0 0;font-size:14px;line-height:1.4;color:#475569;font-weight:600;">${escapeHtml(String(task.dueLabel))}</p>`,
    )
  }

  if (showInlineReviewLink && ctaUrl && reviewLinkText) {
    chunks.push(
      `<p style="margin:14px 0 0;font-size:14px;line-height:1.45;"><a href="${escapeHtml(ctaUrl)}" style="color:#1d4ed8;font-weight:700;text-decoration:underline;">${escapeHtml(reviewLinkText)}</a></p>`,
    )
  }

  return chunks.join('\n')
}

export function buildMinimalDigestEmail(params: DigestParams): { html: string; text: string } {
  const {
    heading,
    subheading,
    ctaUrl,
    reviewLinkText: reviewLinkTextParam,
    summaryLabel,
    summaryValue,
    tasks,
    recipientName,
    footerText = 'Automated notification from SiteWeave',
    projectName,
    projectAddress,
    tasksSectionTitle,
    omitLeadBlock = false,
  } = params

  const sentAt = new Date()

  const safeTasks = tasks.slice(0, 8)
  const defaultReview =
    safeTasks.length > 1 ? 'Review your tasks in SiteWeave' : 'Review this task in SiteWeave'
  const reviewLinkText = (reviewLinkTextParam && String(reviewLinkTextParam).trim()) || defaultReview

  const showSummaryRow =
    safeTasks.length > 1 || (summaryValue !== undefined && summaryValue !== null && Number(summaryValue) > 1)

  const projectNameTrimmed = projectName && String(projectName).trim() ? String(projectName).trim() : ''
  const mastheadTitle = projectNameTrimmed || String(heading || '').trim() || 'SiteWeave'
  const reminderHeadline = projectNameTrimmed
    ? stripProjectPrefixFromHeading(String(heading || ''), projectNameTrimmed)
    : String(heading || '').trim()

  const locationOnlyLines: string[] = []
  if (projectAddress && String(projectAddress).trim()) {
    locationOnlyLines.push(
      `<p style="margin:0;font-size:15px;color:#374151;"><strong>Location</strong>: ${escapeHtml(String(projectAddress).trim())}</p>`,
    )
  }
  const locationBlock =
    locationOnlyLines.length > 0
      ? `<div style="padding:0 0 10px;border-bottom:1px solid #e5e7eb;margin-bottom:10px;">${locationOnlyLines.join('')}</div>`
      : ''

  const multiWithSharedCta = safeTasks.length > 1 && Boolean(ctaUrl && reviewLinkText)

  const taskRows = safeTasks
    .map((task) => {
      const showInlineReviewLink = Boolean(!multiWithSharedCta && ctaUrl && reviewLinkText)
      const detailHtml = digestTaskDetailHtml(task, {
        sentAt,
        showInlineReviewLink,
        ctaUrl,
        reviewLinkText,
      })
      return `
        <tr>
          <td style="padding:14px 16px;border-top:1px solid #e5e7eb;vertical-align:top;">
            <p style="margin:0;color:#111827;font-size:17px;line-height:1.35;font-weight:700;">${escapeHtml(task.title)}</p>
            ${detailHtml}
          </td>
        </tr>
      `
    })
    .join('')

  const postTaskTableLink = multiWithSharedCta
    ? `<p style="margin:14px 16px 0;font-size:14px;line-height:1.45;">
        <a href="${escapeHtml(ctaUrl)}" style="color:#1d4ed8;font-weight:600;text-decoration:underline;">${escapeHtml(reviewLinkText)}</a>
      </p>`
    : ''

  const sectionTitle = tasksSectionTitle && String(tasksSectionTitle).trim()
    ? String(tasksSectionTitle).trim()
    : 'Tasks'

  const sectionHeadingStyle = omitLeadBlock
    ? 'margin:0;font-size:26px;line-height:1.25;font-weight:700;color:#111827;letter-spacing:-0.02em;'
    : 'margin:0;font-size:20px;line-height:1.3;font-weight:600;color:#111827;'
  const sectionHeadingTag = omitLeadBlock ? 'h1' : 'h2'

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
            <td style="padding:20px 24px 12px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;padding:0 16px 0 0;">
                    <p style="margin:0;font-size:26px;line-height:1.2;font-weight:700;color:#111827;letter-spacing:-0.02em;">${escapeHtml(mastheadTitle)}</p>
                  </td>
                  <td style="width:1%;white-space:nowrap;vertical-align:middle;text-align:right;padding:0;">
                    <img src="${SITEWEAVE_LOGO_URL}" alt="SiteWeave" width="44" height="44" style="display:block;width:44px;height:44px;border:0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 0;">
              ${locationBlock}
              ${
                omitLeadBlock
                  ? ''
                  : `<h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:600;color:#111827;">${escapeHtml(reminderHeadline || heading)}</h1>
              <p style="margin:10px 0 0;font-size:18px;line-height:1.35;color:#4b5563;">${escapeHtml(subheading)}</p>`
              }
            </td>
          </tr>
          ${
            showSummaryRow
              ? `<tr>
            <td style="padding:16px 24px 12px;">
              <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;text-align:center;color:#374151;font-size:16px;">
                <span>${escapeHtml(summaryLabel)}: <strong>${escapeHtml(summaryValue)}</strong></span>
              </div>
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="${omitLeadBlock ? 'padding:18px 24px 12px;' : 'padding:6px 24px 10px;'}">
              <${sectionHeadingTag} style="${sectionHeadingStyle}">${escapeHtml(sectionTitle)}</${sectionHeadingTag}>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                ${taskRows || '<tr><td style="padding:14px 16px;color:#6b7280;font-size:14px;">No tasks in this window.</td></tr>'}
              </table>
              ${postTaskTableLink}
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
</html>`

  const textProject: string[] = []
  if (projectAddress && String(projectAddress).trim()) textProject.push(`Location: ${projectAddress}`)

  const lines = safeTasks
    .map((task, idx) => {
      const meta = taskMetaLine(task, sentAt)
      const head = `- ${idx + 1}. ${task.title}`
      if (safeTasks.length === 1 && ctaUrl && reviewLinkText) {
        const metaPart = meta ? ` — ${meta}` : ''
        return `${head}${metaPart} — ${reviewLinkText}: ${ctaUrl}`
      }
      return `${head}${meta ? ` — ${meta}` : ''}`
    })
    .join('\n')

  const textMultiLink =
    safeTasks.length > 1 && ctaUrl && reviewLinkText ? `${reviewLinkText}: ${ctaUrl}` : ''

  const textParts: string[] = [mastheadTitle, '', ...textProject, '']
  if (!omitLeadBlock) {
    textParts.push(reminderHeadline || heading, subheading, '')
  }
  if (showSummaryRow) {
    textParts.push(`${summaryLabel}: ${summaryValue}`, '')
  }
  textParts.push(`${sectionTitle}:`, lines || '- No tasks in this window.')
  if (textMultiLink) {
    textParts.push('', textMultiLink)
  }
  textParts.push('', recipientName ? `Hi ${recipientName},` : 'Hi there,', footerText)

  const text = textParts.filter((line) => line !== '').join('\n')

  return { html, text }
}
