// Supabase Edge Function: invite_or_add_member
// Input: { projectId: string, entries: [{ email: string, role: string }] }
// Behavior:
// - If user exists: ensure contact by email, link via project_contacts (idempotent)
// - If user doesn't exist: upsert contact, link via project_contacts, and invite via auth.admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

type Entry = { email: string; role?: string }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function mapContactType(role?: string): string {
  const r = (role || '').toLowerCase()
  if (r === 'client') return 'Client'
  if (r === 'subcontractor') return 'Subcontractor'
  if (r === 'pm' || r === 'project manager') return 'Team'
  return 'Team'
}

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    const body = await req.json()
    console.log('Received request body:', JSON.stringify(body))
    
    const { projectId, entries, addedByUserId } = body

    if (!projectId || !Array.isArray(entries) || entries.length === 0) {
      console.error('Invalid payload:', { projectId, entries })
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: { projectId, entriesCount: entries?.length } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Processing entries for project:', projectId)

    // Get the project's organization_id (required for project_contacts)
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (projectError || !projectData?.organization_id) {
      console.error('Error fetching project or missing organization_id:', projectError)
      return new Response(
        JSON.stringify({ error: 'Project not found or missing organization', details: projectError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = projectData.organization_id
    console.log('Project organization_id:', organizationId)

    const results: Array<{ email: string; action: 'added' | 'invited' | 'skipped'; reason?: string }> = []
    const emailsToSend: Array<{ from: string; to: string[]; subject: string; html: string }> = []

    for (const entry of entries as Entry[]) {
      const email = normalizeEmail(entry.email || '')
      const role = entry.role || 'Team'
      console.log('Processing entry:', { email, role })
      
      if (!email.includes('@')) {
        console.log('Invalid email format:', email)
        results.push({ email, action: 'skipped', reason: 'invalid_email' })
        continue
      }

      try {
        // For demo: Skip user existence check and just add contacts to project
        // In production, you can add invitation logic here
        console.log('Processing contact for email:', email)

        // Ensure a contact exists for this email
        // First, look for a contact in THIS organization
        console.log('Checking for existing contact with email in organization:', email, organizationId)
        let contactId: string | undefined = undefined
        
        // Try to find contact in the same organization first
        const { data: orgContact, error: orgContactError } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .ilike('email', email)
          .eq('organization_id', organizationId)
          .maybeSingle()

        if (orgContactError) {
          console.warn('Error looking up contact in org:', orgContactError)
        } else if (orgContact) {
          contactId = orgContact.id
          console.log('Found contact in organization:', contactId)
        }

        // If not found in org, look for any contact with this email
        if (!contactId) {
          const { data: anyContacts, error: anyContactError } = await supabaseAdmin
            .from('contacts')
            .select('id, organization_id')
            .ilike('email', email)
            .limit(1)

          if (anyContactError) {
            console.error('Error looking up any contact:', anyContactError)
            results.push({ email, action: 'skipped', reason: `contact_lookup_failed: ${anyContactError.message}` })
            continue
          }
          
          if (anyContacts && anyContacts.length > 0) {
            contactId = anyContacts[0].id
            console.log('Found contact (different org or null org):', contactId, 'org:', anyContacts[0].organization_id)
            
            // Update contact's organization_id if it's null
            if (!anyContacts[0].organization_id) {
              console.log('Updating contact organization_id to:', organizationId)
              const { error: updateOrgError } = await supabaseAdmin
                .from('contacts')
                .update({ organization_id: organizationId })
                .eq('id', contactId)
              
              if (updateOrgError) {
                console.warn('Failed to update contact org:', updateOrgError)
              }
            }
          }
        }
        
        console.log('Final contact ID after lookup:', contactId)

        if (!contactId) {
          console.log('Creating new contact for:', email)
          const contactData = {
            name: email,
            email,
            type: mapContactType(role),
            role: role,
            status: 'Available',
            created_by_user_id: addedByUserId || null,
            organization_id: organizationId
          }
          console.log('Contact data to insert:', contactData)
          
          const { data: newContact, error: contactError } = await supabaseAdmin
            .from('contacts')
            .insert(contactData)
            .select('id')
            .single()

          if (contactError) {
            console.error('Error creating contact:', contactError)
            console.error('Contact error details:', {
              message: contactError.message,
              details: contactError.details,
              hint: contactError.hint,
              code: contactError.code
            })
            results.push({ 
              email, 
              action: 'skipped', 
              reason: `contact_create_failed: ${contactError.message}` 
            })
            continue
          }
          contactId = newContact.id
          console.log('Created new contact with ID:', contactId)
        }

        // Link to project via project_contacts (idempotent)
        console.log('Linking contact to project:', { projectId, contactId, role, organizationId })
        const { error: pcError } = await supabaseAdmin
          .from('project_contacts')
          .insert({ project_id: projectId, contact_id: contactId, role, organization_id: organizationId })

        if (pcError) {
          console.error('Error linking to project:', pcError)
          console.error('Project link error details:', {
            message: pcError.message,
            details: pcError.details,
            hint: pcError.hint,
            code: pcError.code
          })
          if (!pcError.message?.toLowerCase().includes('duplicate')) {
            results.push({ 
              email, 
              action: 'skipped', 
              reason: `project_link_failed: ${pcError.message}` 
            })
            continue
          } else {
            console.log('Contact already linked to project (duplicate key)')
          }
        }

        // Successfully added contact to project
        console.log('Successfully added contact to project')
        
        // Send notification email
        let emailSent = false
        
        if (RESEND_API_KEY) {
          try {
            console.log('Sending notification email to:', email)
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #ffffff; padding: 32px 40px 24px 40px; border-radius: 10px 10px 0 0; text-align: center; border: 1px solid #e5e7eb; border-bottom: none;">
                  <img src="https://app.siteweave.org/logo.svg" alt="SiteWeave" style="height: 120px; width: auto; margin: 0 auto; display: block;" />
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937; margin-top: 0;">You've been added to a project! 🎉</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Great news! You've been added to a project on SiteWeave with the role: <strong style="color: #2563eb;">${role}</strong>
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    To access the project and start collaborating with your team, please sign in or create an account:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://siteweave.netlify.app" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Access SiteWeave</a>
                  </div>
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong>What's SiteWeave?</strong><br>
                      SiteWeave is your all-in-one project management platform for construction and field work. Manage tasks, track progress, and collaborate with your team in real-time.
                    </p>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    If you have any questions, please contact your project manager.<br>
                    This is an automated message from SiteWeave.
                  </p>
                </div>
              </div>
            `

            // Add to batch email queue
            emailsToSend.push({
              from: 'SiteWeave <noreply@siteweave.org>',
              to: [email],
              subject: 'You\'ve been added to a project on SiteWeave',
              html: emailHtml
            })
            
            console.log('Email prepared for batch sending to:', email)
            results.push({ email, action: 'added' })
          } catch (emailError) {
            console.error('Error preparing email:', emailError)
            results.push({ email, action: 'added', reason: 'email_prep_failed' })
          }
        } else {
          console.log('RESEND_API_KEY not configured, skipping email')
          results.push({ email, action: 'added', reason: 'email_not_configured' })
        }
      } catch (entryError) {
        console.error('Error processing entry:', entryError)
        console.error('Entry error details:', {
          name: entryError.name,
          message: entryError.message,
          stack: entryError.stack
        })
        results.push({ 
          email, 
          action: 'skipped', 
          reason: `processing_error: ${entryError.message}` 
        })
      }
    }

    // Send all emails in a single batch request
    if (RESEND_API_KEY && emailsToSend.length > 0) {
      try {
        console.log(`Sending ${emailsToSend.length} emails in batch`)
        const batchResponse = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailsToSend)
        })

        const batchData = await batchResponse.json()

        if (batchResponse.ok) {
          console.log('Batch emails sent successfully:', batchData)
        } else {
          console.error('Batch email error:', {
            status: batchResponse.status,
            statusText: batchResponse.statusText,
            data: batchData
          })
          // Mark failed batch emails in results
          emailsToSend.forEach((emailPayload) => {
            const resultIndex = results.findIndex(r => r.email === emailPayload.to[0])
            if (resultIndex !== -1 && results[resultIndex].action === 'added') {
              results[resultIndex].reason = 'batch_email_failed'
            }
          })
        }
      } catch (batchError) {
        console.error('Error sending batch emails:', batchError)
      }
    }

    console.log('Completed processing. Results:', JSON.stringify(results))
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('invite_or_add_member top-level error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'internal_error',
      message: error.message,
      name: error.name
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})


