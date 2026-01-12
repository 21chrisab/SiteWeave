import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { userId, organizationId } = await req.json()

    if (!userId || !organizationId) {
      throw new Error('Missing required fields: userId, organizationId')
    }

    // Verify user has can_manage_team permission
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        role_id,
        roles (
          permissions
        )
      `)
      .eq('id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!profile?.roles?.permissions?.can_manage_team) {
      throw new Error('Not authorized - can_manage_team permission required')
    }

    // Prevent self-removal
    if (userId === user.id) {
      throw new Error('Cannot remove yourself from the organization')
    }

    // Verify target user is in same organization
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (targetProfile?.organization_id !== organizationId) {
      throw new Error('User is not in this organization')
    }

    // Remove user from organization (set organization_id and role_id to null)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id: null,
        role_id: null
      })
      .eq('id', userId)
      .eq('organization_id', organizationId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
