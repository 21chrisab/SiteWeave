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


