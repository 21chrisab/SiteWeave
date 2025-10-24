import { supabaseClient } from '../context/AppContext';

/**
 * Generate a unique invitation token
 * @returns {string}
 */
function generateInvitationToken() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send an invitation to join a project and optionally assign to a task
 * @param {string} email - Email address to invite
 * @param {string} projectId - Project UUID
 * @param {number} issueId - Optional issue ID
 * @param {number} stepId - Optional step ID
 * @param {string} invitedByUserId - User ID of inviter
 * @returns {Promise<{success: boolean, invitationId?: string, error?: string}>}
 */
export async function sendInvitation(email, projectId, issueId = null, stepId = null, invitedByUserId) {
    try {
        // Validate email
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Invalid email address' };
        }

        // Check if user already exists with this email
        const { data: existingUser } = await supabaseClient
            .from('auth.users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return { 
                success: false, 
                error: 'User with this email already exists. Please assign them directly.' 
            };
        }

        // Check if there's already a pending invitation
        const { data: existingInvitation } = await supabaseClient
            .from('invitations')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('project_id', projectId)
            .eq('status', 'pending')
            .single();

        if (existingInvitation) {
            return { 
                success: false, 
                error: 'An invitation has already been sent to this email for this project.' 
            };
        }

        // Generate invitation token
        const invitationToken = generateInvitationToken();

        // Create invitation record
        const { data: invitation, error: invitationError } = await supabaseClient
            .from('invitations')
            .insert({
                email: email.toLowerCase(),
                project_id: projectId,
                issue_id: issueId,
                step_id: stepId,
                invited_by_user_id: invitedByUserId,
                invitation_token: invitationToken,
                status: 'pending'
            })
            .select()
            .single();

        if (invitationError) {
            console.error('Error creating invitation:', invitationError);
            return { success: false, error: invitationError.message };
        }

        // Get project details for email
        const { data: project } = await supabaseClient
            .from('projects')
            .select('name, address')
            .eq('id', projectId)
            .single();

        // Get inviter details
        const { data: inviter } = await supabaseClient
            .from('profiles')
            .select('*, contacts(*)')
            .eq('id', invitedByUserId)
            .single();

        const inviterName = inviter?.contacts?.name || 'A team member';

        // Construct invitation URL
        const appUrl = window.location.origin;
        const invitationUrl = `${appUrl}/invite/${invitationToken}`;

        // Send invitation email
        const emailResult = await supabaseClient.functions.invoke('send-invitation-email', {
            body: {
                to: email,
                inviterName: inviterName,
                projectName: project?.name || 'a project',
                invitationUrl: invitationUrl,
                issueId: issueId,
                stepId: stepId
            }
        });

        if (emailResult.error) {
            console.error('Error sending invitation email:', emailResult.error);
            // Don't fail the invitation creation, just log the error
        }

        return { 
            success: true, 
            invitationId: invitation.id,
            invitationToken: invitationToken
        };

    } catch (error) {
        console.error('Error in sendInvitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Accept an invitation and link user to project
 * @param {string} invitationToken - Invitation token
 * @param {string} userId - New user ID after signup
 * @returns {Promise<{success: boolean, projectId?: string, error?: string}>}
 */
export async function acceptInvitation(invitationToken, userId) {
    try {
        // Get invitation details
        const { data: invitation, error: invitationError } = await supabaseClient
            .from('invitations')
            .select('*')
            .eq('invitation_token', invitationToken)
            .single();

        if (invitationError || !invitation) {
            return { success: false, error: 'Invalid invitation token' };
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            return { success: false, error: 'This invitation has expired' };
        }

        // Check if invitation is already accepted
        if (invitation.status === 'accepted') {
            return { success: false, error: 'This invitation has already been accepted' };
        }

        // Get user email
        const { data: user } = await supabaseClient.auth.getUser();
        const userEmail = user?.user?.email;

        // Verify email matches
        if (userEmail?.toLowerCase() !== invitation.email.toLowerCase()) {
            return { 
                success: false, 
                error: 'This invitation was sent to a different email address' 
            };
        }

        // Create or update contact record for this user
        let contactId;
        
        const { data: existingProfile } = await supabaseClient
            .from('profiles')
            .select('contact_id')
            .eq('id', userId)
            .single();

        if (existingProfile?.contact_id) {
            contactId = existingProfile.contact_id;
        } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabaseClient
                .from('contacts')
                .insert({
                    name: user?.user?.user_metadata?.full_name || userEmail,
                    role: 'Team Member',
                    type: 'Team',
                    email: userEmail,
                    company: 'SiteWeave',
                    trade: 'Internal',
                    status: 'Available'
                })
                .select()
                .single();

            if (contactError) {
                console.error('Error creating contact:', contactError);
                return { success: false, error: 'Failed to create contact record' };
            }

            contactId = newContact.id;

            // Link contact to profile
            await supabaseClient
                .from('profiles')
                .update({ contact_id: contactId })
                .eq('id', userId);
        }

        // Add user to project via project_contacts
        const { error: projectContactError } = await supabaseClient
            .from('project_contacts')
            .insert({
                project_id: invitation.project_id,
                contact_id: contactId
            });

        if (projectContactError && !projectContactError.message.includes('duplicate')) {
            console.error('Error adding to project:', projectContactError);
            return { success: false, error: 'Failed to add to project' };
        }

        // If there's a specific step, update it to assign to this user
        if (invitation.step_id) {
            await supabaseClient
                .from('issue_steps')
                .update({
                    assigned_to_user_id: userId,
                    assigned_to_contact_id: contactId
                })
                .eq('id', invitation.step_id);
        }

        // Mark invitation as accepted
        await supabaseClient
            .from('invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

        return { 
            success: true, 
            projectId: invitation.project_id,
            issueId: invitation.issue_id
        };

    } catch (error) {
        console.error('Error in acceptInvitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get pending invitations for a project
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, invitations?: array, error?: string}>}
 */
export async function getProjectInvitations(projectId) {
    try {
        const { data, error } = await supabaseClient
            .from('invitations')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, invitations: data };
    } catch (error) {
        console.error('Error in getProjectInvitations:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel an invitation
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelInvitation(invitationId) {
    try {
        const { error } = await supabaseClient
            .from('invitations')
            .update({ status: 'cancelled' })
            .eq('id', invitationId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in cancelInvitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Resend an invitation email
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resendInvitation(invitationId) {
    try {
        const { data: invitation, error } = await supabaseClient
            .from('invitations')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (error || !invitation) {
            return { success: false, error: 'Invitation not found' };
        }

        if (invitation.status !== 'pending') {
            return { success: false, error: 'Can only resend pending invitations' };
        }

        // Get project and inviter details
        const { data: project } = await supabaseClient
            .from('projects')
            .select('name')
            .eq('id', invitation.project_id)
            .single();

        const { data: inviter } = await supabaseClient
            .from('profiles')
            .select('*, contacts(*)')
            .eq('id', invitation.invited_by_user_id)
            .single();

        const inviterName = inviter?.contacts?.name || 'A team member';
        const appUrl = window.location.origin;
        const invitationUrl = `${appUrl}/invite/${invitation.invitation_token}`;

        // Resend email
        const emailResult = await supabaseClient.functions.invoke('send-invitation-email', {
            body: {
                to: invitation.email,
                inviterName: inviterName,
                projectName: project?.name || 'a project',
                invitationUrl: invitationUrl,
                issueId: invitation.issue_id,
                stepId: invitation.step_id
            }
        });

        if (emailResult.error) {
            return { success: false, error: 'Failed to send email' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in resendInvitation:', error);
        return { success: false, error: error.message };
    }
}




