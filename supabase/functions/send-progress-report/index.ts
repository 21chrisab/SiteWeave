// Supabase Edge Function: Send Progress Report
// Sends progress report emails with approval workflow support

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { buildProgressReportEmail } from '../_shared/progressReportEmailTemplates.ts'

// RESEND_API_KEY required to send. RESEND_FROM optional (verified domain in Resend). See docs/email-deliverability-resend.md (SPF/DKIM/DMARC).
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM =
  Deno.env.get('RESEND_FROM') ?? 'SiteWeave Notifications <notifications@siteweave.org>'
const RESEND_VERIFIED_DOMAIN = (Deno.env.get('RESEND_VERIFIED_DOMAIN') || '').trim().toLowerCase()
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    const body = await req.json()
    const { schedule_id, test_email, is_test, is_manual } = body

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const isServiceRole = token === supabaseServiceKey

    let callerUserId: string | null = null
    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing authorization' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      if (!supabaseAnonKey) {
        return new Response(JSON.stringify({ error: 'Server misconfiguration: missing anon key' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      const supabaseJwt = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: { user }, error: jwtError } = await supabaseJwt.auth.getUser(token)
      if (jwtError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session. Sign in again.' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }
      callerUserId = user.id
    }

    if (!schedule_id) {
      return new Response(
        JSON.stringify({ error: 'Missing schedule_id' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const fromEmailMatch = RESEND_FROM.match(/<([^>]+)>/)
    const fromEmail = (fromEmailMatch?.[1] || RESEND_FROM).trim().toLowerCase()
    const fromDomain = fromEmail.includes('@') ? fromEmail.split('@').pop() : ''
    if (!fromDomain) {
      return new Response(
        JSON.stringify({ error: 'Invalid RESEND_FROM format. Use "Name <address@domain.com>".' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }
    if (RESEND_VERIFIED_DOMAIN && fromDomain !== RESEND_VERIFIED_DOMAIN) {
      return new Response(
        JSON.stringify({
          error: `Sender domain mismatch. RESEND_FROM uses ${fromDomain} but RESEND_VERIFIED_DOMAIN is ${RESEND_VERIFIED_DOMAIN}.`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // Fetch schedule configuration
    const { data: schedule, error: scheduleError } = await supabase
      .from('progress_report_schedules')
      .select('*, progress_report_recipients(*)')
      .eq('id', schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return new Response(
        JSON.stringify({ error: 'Schedule not found' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // User-initiated calls: must belong to the schedule's org and have permission
    if (!isServiceRole && callerUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role_id, is_super_admin')
        .eq('id', callerUserId)
        .maybeSingle()

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      if (!profile.is_super_admin) {
        if (profile.organization_id !== schedule.organization_id) {
          return new Response(JSON.stringify({ error: 'Not allowed for this organization' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        if (!profile.role_id) {
          return new Response(JSON.stringify({ error: 'No role assigned' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        const { data: roleRow } = await supabase
          .from('roles')
          .select('permissions')
          .eq('id', profile.role_id)
          .maybeSingle()

        const perms = roleRow?.permissions as Record<string, unknown> | undefined
        if (perms?.can_manage_progress_reports !== true) {
          return new Response(
            JSON.stringify({ error: 'Missing permission to send progress reports' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          )
        }
      }
    }

    // Check approval status if required (skip for test sends and explicit manual sends)
    const skipApprovalCheck = is_test || is_manual
    if (!skipApprovalCheck && schedule.requires_approval && schedule.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Report requires approval before sending' }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Call generate-progress-report via fetch (edge-to-edge functions.invoke is unreliable:
    // inner calls often miss apikey / auth and return non-2xx without a clear body on the client).
    const baseUrl = supabaseUrl.replace(/\/$/, '')
    const genResponse = await fetch(`${baseUrl}/functions/v1/generate-progress-report`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schedule_id }),
    })

    let generateResult: Record<string, unknown> | null = null
    try {
      generateResult = await genResponse.json() as Record<string, unknown>
    } catch {
      return new Response(
        JSON.stringify({ error: 'Generate report returned invalid JSON' }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    if (!genResponse.ok) {
      const errMsg =
        typeof generateResult?.error === 'string'
          ? generateResult.error
          : `Generate report failed (${genResponse.status})`
      return new Response(JSON.stringify({ error: errMsg, details: generateResult }), {
        status: genResponse.status >= 400 && genResponse.status < 600 ? genResponse.status : 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const report_data = generateResult?.report_data
    const filtered_data = generateResult?.filtered_data
    if (!report_data || !filtered_data) {
      return new Response(
        JSON.stringify({ error: 'Report generation returned invalid data (missing report_data or filtered_data)' }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // Fetch organization branding
    const { data: branding } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', schedule.organization_id)
      .maybeSingle()
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('progress_report_send_hour, progress_report_timezone')
      .eq('id', schedule.organization_id)
      .maybeSingle()
    if (organizationError) {
      console.warn('Unable to load org progress report schedule settings:', organizationError.message)
    }

    const brandingData = branding || {
      logo_url: null,
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      company_footer: null,
      email_signature: null
    }

    const emailContent = buildProgressReportEmail(
      report_data as Record<string, unknown>,
      filtered_data as Record<string, unknown>,
      schedule,
      brandingData,
    )
    const pdfAttachment = await generateProgressReportPdf(
      filtered_data as Record<string, unknown>,
      schedule.name || 'Progress Report',
    )

    // Determine recipients (null-safe: relation may be missing or empty)
    const rawRecipients = schedule.progress_report_recipients || []
    let recipients: string[] = []
    if (is_test && test_email) {
      recipients = [test_email]
    } else {
      recipients = rawRecipients
        .filter((r: { is_active?: boolean }) => r.is_active !== false)
        .map((r: { email: string }) => r.email)
        .filter(Boolean)
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients configured' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Send email via Resend
    let emailId = null
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: recipients,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          attachments: [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.contentBase64,
            },
          ],
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('Resend error:', resendData)
        return new Response(
          JSON.stringify({ error: 'Failed to send email via Resend', details: resendData }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        )
      }

      emailId = resendData.id
    } else {
      console.log('Email would be sent to:', recipients)
      console.log('Subject:', emailContent.subject)
    }

    // Record in history (skip for test sends)
    if (!is_test) {
      await supabase
        .from('progress_report_history')
        .insert({
          schedule_id: schedule.id,
          report_audience_type: schedule.report_audience_type,
          report_type: schedule.project_id ? 'project' : 'organization',
          project_id: schedule.project_id,
          organization_id: schedule.organization_id,
          recipient_emails: recipients,
          report_data: report_data,
          filtered_data: filtered_data,
          sent_by_user_id: schedule.created_by_user_id,
          email_id: emailId,
          was_manual_send: is_manual || false
        })

      // Update schedule
      const nextSendDate = calculateNextSendDate(
        schedule.frequency,
        schedule.frequency_value,
        new Date().toISOString(),
        Number.isFinite(Number(organization?.progress_report_send_hour))
          ? Number(organization?.progress_report_send_hour)
          : 8,
        typeof organization?.progress_report_timezone === 'string' && organization.progress_report_timezone
          ? organization.progress_report_timezone
          : 'America/New_York',
      )

      await supabase
        .from('progress_report_schedules')
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSendDate ? nextSendDate.toISOString() : null
        })
        .eq('id', schedule_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailId,
        recipients_count: recipients.length,
        is_test: is_test || false
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )

  } catch (error) {
    console.error('Error in send-progress-report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})

// frequency_value: weekly/bi-weekly = day of week 0-6 (0=Sunday); monthly = 1, 15, or -1 (last day)
function calculateNextSendDate(
  frequency,
  frequencyValue,
  lastSentAt,
  sendHourLocal = 8,
  timeZone = 'America/New_York',
) {
  const baseDate = new Date(lastSentAt)
  const safeHour = Number.isFinite(Number(sendHourLocal))
    ? Math.max(0, Math.min(23, Number(sendHourLocal)))
    : 8
  const dayOfWeek = frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 0
  const baseLocalDate = getLocalCalendarDate(baseDate, timeZone)
  const withLocalHour = (value: Date) => zonedDateTimeToUtc({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    hour: safeHour,
    minute: 0,
    second: 0,
  }, timeZone)

  switch (frequency) {
    case 'weekly': {
      const next = new Date(baseLocalDate)
      next.setUTCDate(next.getUTCDate() + 7)
      while (next.getUTCDay() !== dayOfWeek) next.setUTCDate(next.getUTCDate() + 1)
      return withLocalHour(next)
    }
    case 'bi-weekly': {
      const next = new Date(baseLocalDate)
      next.setUTCDate(next.getUTCDate() + 14)
      while (next.getUTCDay() !== dayOfWeek) next.setUTCDate(next.getUTCDate() + 1)
      return withLocalHour(next)
    }
    case 'monthly': {
      const y = baseLocalDate.getUTCFullYear()
      const m = baseLocalDate.getUTCMonth()
      if (frequencyValue === -1 || frequencyValue === 31) {
        return withLocalHour(new Date(Date.UTC(y, m + 2, 0)))
      }
      if (frequencyValue === 15) {
        return withLocalHour(new Date(Date.UTC(y, m + 1, 15)))
      }
      return withLocalHour(new Date(Date.UTC(y, m + 1, 1)))
    }
    case 'custom':
      if (frequencyValue && frequencyValue > 0) {
        const next = new Date(baseLocalDate)
        next.setUTCDate(next.getUTCDate() + frequencyValue)
        return withLocalHour(next)
      }
      return null
    case 'manual':
      return null
    default:
      return null
  }
}

function getLocalCalendarDate(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function getDateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const mapped = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
  }
}

function zonedDateTimeToUtc(
  desired: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
) {
  let utcGuess = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
  )

  for (let i = 0; i < 3; i += 1) {
    const actual = getDateTimeParts(new Date(utcGuess), timeZone)
    const desiredAsUtc = Date.UTC(
      desired.year,
      desired.month - 1,
      desired.day,
      desired.hour,
      desired.minute,
      desired.second,
    )
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    )
    utcGuess += desiredAsUtc - actualAsUtc
  }

  return new Date(utcGuess)
}

async function generateProgressReportPdf(reportData: Record<string, unknown>, scheduleName: string) {
  const title = String(reportData?.project_name || reportData?.organization_name || scheduleName || 'Progress Report')
  const period = String(reportData?.start_date || '')
    ? `${String(reportData?.start_date || '')} to ${String(reportData?.end_date || '') || 'now'}`
    : 'Current reporting period'
  const completed = Number((reportData as Record<string, unknown>)?.completed_tasks_count || 0)
  const open = Number((reportData as Record<string, unknown>)?.open_tasks_count || 0)

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  page.drawText('SiteWeave Progress Report', { x: 48, y: 744, size: 20, font: bold, color: rgb(0.1, 0.14, 0.2) })
  page.drawText(title, { x: 48, y: 716, size: 16, font: bold, color: rgb(0.12, 0.24, 0.54) })
  page.drawText(`Period: ${period}`, { x: 48, y: 690, size: 11, font: regular, color: rgb(0.35, 0.39, 0.47) })
  page.drawText(`Completed tasks: ${completed}`, { x: 48, y: 660, size: 12, font: regular, color: rgb(0.1, 0.14, 0.2) })
  page.drawText(`Open tasks: ${open}`, { x: 48, y: 640, size: 12, font: regular, color: rgb(0.1, 0.14, 0.2) })
  page.drawText('For full report details, open SiteWeave and view Progress Report History.', {
    x: 48,
    y: 600,
    size: 10,
    font: regular,
    color: rgb(0.35, 0.39, 0.47),
  })

  const pdfBytes = await pdf.save()
  let binary = ''
  for (const byte of pdfBytes) binary += String.fromCharCode(byte)
  const contentBase64 = btoa(binary)
  return {
    filename: `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'progress-report'}.pdf`,
    contentBase64,
  }
}
