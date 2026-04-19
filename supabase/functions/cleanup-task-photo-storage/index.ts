/**
 * Removes task photo objects from private storage when metadata rows are deleted
 * (e.g. task CASCADE) or when invoked by a Database Webhook with old_record.
 *
 * Auth: Bearer token must equal SUPABASE_SERVICE_ROLE_KEY (same pattern as generate-progress-report).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type BodyPayload = {
  bucket?: string
  paths?: string[]
  type?: string
  table?: string
  old_record?: Record<string, unknown>
  record?: Record<string, unknown>
}

function collectPaths(body: BodyPayload): { bucket: string; paths: string[] } | null {
  if (body.bucket && Array.isArray(body.paths) && body.paths.length > 0) {
    return { bucket: String(body.bucket), paths: body.paths.filter(Boolean).map(String) }
  }
  const old = (body.old_record || body.record) as Record<string, unknown> | undefined
  if (old && typeof old === 'object') {
    const bucket = (old.storage_bucket as string) || 'task_photos'
    const storagePath = old.storage_path as string | undefined
    const thumbPath = old.thumbnail_path as string | undefined
    const paths = [storagePath, thumbPath].filter((p): p is string => Boolean(p))
    if (paths.length === 0) return null
    return { bucket, paths }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let body: BodyPayload = {}
  try {
    body = (await req.json()) as BodyPayload
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const parsed = collectPaths(body)
  if (!parsed) {
    return new Response(JSON.stringify({ success: true, removed: 0, message: 'No paths to remove' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: removedList, error } = await supabase.storage.from(parsed.bucket).remove(parsed.paths)

  if (error) {
    console.error('cleanup-task-photo-storage remove error', error)
    return new Response(JSON.stringify({ error: error.message, paths: parsed.paths }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      bucket: parsed.bucket,
      requested: parsed.paths.length,
      removed: removedList?.length ?? parsed.paths.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  )
})
