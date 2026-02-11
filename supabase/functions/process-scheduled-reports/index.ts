// Supabase Edge Function: Process Scheduled Reports
// Cron job to process all active schedules that are due

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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Query all active schedules that are due
    const now = new Date().toISOString()
    
    const { data: dueSchedules, error: queryError } = await supabase
      .from('progress_report_schedules')
      .select('id')
      .eq('is_active', true)
      .lte('next_send_at', now)
      .or('requires_approval.is.null,requires_approval.eq.false,approval_status.eq.approved')

    if (queryError) {
      console.error('Error querying schedules:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to query schedules' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No schedules due for processing',
          processed: 0
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Process each schedule
    const results = []
    const errors = []

    for (const schedule of dueSchedules) {
      try {
        // Call send-progress-report using functions.invoke() which handles
        // the apikey + Authorization headers automatically.
        const { data: result, error: sendError } = await supabase.functions.invoke(
          'send-progress-report',
          { body: { schedule_id: schedule.id, is_manual: false } }
        )

        if (sendError) {
          errors.push({
            schedule_id: schedule.id,
            error: sendError.message || 'Unknown error'
          })
        } else {
          results.push({
            schedule_id: schedule.id,
            success: true,
            ...result
          })
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error)
        errors.push({
          schedule_id: schedule.id,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        errors: errors.length,
        results: results,
        error_details: errors
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
    console.error('Error in process-scheduled-reports:', error)
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
