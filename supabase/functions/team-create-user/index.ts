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

    const { email, password, fullName, organizationId, roleId } = await req.json()

    if (!email || !password || !fullName || !organizationId) {
      throw new Error('Missing required fields: email, password, fullName, organizationId')
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

    // Create auth user
    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError2) throw authError2
    if (!authData?.user) throw new Error('Failed to create auth user')

    // Create contact
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        name: fullName,
        email: email.toLowerCase(),
        type: 'Team',
        organization_id: organizationId
      })
      .select()
      .single()

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        organization_id: organizationId,
        role_id: roleId || null,
        contact_id: contact?.id || null,
        must_change_password: true // Managed accounts must change password on first login
      }, {
        onConflict: 'id'
      })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id
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
