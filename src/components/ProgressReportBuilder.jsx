import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ContactSelector from './ContactSelector';
import ProgressReportPreview from './ProgressReportPreview';
import LoadingSpinner from './LoadingSpinner';
import {
  createProgressReportSchedule,
  updateProgressReportSchedule,
  updateRecipients,
} from '@siteweave/core-logic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCY_OPTIONS = [
  { value: 'manual', label: 'Manual only' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const MONTHLY_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 15, label: '15th' },
  { value: -1, label: 'Last day of month' },
];

/** Legacy: map frequency + frequency_value to a single option value (used only for compatibility). */
function toScheduleOptionValue(frequency, frequencyValue) {
  if (frequency === 'manual') return 'manual';
  if (frequency === 'weekly' && frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6) return `weekly_${frequencyValue}`;
  if (frequency === 'bi-weekly' && frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6) return `biweekly_${frequencyValue}`;
  if (frequency === 'monthly') {
    if (frequencyValue === 15) return 'monthly_15';
    if (frequencyValue === -1 || frequencyValue === 31) return 'monthly_last';
    return 'monthly_1';
  }
  return 'manual';
}

// Parse comma/newline separated emails and return array of { email, recipient_type: 'to' }
function parseEmailsText(text) {
  const raw = text
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set();
  return raw.filter((email) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  }).map((email) => ({ email, recipient_type: 'to' }));
}

/**
 * Progress Report Builder – 2-tab form with live preview.
 * Tab 1: Settings (name, recipients, schedule). Tab 2: Content (sections, subject, message).
 */
