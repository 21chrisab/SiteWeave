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

    const { email, organizationId, roleId } = await req.json()

    if (!email || !organizationId) {
      throw new Error('Missing required fields: email, organizationId')
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

    // Generate invitation token
    const invitationToken = crypto.randomUUID().replace(/-/g, '')

    // Create invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        organization_id: organizationId,
        role_id: roleId || null,
        invited_by_user_id: user.id,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (invitationError) throw invitationError

    // TODO: Send invitation email
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const setupUrl = `${appUrl}/invite/${invitationToken}`

    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        setupUrl: setupUrl
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
