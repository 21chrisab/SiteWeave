import { supabaseClient } from '../context/AppContext';

/**
 * Log an activity to the activity_log table
 * @param {Object} params - Activity parameters
 * @param {string} params.action - Action performed (e.g., 'created', 'completed', 'updated', 'deleted')
 * @param {string} params.entityType - Type of entity (e.g., 'task', 'project', 'file', 'contact')
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.entityName - Human-readable name of the entity
 * @param {string} params.projectId - Associated project ID
 * @param {Object} params.user - User object with id, name, avatar
 * @param {Object} params.details - Additional context (optional)
 */
export async function logActivity({
    action,
    entityType,
    entityId,
    entityName,
    projectId,
    user,
    details = null
}) {
    try {
        if (!user || !user.id) {
            console.warn('Cannot log activity: user not provided');
            return;
        }

        const activityData = {
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email || 'Unknown User',
            user_avatar: user.user_metadata?.avatar_url || null,
            action,
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            project_id: projectId,
            details: details ? JSON.stringify(details) : null
        };

        const { error } = await supabaseClient
            .from('activity_log')
            .insert(activityData);

        if (error) {
            console.error('Error logging activity:', error);
        } else {
            console.log('Activity logged:', action, entityType, entityName);
        }
    } catch (error) {
        console.error('Error in logActivity:', error);
    }
}

/**
 * Helper functions for common activity types
 */

export function logTaskCreated(task, user, projectId) {
    return logActivity({
        action: 'created',
        entityType: 'task',
        entityId: task.id,
        entityName: task.text,
        projectId: projectId,
        user,
        details: { priority: task.priority, due_date: task.due_date }
    });
}

export function logTaskCompleted(task, user, projectId) {
    return logActivity({
        action: 'completed',
        entityType: 'task',
        entityId: task.id,
        entityName: task.text,
        projectId: projectId,
        user
    });
}

export function logTaskUncompleted(task, user, projectId) {
    return logActivity({
        action: 'uncompleted',
        entityType: 'task',
        entityId: task.id,
        entityName: task.text,
        projectId: projectId,
        user
    });
}

export function logTaskUpdated(task, user, projectId, changes) {
    return logActivity({
        action: 'updated',
        entityType: 'task',
        entityId: task.id,
        entityName: task.text,
        projectId: projectId,
        user,
        details: changes
    });
}

export function logTaskDeleted(task, user, projectId) {
    return logActivity({
        action: 'deleted',
        entityType: 'task',
        entityId: task.id,
        entityName: task.text,
        projectId: projectId,
        user
    });
}

export function logProjectCreated(project, user) {
    return logActivity({
        action: 'created',
        entityType: 'project',
        entityId: project.id,
        entityName: project.name,
        projectId: project.id,
        user
    });
}

export function logFileUploaded(file, user, projectId) {
    return logActivity({
        action: 'uploaded',
        entityType: 'file',
        entityId: file.id,
        entityName: file.name,
        projectId: projectId,
        user,
        details: { file_type: file.type, size_kb: file.size_kb }
    });
}

export function logContactCreated(contact, user, projectId = null) {
    return logActivity({
        action: 'created',
        entityType: 'contact',
        entityId: contact.id,
        entityName: contact.name,
        projectId: projectId,
        user,
        details: { role: contact.role, type: contact.type }
    });
}

/**
 * Log phase progress change
 * @param {Object} phase - Phase object with id, name, progress
 * @param {Object} user - User object
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name
 * @param {number} oldProgress - Previous progress value
 * @param {number} newProgress - New progress value
 * @param {string} organizationId - Organization ID
 */
export async function logPhaseProgressChange(phase, user, projectId, projectName, oldProgress, newProgress, organizationId) {
    if (!user || !user.id) {
        console.warn('Cannot log phase progress change: user not provided');
        return;
    }    try {
        const activityData = {
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email || 'Unknown User',
            user_avatar: user.user_metadata?.avatar_url || null,
            action: 'updated',
            entity_type: 'project_phase',
            entity_id: phase.id,
            entity_name: `${projectName} - ${phase.name}`,
            project_id: projectId,
            organization_id: organizationId,
            details: JSON.stringify({
                phase_name: phase.name,
                old_progress: oldProgress,
                new_progress: newProgress
            })
        };        const { error } = await supabaseClient
            .from('activity_log')
            .insert(activityData);        if (error) {
            console.error('Error logging phase progress change:', error);
        } else {
            console.log('Phase progress change logged:', phase.name, `${oldProgress}% → ${newProgress}%`);
        }
    } catch (error) {
        console.error('Error in logPhaseProgressChange:', error);
    }
}