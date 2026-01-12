// Supabase Edge Function for sending invitation emails
// Deploy this function with: supabase functions deploy send-invitation-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, inviterName, projectName, invitationUrl, issueId, stepId } = await req.json()

    if (!to || !inviterName || !projectName || !invitationUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subject = `${inviterName} invited you to join ${projectName} on SiteWeave`
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
        .content { padding: 40px 30px; }
        .content p { margin: 0 0 20px 0; font-size: 16px; color: #374151; }
        .invitation-box { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center; }
        .project-name { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 10px 0; }
        .inviter-name { font-size: 16px; color: #6b7280; margin: 0; }
        .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .features { margin: 30px 0; }
        .feature { display: flex; align-items: start; margin: 15px 0; }
        .feature-icon { background: #eff6ff; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px; flex-shrink: 0; }
        .feature-text { flex: 1; }
        .feature-title { font-weight: 600; color: #111827; margin: 0 0 5px 0; }
        .feature-desc { color: #6b7280; font-size: 14px; margin: 0; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .footer a { color: #667eea; text-decoration: none; }
        .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join your team on SiteWeave</p>
        </div>
        
        <div class="content">
            <p>Hi there,</p>
            
            <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${projectName}</strong> using SiteWeave - the modern project management platform for construction teams.</p>
            
            <div class="invitation-box">
                <p class="project-name">${projectName}</p>
                <p class="inviter-name">Invited by ${inviterName}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${invitationUrl}" class="cta-button">Accept Invitation & Sign Up</a>
            </div>
            
            <div class="divider"></div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">📋</div>
                    <div class="feature-text">
                        <p class="feature-title">Dynamic Workflows</p>
                        <p class="feature-desc">Track issues and tasks with custom workflows</p>
                    </div>
                </div>
                <div class="feature">
                    <div class="feature-icon">📁</div>
                    <div class="feature-text">
                        <p class="feature-title">File Management</p>
                        <p class="feature-desc">Share and organize project files in one place</p>
                    </div>
                </div>
                <div class="feature">
                    <div class="feature-icon">👥</div>
                    <div class="feature-text">
                        <p class="feature-title">Team Collaboration</p>
                        <p class="feature-desc">Communicate and coordinate with your entire team</p>
                    </div>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6b7280;">
                This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} directly.
            </p>
        </div>
        
        <div class="footer">
            <p><strong>SiteWeave</strong> - Modern Project Management for Construction</p>
            <p style="margin-top: 10px;">
                <a href="${invitationUrl}">Accept Invitation</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    const textBody = `
You're Invited to Join ${projectName} on SiteWeave!

${inviterName} has invited you to collaborate on ${projectName}.

Accept your invitation here:
${invitationUrl}

SiteWeave is a modern project management platform for construction teams with features like:
- Dynamic workflow tracking
- File management and sharing
- Team collaboration tools

This invitation expires in 7 days.

If you have questions, please contact ${inviterName} directly.

---
SiteWeave - Modern Project Management for Construction
    `.trim()

    // Send email via Resend
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SiteWeave Invitations <invitations@siteweave.org>',
          to: [to],
          subject: subject,
          html: htmlBody,
          text: textBody
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('Resend error:', resendData)
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: resendData }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: resendData.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fallback for development
    console.log('Invitation email would be sent to:', to)
    console.log('Invitation URL:', invitationUrl)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation logged (configure RESEND_API_KEY for actual sending)',
        to,
        invitationUrl
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-invitation-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

