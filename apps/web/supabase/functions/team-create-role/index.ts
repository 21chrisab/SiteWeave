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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's profile and role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, roles(permissions)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Check permission
    const userPermissions = profile.roles?.permissions || {}
    if (!userPermissions.can_manage_roles && !userPermissions.can_manage_team) {
      throw new Error('Insufficient permissions to create roles')
    }

    const { organizationId, roleName, permissions } = await req.json()

    if (!organizationId || !roleName || !permissions) {
      throw new Error('Missing required fields: organizationId, roleName, permissions')
    }

    // Verify user belongs to this organization
    if (profile.organization_id !== organizationId) {
      throw new Error('User does not belong to this organization')
    }

    // Create role
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .insert({
        organization_id: organizationId,
        name: roleName,
        permissions: permissions,
        is_system_role: false
      })
      .select()
      .single()

    if (roleError) {
      throw roleError
    }

    return new Response(
      JSON.stringify({
        success: true,
        roleId: role.id,
        role: role
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
