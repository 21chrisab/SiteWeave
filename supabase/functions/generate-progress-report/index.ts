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
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  // Server-to-server only. New Supabase service keys (sb_secret_*) are not user JWTs — the edge
  // gateway's verify_jwt must be false, and we authenticate here by comparing to the service role.
  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

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

    const supabase = createClient(supabaseUrl, serviceKey)

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

    // Time range: since last send, but never shorter than MIN_WINDOW (avoids empty reports after a recent send/export).
    const endMs = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const MIN_WINDOW_MS = sevenDaysMs
    let startMs = schedule.last_sent_at
      ? new Date(schedule.last_sent_at).getTime()
      : endMs - sevenDaysMs
    if (endMs - startMs < MIN_WINDOW_MS) {
      startMs = endMs - MIN_WINDOW_MS
    }
    const startDate = new Date(startMs).toISOString()
    const endDate = new Date(endMs).toISOString()

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
      // Organization-wide: get all projects (include status for exec metrics)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status, status_color, due_date')
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
      const det = parseActivityDetails(activity)

      if (
        activity.entity_type === 'project' &&
        activity.action === 'updated' &&
        (det.status != null || det.new_status != null)
      ) {
        statusChanges.push({
          project_id: activity.project_id,
          project_name: activity.entity_name || project?.name || 'Project',
          old_status: det.old_status,
          new_status: det.new_status ?? det.status,
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
        if (phase && det.old_progress !== undefined) {
          phaseProgress.push({
            id: phase.id,
            name: phase.name,
            old_progress: det.old_progress,
            progress: det.new_progress ?? phase.progress,
            project_name: phase.projects?.name || project?.name,
            is_client_visible: phase.is_client_visible,
          })
        }
      }
    })

    const visiblePhases = phases.filter((p: { is_client_visible?: boolean }) => p.is_client_visible !== false)
    const openTasks = tasks.filter((t: { completed?: boolean }) => !t.completed)
    const doneTasks = tasks.filter((t: { completed?: boolean }) => t.completed)

    // ── Vitals (deterministic, no AI) ─────────────────────────────────────────
    // Current active phase = first client-visible phase with progress < 100,
    // ordered by phase.order (already sorted ascending).
    const activePhase = visiblePhases.find((p: { progress?: number }) => (p.progress ?? 0) < 100)
    // tasks_completed_count = all tasks marked done in the DB (same as snapshot.completed_total).
    // Period-only completions stay in `completed_tasks` for the "Completed this period" section.
    const vitals = {
      tasks_completed_count: doneTasks.length,
      open_tasks_count: openTasks.length,
      current_phase: (activePhase as any)?.name ?? null,
      phase_progress_pct: typeof (activePhase as any)?.progress === 'number' ? (activePhase as any).progress : null,
    }

    // ── 14-day lookahead ──────────────────────────────────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lookaheadCutoff = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    const lookahead = openTasks
      .filter((t: { start_date?: string }) => {
        if (!t.start_date) return false
        const d = new Date(t.start_date)
        return d >= today && d <= lookaheadCutoff
      })
      .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 10)
      .map((t: { text?: string; start_date?: string; contacts?: { name?: string } | null }) => ({
        text: t.text,
        start_date: t.start_date,
        assignee: (t.contacts as any)?.name ?? null,
      }))

    // When activity_log has little in the window, still show a useful client-facing snapshot.
    const rawReportData: any = {
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
      all_phases: phases,
      vitals,
      lookahead,
      snapshot: {
        open_tasks: openTasks.slice(0, 25).map((t: { text?: string; due_date?: string; contacts?: { name?: string } | null }) => ({
          text: t.text,
          due_date: t.due_date,
          assignee: (t.contacts as any)?.name ?? null,
        })),
        phases: visiblePhases.map((p: { name?: string; progress?: number }) => ({
          name: p.name,
          progress: typeof p.progress === 'number' ? p.progress : 0,
        })),
        open_total: openTasks.length,
        completed_total: doneTasks.length,
      },
    }

    // Collect all projects list for executive metrics
    // For single-project reports use [project]; for org-wide it was stored above.
    let allProjects: any[] = []
    if (schedule.project_id && project) {
      allProjects = [project]
    } else {
      // re-query with status if we didn't have it above
      const { data: projList } = await supabase
        .from('projects')
        .select('id, name, status, status_color, due_date')
        .eq('organization_id', schedule.organization_id)
      allProjects = projList || []
    }

    // Apply audience-based filtering
    const filteredData = filterDataByAudience(rawReportData, schedule.report_audience_type)

    // Generate executive content if needed (all audiences benefit from vitals + lookahead)
    if (schedule.report_audience_type === 'executive') {
      filteredData.vitals   = vitals
      filteredData.lookahead = lookahead
      filteredData.executive_summary = generateExecutiveSummary(rawReportData)
      filteredData.at_a_glance       = calculateAtAGlance(rawReportData, allProjects)
      filteredData.key_highlights    = generateKeyHighlights(rawReportData)
      filteredData.project_summary   = generateProjectSummary(rawReportData, allProjects, phases)
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

// Filter data based on audience type.
// Standard / client audiences: pass all data through — report_sections flags in the template
// control what is rendered. Phase visibility (is_client_visible) is still filtered here
// because it is a data-privacy concern, not a presentation concern.
function filterDataByAudience(data, audienceType) {
  if (audienceType === 'executive') {
    return {
      organization_id: data.organization_id,
      organization_name: data.organization_name,
      start_date: data.start_date,
      end_date: data.end_date,
      status_changes: undefined,
      completed_tasks: undefined,
      phase_progress: undefined,
    }
  }

  // standard / client / internal — template flags decide presentation
  return {
    ...data,
    phase_progress: (data.phase_progress || []).filter(p => p.is_client_visible !== false),
  }
}

// ── executive helper: status key + text ───────────────────────────────────────

function deriveStatusKey(status: string | null | undefined): string {
  const s = (status || '').toLowerCase()
  if (s.includes('hold') || s.includes('pause') || s.includes('behind') || s.includes('delay')) return 'behind'
  if (s.includes('risk') || s.includes('concern')) return 'at_risk'
  return 'on_track'
}

function deriveStatusText(status: string | null | undefined): string {
  const key = deriveStatusKey(status)
  if (key === 'behind')   return 'On Hold / Behind'
  if (key === 'at_risk')  return 'At Risk'
  return 'On Track'
}

function generateExecutiveSummary(data: any): string {
  const completed    = data.completed_tasks?.length || 0
  const statusChgs   = data.status_changes?.length  || 0
  const phaseMoved   = data.phase_progress?.length  || 0
  const openCount    = data.snapshot?.open_total    || 0
  const currentPhase = data.vitals?.current_phase   || null
  const phasePct     = data.vitals?.phase_progress_pct

  const parts: string[] = []
  if (completed > 0)
    parts.push(`${completed} task${completed !== 1 ? 's' : ''} completed`)
  if (phaseMoved > 0)
    parts.push(`${phaseMoved} phase${phaseMoved !== 1 ? 's' : ''} advanced`)
  if (currentPhase)
    parts.push(`currently in ${currentPhase}${phasePct != null ? ` (${phasePct}%)` : ''}`)
  if (statusChgs > 0)
    parts.push(`${statusChgs} status update${statusChgs !== 1 ? 's' : ''}`)
  if (openCount > 0)
    parts.push(`${openCount} task${openCount !== 1 ? 's' : ''} in progress`)

  return parts.length > 0
    ? parts.join(', ').replace(/,([^,]*)$/, ' and$1') + '.'
    : 'No significant changes recorded in this reporting period.'
}

function calculateAtAGlance(data: any, allProjects: any[]): { on_track: number; at_risk: number; behind: number } {
  if (!allProjects || allProjects.length === 0) {
    // Fallback: infer from a single project if data.project_id exists
    if (data.project_id) {
      const key = deriveStatusKey(data.project_status || null)
      return { on_track: key === 'on_track' ? 1 : 0, at_risk: key === 'at_risk' ? 1 : 0, behind: key === 'behind' ? 1 : 0 }
    }
    return { on_track: 0, at_risk: 0, behind: 0 }
  }
  return allProjects.reduce(
    (acc, p) => {
      const key = deriveStatusKey(p.status)
      acc[key as keyof typeof acc] = (acc[key as keyof typeof acc] || 0) + 1
      return acc
    },
    { on_track: 0, at_risk: 0, behind: 0 }
  )
}

function generateKeyHighlights(data: any): string[] {
  const highlights: string[] = []

  const v = data.vitals
  const periodCompleted = data.completed_tasks?.length ?? 0
  if (periodCompleted > 0)
    highlights.push(`${periodCompleted} task${periodCompleted !== 1 ? 's' : ''} completed this period`)
  if (v?.current_phase)
    highlights.push(`Active phase: ${v.current_phase}${v.phase_progress_pct != null ? ` — ${v.phase_progress_pct}% complete` : ''}`)
  if (data.status_changes?.length > 0)
    highlights.push(`${data.status_changes.length} project status update${data.status_changes.length !== 1 ? 's' : ''}`)
  if (data.phase_progress?.length > 0)
    highlights.push(`${data.phase_progress.length} phase${data.phase_progress.length !== 1 ? 's' : ''} advanced`)
  if (v?.open_tasks_count > 0)
    highlights.push(`${v.open_tasks_count} open task${v.open_tasks_count !== 1 ? 's' : ''} remaining`)

  return highlights.slice(0, 5)
}

function generateProjectSummary(data: any, allProjects: any[], phases: any[]): any[] {
  if (data.project_id) {
    const proj = allProjects?.[0] || {}
    const projPhases = phases.filter((p: any) => p.is_client_visible !== false)
    const progress = projPhases.length > 0
      ? Math.round(projPhases.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projPhases.length)
      : (data.vitals?.phase_progress_pct ?? 0)
    return [{
      name: proj.name || data.project_name || 'Project',
      status: deriveStatusKey(proj.status),
      status_text: deriveStatusText(proj.status),
      progress,
    }]
  }

  return (allProjects || []).map((proj: any) => {
    const projPhases = phases.filter((p: any) => p.project_id === proj.id && p.is_client_visible !== false)
    const progress = projPhases.length > 0
      ? Math.round(projPhases.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projPhases.length)
      : 0
    return {
      name: proj.name || 'Project',
      status: deriveStatusKey(proj.status),
      status_text: deriveStatusText(proj.status),
      progress,
    }
  })
}

function parseActivityDetails(activity: { details?: unknown }): Record<string, unknown> {
  const d = activity?.details
  if (d == null) return {}
  if (typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>
  if (typeof d === 'string') {
    try {
      const parsed = JSON.parse(d) as unknown
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return {}
}
