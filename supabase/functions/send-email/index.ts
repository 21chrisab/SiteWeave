// Supabase Edge Function for sending emails
// Deploy this function with: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, subject, html, text } = await req.json()

    // Validate input
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and html or text' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Option 1: Use Resend (recommended for production)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SiteWeave Notifications <notifications@send.resend.dev>', // Resend shared domain for production
          to: [to],
          subject: subject,
          html: html,
          text: text
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('Resend error:', resendData)
        return new Response(
          JSON.stringify({ error: 'Failed to send email via Resend', details: resendData }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: resendData.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Option 2: Use Supabase Auth email (for testing/development)
    // Note: This uses Supabase's built-in email service, which has rate limits
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // For development, we can use a workaround by creating a custom email
    // In production, you should use a proper email service like Resend, SendGrid, or AWS SES
    
    console.log('Email would be sent to:', to)
    console.log('Subject:', subject)
    console.log('Body preview:', text?.substring(0, 100) || html?.substring(0, 100))

    // Return success (in dev mode, emails won't actually be sent without a proper service)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email logged (configure RESEND_API_KEY for actual sending)',
        to,
        subject 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

