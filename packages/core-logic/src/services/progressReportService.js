/**
 * Progress Report Service
 * Handles all progress report-related database operations and scheduling logic
 */

/**
 * Create a new progress report schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} scheduleData - Schedule configuration
 * @returns {Promise<Object>} Created schedule
 */
export async function createProgressReportSchedule(supabase, scheduleData) {
  const { data, error } = await supabase
    .from('progress_report_schedules')
    .insert({
      ...scheduleData,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a progress report schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated schedule
 */
export async function updateProgressReportSchedule(supabase, scheduleId, updates) {
  const { data, error } = await supabase
    .from('progress_report_schedules')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a progress report schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<void>}
 */
export async function deleteProgressReportSchedule(supabase, scheduleId) {
  const { error } = await supabase
    .from('progress_report_schedules')
    .delete()
    .eq('id', scheduleId);
  
  if (error) throw error;
}

/**
 * Get progress report schedules
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} organizationId - Organization ID
 * @param {string|null} projectId - Optional project ID to filter by
 * @returns {Promise<Array>} Array of schedules
 */
export async function getProgressReportSchedules(supabase, organizationId, projectId = null) {
  let query = supabase
    .from('progress_report_schedules')
    .select(`
      *,
      progress_report_recipients(*)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  } else {
    query = query.is('project_id', null);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Get progress report schedules for a single project only (project details view).
 * Reports are scoped to this project's tasks, status, and phases.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @param {string} projectId
 * @returns {Promise<Array>}
 */
export async function getProjectProgressReportSchedules(supabase, organizationId, projectId) {
  return getProgressReportSchedules(supabase, organizationId, projectId);
}

/**
 * Get organization-wide progress report schedules (dashboard view).
 * These schedules are not tied to a specific project.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} organizationId
 * @returns {Promise<Array>}
 */
export async function getOrganizationProgressReportSchedules(supabase, organizationId) {
  return getProgressReportSchedules(supabase, organizationId, null);
}

/**
 * Get progress report history
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of history records
 */
export async function getProgressReportHistory(supabase, scheduleId, limit = 50) {
  const { data, error } = await supabase
    .from('progress_report_history')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * Add a recipient to a schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {Object} recipientData - Recipient data {email, contact_id?, recipient_type, notes?}
 * @returns {Promise<Object>} Created recipient
 */
export async function addRecipient(supabase, scheduleId, recipientData) {
  const { data, error } = await supabase
    .from('progress_report_recipients')
    .insert({
      schedule_id: scheduleId,
      ...recipientData
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Remove a recipient from a schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} recipientId - Recipient ID
 * @returns {Promise<void>}
 */
export async function removeRecipient(supabase, recipientId) {
  const { error } = await supabase
    .from('progress_report_recipients')
    .delete()
    .eq('id', recipientId);
  
  if (error) throw error;
}

/**
 * Update recipients for a schedule (replace all)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {Array} recipients - Array of recipient objects
 * @returns {Promise<Array>} Updated recipients
 */
export async function updateRecipients(supabase, scheduleId, recipients) {
  // NOTE: This uses delete-then-insert pattern. If insert fails after delete, data is lost.
  // TODO: Consider using a database RPC function with BEGIN/COMMIT transaction for atomicity.
  
  // Delete existing recipients
  const { error: deleteError } = await supabase
    .from('progress_report_recipients')
    .delete()
    .eq('schedule_id', scheduleId);
  if (deleteError) throw deleteError;
  
  // Insert new recipients (with duplicate prevention on client side)
  if (recipients.length > 0) {
    // Deduplicate by email/contact_id to prevent DB constraint violations
    const seen = new Set();
    const dedupedRecipients = recipients.filter((r) => {
      if (!r?.email) return false;
      const key = String(r.email || r.contact_id || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const { data, error } = await supabase
      .from('progress_report_recipients')
      .insert(
        // IMPORTANT: Only insert columns that exist in the DB table.
        // UI-only fields like `contact_type` / `name` must NOT be inserted.
        dedupedRecipients.map((r) => ({
          schedule_id: scheduleId,
          contact_id: r.contact_id ?? null,
          email: r.email,
          recipient_type: r.recipient_type || 'to',
          is_active: r.is_active !== false,
          notes: r.notes ?? null
        }))
      )
      .select();
    
    if (error) throw error;
    return data || [];
  }
  
  return [];
}

/**
 * Request approval for a schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function requestApproval(supabase, scheduleId) {
  return updateProgressReportSchedule(supabase, scheduleId, {
    approval_status: 'pending_review'
  });
}

/**
 * Approve a report schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {string} approverId - User ID of approver
 * @returns {Promise<Object>} Updated schedule
 */
export async function approveReport(supabase, scheduleId, approverId) {
  return updateProgressReportSchedule(supabase, scheduleId, {
    approval_status: 'approved',
    approved_by_user_id: approverId,
    approved_at: new Date().toISOString()
  });
}

/**
 * Reject a report schedule
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated schedule
 */
export async function rejectReport(supabase, scheduleId, reason) {
  // Fetch current schedule to preserve custom_message
  const { data: schedule } = await supabase
    .from('progress_report_schedules')
    .select('custom_message')
    .eq('id', scheduleId)
    .single();

  return updateProgressReportSchedule(supabase, scheduleId, {
    approval_status: 'rejected',
    custom_message: reason ? `${reason}\n\n${schedule?.custom_message || ''}` : schedule?.custom_message
  });
}

/**
 * Calculate next send date based on frequency.
 * frequency_value: weekly/bi-weekly = day of week 0-6 (0=Sunday); monthly = 1, 15, or -1 (last day).
 * @param {string} frequency - 'weekly' | 'bi-weekly' | 'monthly' | 'custom' | 'manual'
 * @param {number|null} frequencyValue - Day of week (0-6) or monthly day (1, 15, -1)
 * @param {Date|string|null} lastSentAt - Last sent date
 * @returns {Date|null} Next send date
 */
export function calculateNextSendDate(frequency, frequencyValue = null, lastSentAt = null) {
  const baseDate = lastSentAt ? new Date(lastSentAt) : new Date();
  const dayOfWeek = frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 0;

  switch (frequency) {
    case 'weekly': {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 7);
      while (next.getDay() !== dayOfWeek) next.setDate(next.getDate() + 1);
      return next;
    }
    case 'bi-weekly': {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 14);
      while (next.getDay() !== dayOfWeek) next.setDate(next.getDate() + 1);
      return next;
    }
    case 'monthly': {
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth();
      if (frequencyValue === -1 || frequencyValue === 31) {
        return new Date(y, m + 2, 0);
      }
      if (frequencyValue === 15) {
        return new Date(y, m + 1, 15);
      }
      return new Date(y, m + 1, 1);
    }
    case 'custom':
      if (frequencyValue && frequencyValue > 0) {
        return new Date(baseDate.getTime() + frequencyValue * 24 * 60 * 60 * 1000);
      }
      return null;
    case 'manual':
      return null;
    default:
      return null;
  }
}

/**
 * Format frequency for display (e.g. "Weekly on Mondays", "Monthly on the 1st")
 * @param {string} frequency
 * @param {number|null} frequencyValue
 * @returns {string}
 */
export function formatFrequencyLabel(frequency, frequencyValue = null) {
  if (frequency === 'manual') return 'Manual only';
  if (frequency === 'custom') return 'Custom';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (frequency === 'weekly') {
    const day = dayNames[frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 0];
    return `Weekly on ${day}s`;
  }
  if (frequency === 'bi-weekly') {
    const day = dayNames[frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 0];
    return `Bi-weekly on ${day}s`;
  }
  if (frequency === 'monthly') {
    if (frequencyValue === 15) return 'Monthly on the 15th';
    if (frequencyValue === -1 || frequencyValue === 31) return 'Monthly on the last day';
    return 'Monthly on the 1st';
  }
  return frequency;
}

/**
 * Test send a progress report (sends to creator only)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<Object>} Result from edge function
 */
export async function testSendProgressReport(supabase, scheduleId, testEmail) {
  const { data, error } = await supabase.functions.invoke('send-progress-report', {
    body: {
      schedule_id: scheduleId,
      test_email: testEmail,
      is_test: true
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * Send manual report immediately
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Object>} Result from edge function
 */
export async function sendManualReport(supabase, scheduleId) {
  const { data, error } = await supabase.functions.invoke('send-progress-report', {
    body: {
      schedule_id: scheduleId,
      is_manual: true
    }
  });
  
  if (error) throw error;
  
  // Update last_sent_at
  await updateProgressReportSchedule(supabase, scheduleId, {
    last_sent_at: new Date().toISOString()
  });
  
  return data;
}

/**
 * Export report to PDF
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<string>} PDF URL or buffer
 */
export async function exportReportToPDF(supabase, scheduleId) {
  const { data, error } = await supabase.functions.invoke('export-progress-report-pdf', {
    body: {
      schedule_id: scheduleId
    }
  });
  
  if (error) throw error;
  return data;
}
