// Supabase Edge Function: Export Progress Report to PDF
// Generates PDF version of report for meetings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  try {
    const { schedule_id } = await req.json()

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

    // Use a service-role Supabase client — functions.invoke() handles
    // the apikey + Authorization headers automatically (same as client-side).
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: generateResult, error: generateError } = await supabase.functions.invoke(
      'generate-progress-report',
      { body: { schedule_id } }
    )

    if (generateError) {
      throw new Error(`Failed to generate report: ${generateError.message}`)
    }

    const filtered_data = generateResult?.filtered_data

    // Fetch schedule and branding
    const { data: schedule } = await supabase
      .from('progress_report_schedules')
      .select('*, organization_branding(*)')
      .eq('id', schedule_id)
      .single()

    // For now, return HTML that can be printed to PDF
    // In production, would use a PDF library like Puppeteer or jsPDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1f2937; }
          .section { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>Progress Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <div class="section">
          <h2>Summary</h2>
          <p>This is a PDF export of the progress report.</p>
        </div>
      </body>
      </html>
    `

    // Return HTML for now (client can convert to PDF using browser print)
    return new Response(
      JSON.stringify({ 
        success: true,
        html: html,
        message: 'PDF export ready. Use browser print to save as PDF.'
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
    console.error('Error in export-progress-report-pdf:', error)
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
