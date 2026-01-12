import { supabaseClient } from '../context/AppContext';

/**
 * Send task assignment email to external contact
 * @param {string} contactEmail - Email address of the contact
 * @param {object} taskDetails - Details of the task/issue step
 * @param {object} projectDetails - Details of the project
 * @param {string} assignerName - Name of the person assigning the task
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTaskAssignmentEmail(contactEmail, taskDetails, projectDetails, assignerName) {
    try {
        // Validate email
        if (!contactEmail || !contactEmail.includes('@')) {
            return { success: false, error: 'Invalid email address' };
        }

        // Construct email content
        const subject = `New Task Assignment: ${taskDetails.title || 'Issue Step'}`;
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .task-box { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: 600; color: #6b7280; }
        .value { color: #111827; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-priority { background: #fef3c7; color: #92400e; }
        .note { background: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 New Task Assignment</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p><strong>${assignerName}</strong> has assigned you a new task on the <strong>${projectDetails.name}</strong> project.</p>
            
            <div class="task-box">
                <h3 style="margin-top: 0; color: #111827;">Task Details</h3>
                ${taskDetails.issueTitle ? `<div class="info-row"><span class="label">Issue:</span> <span class="value">${taskDetails.issueTitle}</span></div>` : ''}
                <div class="info-row">
                    <span class="label">Step:</span> 
                    <span class="value">${taskDetails.description}</span>
                </div>
                ${taskDetails.priority ? `
                <div class="info-row">
                    <span class="label">Priority:</span> 
                    <span class="badge badge-priority">${taskDetails.priority}</span>
                </div>` : ''}
                ${taskDetails.dueDate ? `
                <div class="info-row">
                    <span class="label">Due Date:</span> 
                    <span class="value">${new Date(taskDetails.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>` : ''}
            </div>

            <div class="info-row">
                <span class="label">Project:</span> <span class="value">${projectDetails.name}</span>
            </div>
            ${projectDetails.address ? `
            <div class="info-row">
                <span class="label">Location:</span> <span class="value">${projectDetails.address}</span>
            </div>` : ''}

            <div class="note">
                <strong>📧 How to Respond:</strong>
                <p style="margin: 10px 0 0 0;">Please reply to this email with your updates, files, or questions about this task. ${assignerName} will follow up with you directly.</p>
                <p style="margin: 10px 0 0 0;"><em>Note: You do not need a SiteWeave account to complete this task. Simply respond via email.</em></p>
            </div>
        </div>
        <div class="footer">
            <p>This email was sent from SiteWeave Project Management</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">If you have questions, please reply to this email or contact ${assignerName}.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textBody = `
New Task Assignment

Hello,

${assignerName} has assigned you a new task on the ${projectDetails.name} project.

TASK DETAILS:
${taskDetails.issueTitle ? `Issue: ${taskDetails.issueTitle}\n` : ''}Step: ${taskDetails.description}
${taskDetails.priority ? `Priority: ${taskDetails.priority}\n` : ''}${taskDetails.dueDate ? `Due Date: ${new Date(taskDetails.dueDate).toLocaleDateString()}\n` : ''}
Project: ${projectDetails.name}
${projectDetails.address ? `Location: ${projectDetails.address}\n` : ''}

HOW TO RESPOND:
Please reply to this email with your updates, files, or questions about this task. ${assignerName} will follow up with you directly.

Note: You do not need a SiteWeave account to complete this task. Simply respond via email.

---
This email was sent from SiteWeave Project Management
        `.trim();

        // Use Supabase edge function to send email
        // Note: This requires a Supabase edge function to be deployed
        // For now, we'll use a placeholder that can be replaced with actual implementation
        
        const { data, error } = await supabaseClient.functions.invoke('send-email', {
            body: {
                to: contactEmail,
                subject: subject,
                html: htmlBody,
                text: textBody
            }
        });

        if (error) {
            console.error('Email sending error:', error);
            return { success: false, error: error.message || 'Failed to send email' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendTaskAssignmentEmail:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Send task update notification to external contact
 * @param {string} contactEmail - Email address of the contact
 * @param {object} updateDetails - Details of the update
 * @param {object} projectDetails - Details of the project
 * @param {string} updaterName - Name of the person making the update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTaskUpdateEmail(contactEmail, updateDetails, projectDetails, updaterName) {
    try {
        if (!contactEmail || !contactEmail.includes('@')) {
            return { success: false, error: 'Invalid email address' };
        }

        const subject = `Task Update: ${updateDetails.issueTitle || 'Your Task'}`;
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📢 Task Update</h2>
        </div>
        <div class="content">
            <p>${updaterName} posted an update on your task:</p>
            <blockquote style="border-left: 3px solid #3b82f6; padding-left: 15px; margin: 20px 0; color: #4b5563;">
                ${updateDetails.message}
            </blockquote>
            <p>Project: <strong>${projectDetails.name}</strong></p>
        </div>
        <div class="footer">
            <p>Reply to this email to respond</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const { data, error } = await supabaseClient.functions.invoke('send-email', {
            body: {
                to: contactEmail,
                subject: subject,
                html: htmlBody
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendTaskUpdateEmail:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send calendar event invitation email to attendee
 * @param {string} attendeeEmail - Email address of the attendee
 * @param {object} eventDetails - Details of the calendar event
 * @param {string} organizerName - Name of the event organizer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendCalendarInvitationEmail(attendeeEmail, eventDetails, organizerName) {
    try {
        // Validate email
        if (!attendeeEmail || !attendeeEmail.includes('@')) {
            return { success: false, error: 'Invalid email address' };
        }

        // Format date and time
        const formatDate = (dateTimeString) => {
            if (!dateTimeString) return 'TBD';
            const date = new Date(dateTimeString);
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        };

        const formatTime = (dateTimeString) => {
            if (!dateTimeString) return 'TBD';
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        };

        const eventDate = formatDate(eventDetails.start_time);
        const startTime = eventDetails.is_all_day ? 'All Day' : formatTime(eventDetails.start_time);
        const endTime = eventDetails.is_all_day ? '' : formatTime(eventDetails.end_time);
        const timeRange = eventDetails.is_all_day ? 'All Day' : `${startTime} - ${endTime}`;
        
        // Generate calendar links (placeholders - to be wired up later)
        const generateGoogleCalendarLink = () => {
            // TODO: Implement Google Calendar link generation
            return '#';
        };

        const generateOutlookLink = () => {
            // TODO: Implement Outlook link generation
            return '#';
        };

        const generateICSDownloadLink = () => {
            // TODO: Implement .ics file generation and download link
            return '#';
        };

        const googleCalendarLink = generateGoogleCalendarLink();
        const outlookLink = generateOutlookLink();
        const icsLink = generateICSDownloadLink();

        // Construct email content
        const subject = `New Event: ${eventDetails.title || 'Event'}`;
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            background: #f6f9fc; 
            padding: 40px 20px; 
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
        }
        .card { 
            background: #ffffff; 
            border-radius: 8px; 
            border: 1px solid #e6ebf1;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .header { 
            background: #ffffff; 
            padding: 48px 40px 24px 40px; 
            text-align: center; 
            border-bottom: 1px solid #e5e7eb;
        }
        .logo-img {
            width: 150px;
            height: auto;
            margin: 0 auto 24px auto;
            display: block;
        }
        .content { 
            padding: 40px; 
        }
        .headline { 
            font-size: 24px; 
            font-weight: 600; 
            color: #1a1a1a; 
            margin: 0 0 8px 0;
            line-height: 1.3;
        }
        .sub-headline {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px 0;
        }
        .event-details-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 24px;
            margin: 24px 0;
        }
        .detail-row {
            display: flex;
            align-items: flex-start;
            margin: 16px 0;
        }
        .detail-row:first-child {
            margin-top: 0;
        }
        .detail-row:last-child {
            margin-bottom: 0;
        }
        .detail-icon {
            font-size: 18px;
            margin-right: 12px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .detail-content {
            flex: 1;
        }
        .detail-label {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .detail-value {
            font-size: 15px;
            color: #1a1a1a;
            line-height: 1.5;
        }
        .notes-value {
            white-space: pre-wrap;
        }
        .calendar-actions {
            margin: 32px 0;
            padding-top: 32px;
            border-top: 1px solid #e5e7eb;
        }
        .calendar-actions-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
            text-align: center;
        }
        .calendar-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .calendar-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            color: #1a1a1a;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .calendar-button:hover {
            background: #f9fafb;
            border-color: #d1d5db;
        }
        .calendar-button-icon {
            font-size: 16px;
        }
        .footer { 
            background: #f9fafb; 
            padding: 32px 40px; 
            text-align: center; 
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 12px; 
            color: #6b7280; 
            line-height: 1.6;
            margin: 0 0 8px 0;
        }
        .footer-text:last-child {
            margin: 0;
        }
        .footer-compliance {
            font-size: 11px;
            color: #9ca3af;
            line-height: 1.5;
            margin: 16px 0 0 0;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }
        .footer-compliance p {
            margin: 0 0 4px 0;
        }
        .footer-compliance p:last-child {
            margin: 0;
        }
        .footer-link {
            color: #4b5563;
            text-decoration: none;
        }
        .footer-link:hover {
            text-decoration: underline;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 20px 12px; }
            .header { padding: 32px 24px 16px 24px; }
            .content { padding: 32px 24px; }
            .footer { padding: 24px; }
            .headline { font-size: 20px; }
            .calendar-buttons {
                flex-direction: column;
            }
            .calendar-button {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="card">
            <div class="header">
                <img src="https://app.siteweave.org/logo.svg" alt="SiteWeave" class="logo-img" />
            </div>
            <div class="content">
                <h2 class="headline">New Event: ${eventDetails.title || 'Event'}</h2>
                <p class="sub-headline"><strong>${organizerName}</strong> has scheduled an event.</p>
                
                <div class="event-details-box">
                    <div class="detail-row">
                        <span class="detail-icon">📅</span>
                        <div class="detail-content">
                            <div class="detail-label">Date</div>
                            <div class="detail-value">${eventDate}</div>
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">⏰</span>
                        <div class="detail-content">
                            <div class="detail-label">Time</div>
                            <div class="detail-value">${timeRange}</div>
                        </div>
                    </div>
                    ${eventDetails.location ? `
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <div class="detail-content">
                            <div class="detail-label">Location</div>
                            <div class="detail-value">${eventDetails.location}</div>
                        </div>
                    </div>` : `
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <div class="detail-content">
                            <div class="detail-label">Location</div>
                            <div class="detail-value">Remote</div>
                        </div>
                    </div>`}
                    ${eventDetails.description ? `
                    <div class="detail-row">
                        <span class="detail-icon">📝</span>
                        <div class="detail-content">
                            <div class="detail-label">Notes</div>
                            <div class="detail-value notes-value">${eventDetails.description}</div>
                        </div>
                    </div>` : ''}
                </div>

                <div class="calendar-actions">
                    <div class="calendar-actions-title">Add to Calendar</div>
                    <div class="calendar-buttons">
                        <a href="${googleCalendarLink}" class="calendar-button">
                            <span class="calendar-button-icon">📅</span>
                            <span>Google Calendar</span>
                        </a>
                        <a href="${outlookLink}" class="calendar-button">
                            <span class="calendar-button-icon">📧</span>
                            <span>Outlook</span>
                        </a>
                        <a href="${icsLink}" class="calendar-button">
                            <span class="calendar-button-icon">⬇️</span>
                            <span>Download .ics</span>
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">
                    <a href="https://siteweave.org" class="footer-link">siteweave.org</a>
                </p>
                <div class="footer-compliance">
                    <p>© 2026 SiteWeave. All rights reserved.</p>
                    <p>1671 moonlight trail cedar park tx 78613</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textBody = `
New Event: ${eventDetails.title || 'Event'}

${organizerName} has scheduled an event.

EVENT DETAILS:
Date: ${eventDate}
Time: ${timeRange}
${eventDetails.location ? `Location: ${eventDetails.location}\n` : 'Location: Remote\n'}${eventDetails.description ? `Notes: ${eventDetails.description}\n` : ''}

Add to Calendar:
- Google Calendar: ${googleCalendarLink}
- Outlook: ${outlookLink}
- Download .ics: ${icsLink}

---
© 2026 SiteWeave. All rights reserved.
1671 moonlight trail cedar park tx 78613
siteweave.org
        `.trim();

        // Use Supabase edge function to send email
        const { data, error } = await supabaseClient.functions.invoke('send-email', {
            body: {
                to: attendeeEmail,
                subject: subject,
                html: htmlBody,
                text: textBody
            }
        });

        if (error) {
            console.error('Email sending error:', error);
            return { success: false, error: error.message || 'Failed to send email' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendCalendarInvitationEmail:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}


