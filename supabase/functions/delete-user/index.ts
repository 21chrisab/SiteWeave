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

    // Delete user's data from related tables first (due to foreign key constraints).
    // Check each step so we never delete the auth user if a step fails (avoids inconsistent state).
    const { error: tasksErr } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('assigned_to', user.id)
    if (tasksErr) throw tasksErr

    const { error: eventsErr } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('user_id', user.id)
    if (eventsErr) throw eventsErr

    const { error: messagesErr } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('sender_id', user.id)
    if (messagesErr) throw messagesErr

    const { error: contactsErr } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('user_id', user.id)
    if (contactsErr) throw contactsErr

    const { error: membersErr } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('user_id', user.id)
    if (membersErr) throw membersErr

    const { data: userProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('created_by', user.id)

    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(p => p.id)
      const { error: ptErr } = await supabaseAdmin.from('tasks').delete().in('project_id', projectIds)
      if (ptErr) throw ptErr
      const { error: peErr } = await supabaseAdmin.from('events').delete().in('project_id', projectIds)
      if (peErr) throw peErr
      const { error: pmErr } = await supabaseAdmin.from('project_members').delete().in('project_id', projectIds)
      if (pmErr) throw pmErr
      const { error: pcErr } = await supabaseAdmin.from('project_contacts').delete().in('project_id', projectIds)
      if (pcErr) throw pcErr
      const { error: projErr } = await supabaseAdmin.from('projects').delete().eq('created_by', user.id)
      if (projErr) throw projErr
    }

    // Finally, delete the auth user only after all data deletes succeeded
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


