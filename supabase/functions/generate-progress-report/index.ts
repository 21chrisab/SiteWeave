// Supabase Edge Function: Generate Progress Report
// Generates progress report data with audience-based filtering

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
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  // Parse body
  let body: any = {}
  try {
    body = await req.json()
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Authenticate: try to resolve the user from the JWT.
  // When called internally (via functions.invoke with service-role key), getUser will fail
  // because the token is a service key, not a JWT. That's fine — internal calls are trusted.
  const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  const { data: { user: resolvedUser }, error: authError } = await supabaseAuth.auth.getUser(token)

  // If we couldn't resolve a user and the token isn't the service key, reject.
  if (!resolvedUser && token !== supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  const user = resolvedUser || null

  try {
    const { schedule_id } = body

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

    // Determine time range (since last report or last 7 days)
    const lastSentAt = schedule.last_sent_at 
      ? new Date(schedule.last_sent_at)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default to last 7 days
    
    const startDate = lastSentAt.toISOString()
    const endDate = new Date().toISOString()

    // Fetch organization and project info
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', schedule.organization_id)
      .single()

    let project = null
    if (schedule.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name, status, status_color')
        .eq('id', schedule.project_id)
        .single()
      project = projectData
    }

    // Query activity_log for relevant changes
    let activityQuery = supabase
      .from('activity_log')
      .select('*')
      .eq('organization_id', schedule.organization_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (schedule.project_id) {
      activityQuery = activityQuery.eq('project_id', schedule.project_id)
    }

    const { data: activities } = await activityQuery

    // Query current project state
    let tasks = []
    let phases = []

    if (schedule.project_id) {
      // Get tasks for this project
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, contacts(name, email)')
        .eq('project_id', schedule.project_id)
        .eq('organization_id', schedule.organization_id)

      tasks = tasksData || []

      // Get phases for this project
      const { data: phasesData } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', schedule.project_id)
        .eq('organization_id', schedule.organization_id)
        .order('order', { ascending: true })

      phases = phasesData || []
    } else {
      // Organization-wide: get all projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', schedule.organization_id)

      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id)
        
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*, contacts(name, email), projects(name)')
          .in('project_id', projectIds)
          .eq('organization_id', schedule.organization_id)

        tasks = tasksData || []

        const { data: phasesData } = await supabase
          .from('project_phases')
          .select('*, projects(name)')
          .in('project_id', projectIds)
          .eq('organization_id', schedule.organization_id)
          .order('order', { ascending: true })

        phases = phasesData || []
      }
    }

    // Process activities into structured changes
    const statusChanges = []
    const completedTasks = []
    const phaseProgress = []

    activities?.forEach(activity => {
      if (activity.entity_type === 'project' && activity.action === 'updated' && activity.details?.status) {
        statusChanges.push({
          project_id: activity.project_id,
          project_name: activity.entity_name || project?.name || 'Project',
          old_status: activity.details.old_status,
          new_status: activity.details.new_status || activity.details.status,
          changed_by: activity.user_name,
          changed_at: activity.created_at
        })
      }

      if (activity.entity_type === 'task' && activity.action === 'completed') {
        const task = tasks.find(t => t.id === activity.entity_id)
        if (task) {
          completedTasks.push({
            id: task.id,
            text: task.text,
            title: task.text,
            completed_at: activity.created_at,
            assignee: task.contacts?.name || task.assignee_id,
            project_name: task.projects?.name || project?.name
          })
        }
      }

      if (activity.entity_type === 'project_phase' && activity.action === 'updated') {
        const phase = phases.find(p => p.id === activity.entity_id)
        if (phase && activity.details?.old_progress !== undefined) {
          phaseProgress.push({
            id: phase.id,
            name: phase.name,
            old_progress: activity.details.old_progress,
            progress: activity.details.new_progress || phase.progress,
            project_name: phase.projects?.name || project?.name
          })
        }
      }
    })

    // Build raw report data
    const rawReportData = {
      organization_id: schedule.organization_id,
      organization_name: organization?.name || 'Organization',
      project_id: schedule.project_id,
      project_name: project?.name,
      start_date: startDate,
      end_date: endDate,
      status_changes: statusChanges,
      completed_tasks: completedTasks,
      phase_progress: phaseProgress,
      all_tasks: tasks,
      all_phases: phases
    }

    // Apply audience-based filtering
    const filteredData = filterDataByAudience(rawReportData, schedule.report_audience_type)

    // Generate executive summary if needed
    if (schedule.report_audience_type === 'executive') {
      filteredData.executive_summary = generateExecutiveSummary(rawReportData)
      filteredData.at_a_glance = calculateAtAGlance(rawReportData)
      filteredData.key_highlights = generateKeyHighlights(rawReportData)
      filteredData.project_summary = generateProjectSummary(rawReportData)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        report_data: rawReportData,
        filtered_data: filteredData
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
    console.error('Error in generate-progress-report:', error)
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

// Filter data based on audience type
function filterDataByAudience(data, audienceType) {
  if (audienceType === 'client') {
    return {
      ...data,
      completed_tasks: (data.completed_tasks || [])
        .filter((t: { completed_at?: string }) => t.completed_at != null)
        .map((t: { text?: string; title?: string; completed_at?: string }) => ({
          text: t.text || t.title,
          title: t.text || t.title,
          completed_at: t.completed_at
        })),
      status_changes: (data.status_changes || []).map(s => ({
        ...s,
        status: translateToClientFriendly(s.new_status)
      })),
      phase_progress: (data.phase_progress || []).filter(p => p.is_client_visible !== false)
    }
  }

  if (audienceType === 'executive') {
    return {
      organization_id: data.organization_id,
      organization_name: data.organization_name,
      start_date: data.start_date,
      end_date: data.end_date,
      // Don't include granular details
      status_changes: undefined,
      completed_tasks: undefined,
      phase_progress: undefined
    }
  }

  // Internal - return all data
  return data
}

function translateToClientFriendly(status) {
  const translations = {
    'In Progress': 'Active',
    'On Hold': 'Paused',
    'Completed': 'Finished'
  }
  return translations[status] || status
}

function generateExecutiveSummary(data) {
  const totalProjects = data.project_id ? 1 : (data.all_phases?.length || 0)
  const completedTasks = data.completed_tasks?.length || 0
  const statusChanges = data.status_changes?.length || 0
  
  return `This period saw ${completedTasks} tasks completed across ${totalProjects} project(s), with ${statusChanges} status update(s). Overall progress remains on track.`
}

function calculateAtAGlance(data) {
  // Simplified calculation - would need more data in real implementation
  return {
    on_track: 1,
    at_risk: 0,
    behind: 0
  }
}

function generateKeyHighlights(data) {
  const highlights = []
  
  if (data.completed_tasks && data.completed_tasks.length > 0) {
    highlights.push(`${data.completed_tasks.length} tasks completed this period`)
  }
  
  if (data.status_changes && data.status_changes.length > 0) {
    highlights.push(`${data.status_changes.length} project status update(s)`)
  }
  
  return highlights.slice(0, 5) // Top 5 highlights
}

function generateProjectSummary(data) {
  if (data.project_id) {
    return [{
      name: data.project_name || 'Project',
      status: 'on_track',
      status_text: 'On Track',
      progress: 50 // Would calculate from phases
    }]
  }
  
  // For org-wide reports, would aggregate all projects
  return []
}
