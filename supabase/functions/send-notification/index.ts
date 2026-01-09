/**
 * Send Push Notification Edge Function
 * Sends push notifications to users via Expo Push Notification service
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId?: string
  userIds?: string[]
  organizationId?: string
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
  badge?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const payload: NotificationPayload = await req.json()

    if (!payload.title || !payload.body) {
      throw new Error('Missing required fields: title, body')
    }

    // Get push tokens for target users
    let pushTokens: string[] = []

    if (payload.userId) {
      // Single user
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .eq('id', payload.userId)
        .single()

      if (profile?.push_token) {
        pushTokens.push(profile.push_token)
      }
    } else if (payload.userIds && payload.userIds.length > 0) {
      // Multiple users
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .in('id', payload.userIds)
        .not('push_token', 'is', null)

      pushTokens = profiles?.map(p => p.push_token).filter(Boolean) || []
    } else if (payload.organizationId) {
      // All users in organization
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .eq('organization_id', payload.organizationId)
        .not('push_token', 'is', null)

      pushTokens = profiles?.map(p => p.push_token).filter(Boolean) || []
    } else {
      throw new Error('Must provide userId, userIds, or organizationId')
    }

    if (pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No push tokens found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Send notifications via Expo Push Notification service
    const messages = pushTokens.map(token => ({
      to: token,
      sound: payload.sound || 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || 'high',
      badge: payload.badge,
    }))

    const expoHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    }

    if (EXPO_ACCESS_TOKEN) {
      expoHeaders['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`
    }

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: expoHeaders,
      body: JSON.stringify(messages),
    })

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text()
      throw new Error(`Expo API error: ${errorText}`)
    }

    const expoResult = await expoResponse.json()
    
    // Check for errors in Expo response
    const errors = expoResult.data?.filter((r: any) => r.status === 'error') || []
    if (errors.length > 0) {
      console.error('Expo push notification errors:', errors)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: pushTokens.length,
        errors: errors.length,
        expoResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
