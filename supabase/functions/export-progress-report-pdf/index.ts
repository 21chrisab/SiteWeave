// Supabase Edge Function: Export Progress Report for print / Save as PDF (client-side)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildProgressReportEmail } from '../_shared/progressReportEmailTemplates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function injectPrintStyles(html: string): string {
  // Match Electron printToPDF + @page so Chromium does not paginate to extra blank sheets.
  // html/body height:auto avoids min-height/100% table quirks that add leading/trailing empty pages.
  const extra = `<style>
@media print {
  @page { size: A4; margin: 12mm; }
  html, body {
    height: auto !important;
    min-height: 0 !important;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>`
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${extra}`)
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${extra}</head><body>${html}</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
  const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const { schedule_id } = await req.json()

    if (!schedule_id) {
      return new Response(JSON.stringify({ error: 'Missing schedule_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: schedule, error: scheduleError } = await supabase
      .from('progress_report_schedules')
      .select('*, progress_report_recipients(*)')
      .eq('id', schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return new Response(JSON.stringify({ error: 'Schedule not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role_id, is_super_admin')
      .eq('id', user.id)
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
        return new Response(JSON.stringify({ error: 'Missing permission to export progress reports' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

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
      throw new Error('Generate report returned invalid JSON')
    }

    if (!genResponse.ok) {
      const msg =
        typeof generateResult?.error === 'string'
          ? generateResult.error
          : `Generate report failed (${genResponse.status})`
      throw new Error(msg)
    }

    const report_data = generateResult?.report_data as Record<string, unknown> | undefined
    const filtered_data = generateResult?.filtered_data as Record<string, unknown> | undefined
    if (!report_data || !filtered_data) {
      throw new Error('Invalid generate response: missing report_data or filtered_data')
    }

    const { data: branding } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', schedule.organization_id)
      .maybeSingle()

    const brandingData = branding || {
      logo_url: null,
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      company_footer: null,
      email_signature: null,
    }

    const emailContent = buildProgressReportEmail(
      report_data,
      filtered_data,
      schedule,
      brandingData,
    )

    const html = injectPrintStyles(emailContent.html)

    return new Response(
      JSON.stringify({
        success: true,
        html,
        subject: emailContent.subject,
        message: 'Client saves this HTML as a PDF file (Electron: native PDF; browser: download).',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('Error in export-progress-report-pdf:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})
