import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a Supabase client with the Auth context of the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Create admin client to delete the user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete user's data from related tables first (due to foreign key constraints)
    // This is important to clean up all user data before deleting the auth user
    
    // Delete user's tasks
    await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('assigned_to', user.id)

    // Delete user's events
    await supabaseAdmin
      .from('events')
      .delete()
      .eq('user_id', user.id)

    // Delete user's messages
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('sender_id', user.id)

    // Delete user's contacts
    await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('user_id', user.id)

    // Delete user's project memberships
    await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('user_id', user.id)

    // Delete projects created by the user (if they're the owner)
    const { data: userProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('created_by', user.id)

    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(p => p.id)
      
      // Delete related data for these projects
      await supabaseAdmin
        .from('tasks')
        .delete()
        .in('project_id', projectIds)

      await supabaseAdmin
        .from('events')
        .delete()
        .in('project_id', projectIds)

      await supabaseAdmin
        .from('project_members')
        .delete()
        .in('project_id', projectIds)

      await supabaseAdmin
        .from('project_contacts')
        .delete()
        .in('project_id', projectIds)

      // Finally delete the projects
      await supabaseAdmin
        .from('projects')
        .delete()
        .eq('created_by', user.id)
    }

    // Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    )

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ message: 'User account deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})


