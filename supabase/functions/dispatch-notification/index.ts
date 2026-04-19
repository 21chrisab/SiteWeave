import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildMinimalDigestEmail } from '../_shared/notificationEmailTemplates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM =
  Deno.env.get('RESEND_FROM') ?? 'SiteWeave Notifications <notifications@siteweave.org>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function buildAppUrl(projectId?: string | null): string {
  const base = Deno.env.get('DESKTOP_APP_URL') || Deno.env.get('PUBLIC_APP_URL') || 'https://app.siteweave.org'
  return projectId ? `${base}/?project=${projectId}` : base
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const action = body?.action

    if (action === 'dependency_unlocked') {
      const {
        completedTaskId,
        completedTaskText,
        successorTaskId,
        successorTaskText,
        recipientEmail,
        recipientName,
        projectId,
        projectName,
        organizationId,
        actorName,
      } = body

      if (!completedTaskId || !successorTaskId || !recipientEmail || !projectId || !organizationId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for dependency_unlocked' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const { data: existing } = await supabase
        .from('task_dependency_notification_history')
        .select('id')
        .eq('trigger_task_id', completedTaskId)
        .eq('successor_task_id', successorTaskId)
        .eq('recipient_email', recipientEmail)
        .maybeSingle()
      if (existing) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'already_notified' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const template = buildMinimalDigestEmail({
        heading: `${projectName || 'Project'}: task unlocked`,
        subheading: `${successorTaskText || 'Task'} is ready to start`,
        ctaLabel: 'Open in SiteWeave',
        ctaUrl: buildAppUrl(projectId),
        summaryLabel: 'Due soon',
        summaryValue: 1,
        recipientName: recipientName || 'there',
        tasks: [{ title: successorTaskText || 'Task', dueLabel: 'Ready' }],
        footerText: `${completedTaskText || 'A predecessor task'} was completed by ${actorName || 'a teammate'}.`,
      })

      let status: 'sent' | 'failed' = 'sent'
      let errorMessage: string | null = null
      if (RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [recipientEmail],
            subject: `Task unlocked: ${successorTaskText || 'Task'}`,
            html: template.html,
            text: template.text,
          }),
        })
        if (!response.ok) {
          status = 'failed'
          errorMessage = `Resend error (${response.status})`
        }
      }

      const { error: historyError } = await supabase.from('task_dependency_notification_history').insert({
        trigger_task_id: completedTaskId,
        successor_task_id: successorTaskId,
        project_id: projectId,
        organization_id: organizationId,
        recipient_email: recipientEmail,
        status,
        error_message: errorMessage,
      })

      const { error: notificationError } = await supabase
        .from('user_notifications')
        .upsert(
          {
            organization_id: organizationId,
            project_id: projectId,
            recipient_email: recipientEmail,
            source_type: 'dependency_unlocked',
            source_id: successorTaskId,
            title: 'Task unlocked',
            body: `${successorTaskText || 'Task'} is ready to start in ${projectName || 'your project'}.`,
            metadata: { action_url: buildAppUrl(projectId), predecessor_task_id: completedTaskId },
          },
          { onConflict: 'source_type,source_id,recipient_email' },
        )

      return new Response(
        JSON.stringify({
          success: !historyError && status !== 'failed',
          status,
          history_error: historyError?.message || null,
          notification_error: notificationError?.message || null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    if (action === 'notification_action') {
      const { notificationId, userId, actionType } = body
      if (!notificationId || !actionType) {
        return new Response(JSON.stringify({ error: 'Missing notificationId/actionType' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (actionType === 'mark_read') {
        patch.read_at = new Date().toISOString()
        patch.read_by_user_id = userId || null
      }
      if (actionType === 'acknowledge') {
        patch.acknowledged_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('user_notifications')
        .update(patch)
        .eq('id', notificationId)
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const { error: logError } = await supabase.from('notification_action_history').insert({
        notification_id: notificationId,
        action_type: actionType,
        acted_by_user_id: userId || null,
      })

      return new Response(
        JSON.stringify({ success: true, log_error: logError?.message || null }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

