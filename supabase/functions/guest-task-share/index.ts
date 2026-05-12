import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sha256Hex } from '../_shared/guestShare.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const BUCKET = 'task_photos'
const SIGNED_TTL = 3600
const MAX_UPLOAD = 5242880

function parseBearer(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!h?.startsWith('Bearer ')) return null
  const t = h.slice(7).trim()
  return t || null
}

function sanitizeFileName(name: string): string {
  return String(name || 'photo.jpg')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'photo.jpg'
}

function guestPhotoPaths(
  orgId: string,
  projectId: string,
  taskId: string,
  photoId: string,
  fileName: string,
) {
  const safe = sanitizeFileName(fileName)
  const ext = safe.includes('.') ? safe.split('.').pop() : 'jpg'
  const baseName = `${photoId}-${Date.now()}`
  return {
    originalPath: `${orgId}/${projectId}/${taskId}/original/${baseName}.${ext}`,
  }
}

async function loadShare(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  rawToken: string,
) {
  const token_hash = await sha256Hex(rawToken)
  const { data, error } = await supabase
    .from('task_notification_guest_shares')
    .select('id, project_id, organization_id, task_ids, expires_at')
    .eq('token_hash', token_hash)
    .maybeSingle()

  if (error || !data) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null
  return data
}

async function attachSignedUrls(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  photos: any[],
) {
  const out = []
  for (const p of photos || []) {
    const bucket = p.storage_bucket || BUCKET
    const [full, thumb] = await Promise.all([
      supabase.storage.from(bucket).createSignedUrl(p.storage_path, SIGNED_TTL),
      supabase.storage.from(bucket).createSignedUrl(p.thumbnail_path || p.storage_path, SIGNED_TTL),
    ])
    out.push({
      id: p.id,
      task_id: p.task_id,
      caption: p.caption,
      sort_order: p.sort_order,
      is_completion_photo: p.is_completion_photo,
      full_url: full.data?.signedUrl || null,
      thumbnail_url: thumb.data?.signedUrl || null,
    })
  }
  return out
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const rawToken = parseBearer(req)
  if (!rawToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
  const supabase = createClient(supabaseUrl, serviceKey)

  const share = await loadShare(supabase, rawToken)
  if (!share) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const taskIds: string[] = (share.task_ids || []) as string[]

  if (req.method === 'GET') {
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, name, address')
      .eq('id', share.project_id)
      .maybeSingle()

    if (pErr || !project) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: tasks, error: tErr } = await supabase
      .from('tasks')
      .select('id, text, start_date, due_date, completed')
      .eq('project_id', share.project_id)
      .in('id', taskIds)

    if (tErr) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const taskMap = new Map((tasks || []).map((t: { id: string }) => [t.id, t]))
    const orderedTasks = taskIds.map((id) => taskMap.get(id)).filter(Boolean)

    const { data: photoRows } = await supabase
      .from('task_photos')
      .select('*')
      .in('task_id', taskIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const photosByTask = new Map<string, any[]>()
    for (const row of photoRows || []) {
      const tid = row.task_id as string
      if (!photosByTask.has(tid)) photosByTask.set(tid, [])
      photosByTask.get(tid)!.push(row)
    }

    const tasksOut = await Promise.all(
      orderedTasks.map(async (t: { id: string }) => ({
        ...t,
        photos: await attachSignedUrls(supabase, photosByTask.get(t.id) || []),
      })),
    )

    return new Response(JSON.stringify({ project, tasks: tasksOut }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  if (req.method === 'POST') {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const taskId = String(form.get('task_id') || '').trim()
    const file = form.get('file')
    if (!taskId || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'task_id and file required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!taskIds.includes(taskId)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const mt = file.type || 'application/octet-stream'
    if (!allowed.includes(mt)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (file.size > MAX_UPLOAD) {
      return new Response(JSON.stringify({ error: 'File too large' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: taskCheck, error: taskErr } = await supabase
      .from('tasks')
      .select('id, project_id, organization_id')
      .eq('id', taskId)
      .eq('project_id', share.project_id)
      .maybeSingle()

    if (taskErr || !taskCheck) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const photoId = crypto.randomUUID()
    const { originalPath } = guestPhotoPaths(
      share.organization_id,
      share.project_id,
      taskId,
      photoId,
      file.name || 'photo.jpg',
    )

    const buf = new Uint8Array(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(originalPath, buf, {
      contentType: mt,
      upsert: false,
    })
    if (upErr) {
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: maxRow } = await supabase
      .from('task_photos')
      .select('sort_order')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sortOrder = (maxRow?.sort_order ?? -1) + 1

    const { data: inserted, error: insErr } = await supabase
      .from('task_photos')
      .insert({
        id: photoId,
        task_id: taskId,
        storage_bucket: BUCKET,
        storage_path: originalPath,
        thumbnail_path: null,
        caption: null,
        sort_order: sortOrder,
        is_completion_photo: false,
        uploaded_by_user_id: null,
        mime_type: mt,
        original_filename: file.name || null,
        file_size_bytes: file.size,
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      await supabase.storage.from(BUCKET).remove([originalPath])
      return new Response(JSON.stringify({ error: 'Save failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const [withUrls] = await attachSignedUrls(supabase, [inserted])
    return new Response(JSON.stringify({ photo: withUrls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
})