function ProgressReportBuilder({
  scheduleId = null,
  projectId = null,
  organizationId = null,
  onSave,
  onCancel,
}) {
  const { state } = useAppContext();
  const projects = state.projects || [];
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');
  const [showAddFromContacts, setShowAddFromContacts] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    report_audience_type: 'client',
    template_type: 'client_standard',
    frequency: 'manual',
    frequency_value: null,
    custom_subject: '',
    custom_message: '',
    report_sections: {
      status_changes: true,
      task_completion: true,
      phase_changes: true,
      executive_summary: false,
    },
    requires_approval: false,
    include_branding: true,
    is_active: false,
  });

  const recipients = useMemo(() => parseEmailsText(recipientsText), [recipientsText]);
  const [contactSelectedRecipients, setContactSelectedRecipients] = useState([]);
  const allRecipients = useMemo(() => {
    const byEmail = new Map();
    recipients.forEach((r) => byEmail.set(r.email, r));
    (contactSelectedRecipients || []).forEach((r) => byEmail.set(r.email, r));
    return Array.from(byEmail.values());
  }, [recipients, contactSelectedRecipients]);

  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
    } else {
      if (projectId && projects.length > 0) {
        setFormData((prev) => ({
          ...prev,
          name: `Progress Report - ${projects.find((p) => p.id === projectId)?.name || 'Project'}`,
        }));
      }
    }
  }, [scheduleId, projectId, projects]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('progress_report_schedules')
        .select('*, progress_report_recipients(*)')
        .eq('id', scheduleId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        report_audience_type: data.report_audience_type === 'internal' ? 'client' : data.report_audience_type,
        template_type: data.template_type === 'internal_detailed' ? 'client_standard' : data.template_type,
        frequency: data.frequency || 'manual',
        frequency_value: data.frequency_value ?? null,
        custom_subject: data.custom_subject || '',
        custom_message: data.custom_message || '',
        report_sections: data.report_sections || {
          status_changes: true,
          task_completion: true,
          phase_changes: true,
          executive_summary: false,
        },
        requires_approval: false,
        include_branding: data.include_branding !== false,
        is_active: data.is_active || false,
      });

      const recs = data.progress_report_recipients || [];
      setRecipientsText(recs.map((r) => r.email).filter(Boolean).join(', '));
      setContactSelectedRecipients([]);
    } catch (error) {
      addToast('Error loading schedule: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (activate = false) => {
    if (!formData.name) {
      addToast('Please enter a report name', 'error');
      return;
    }
    if (allRecipients.length === 0) {
      addToast('Please add at least one recipient email', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const orgId = organizationId || state.currentOrganization?.id;
      if (!orgId) throw new Error('Organization ID required');

      const scheduleData = {
        ...formData,
        organization_id: orgId,
        project_id: projectId,
        is_active: activate,
        created_by_user_id: state.user.id,
        requires_approval: false,
      };

      let savedSchedule;
      if (scheduleId) {
        savedSchedule = await updateProgressReportSchedule(supabaseClient, scheduleId, scheduleData);
      } else {
        savedSchedule = await createProgressReportSchedule(supabaseClient, scheduleData);
      }

      await updateRecipients(supabaseClient, savedSchedule.id, allRecipients);

      addToast(activate ? 'Report schedule activated!' : 'Report saved', 'success');
      if (onSave) onSave(savedSchedule);
    } catch (error) {
      addToast('Error saving schedule: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading schedule..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'content'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Content
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'settings' && (
            <TabSettings
              formData={formData}
              setFormData={setFormData}
              projectId={projectId}
              recipientsText={recipientsText}
              setRecipientsText={setRecipientsText}
              showAddFromContacts={showAddFromContacts}
              setShowAddFromContacts={setShowAddFromContacts}
              contactSelectedRecipients={contactSelectedRecipients}
              setContactSelectedRecipients={setContactSelectedRecipients}
            />
          )}
          {activeTab === 'content' && (
            <TabContent formData={formData} setFormData={setFormData} />
          )}
        </div>

        <div className="flex justify-between items-center">
          <div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save & Activate'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[380px] flex-shrink-0">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sticky top-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview</h3>
          <ProgressReportPreview
            formData={formData}
            recipients={allRecipients}
            scheduleId={scheduleId}
          />
        </div>
      </div>
    </div>
  );
}

function TabSettings({
  formData,
  setFormData,
  projectId,
  recipientsText,
  setRecipientsText,
  showAddFromContacts,
  setShowAddFromContacts,
  contactSelectedRecipients,
  setContactSelectedRecipients,
}) {
  const frequency = formData.frequency || 'manual';
  const frequencyValue = formData.frequency_value;
  const needsDayOfWeek = frequency === 'weekly' || frequency === 'bi-weekly';
  const needsMonthlyDay = frequency === 'monthly';
  const dayValue = frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 1;
  const monthlyValue = frequency === 'monthly' ? (frequencyValue === 15 ? 15 : frequencyValue === -1 || frequencyValue === 31 ? -1 : 1) : 1;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Report name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Weekly Client Update"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (emails)</label>
        <textarea
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="owner@example.com, investor@example.com"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter one or more email addresses, separated by commas or new lines. Ideal for owners and investors who aren’t in the app.
        </p>
        <button
          type="button"
          onClick={() => setShowAddFromContacts((v) => !v)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          {showAddFromContacts ? 'Hide contacts' : 'Add from contacts'}
        </button>
        {showAddFromContacts && (
          <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            <ContactSelector
              selectedRecipients={contactSelectedRecipients}
              onChange={setContactSelectedRecipients}
              projectId={projectId}
              showRecipientType={false}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Schedule</label>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[140px]">
            <select
              value={frequency}
              onChange={(e) => {
                const f = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  frequency: f,
                  frequency_value: f === 'weekly' || f === 'bi-weekly' ? prev.frequency_value != null && prev.frequency_value <= 6 ? prev.frequency_value : 1 : f === 'monthly' ? (prev.frequency_value === 15 ? 15 : prev.frequency_value === -1 || prev.frequency_value === 31 ? -1 : 1) : null,
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {needsDayOfWeek && (
            <div className="min-w-[140px]">
              <select
                value={dayValue}
                onChange={(e) => setFormData({ ...formData, frequency_value: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAY_NAMES.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
          )}
          {needsMonthlyDay && (
            <div className="min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Date each month</label>
              <select
                value={monthlyValue}
                onChange={(e) => setFormData({ ...formData, frequency_value: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHLY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {projectId && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">This report is scoped to the current project.</p>
        </div>
      )}
    </div>
  );
}

function TabContent({ formData, setFormData }) {
  const sectionLabels = {
    status_changes: 'Status changes',
    task_completion: 'Tasks',
    phase_changes: 'Phase progress',
    executive_summary: 'Executive summary',
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Content</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject line</label>
        <input
          type="text"
          value={formData.custom_subject}
          onChange={(e) => setFormData({ ...formData, custom_subject: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Leave empty for default"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Personal message</label>
        <textarea
          value={formData.custom_message}
          onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional note for recipients..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Include in report</label>
        <div className="space-y-2">
          {Object.entries(formData.report_sections).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    report_sections: { ...formData.report_sections, [key]: e.target.checked },
                  })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">{sectionLabels[key] || key}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgressReportBuilder;
