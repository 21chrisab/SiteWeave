import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ContactSelector from './ContactSelector';
import ProgressReportPreview from './ProgressReportPreview';
import BrandingSettings from './BrandingSettings';
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

const REPORT_TYPES = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Task lists, status updates, and phase progress. Customise which details are shown.',
  },
  {
    value: 'executive',
    label: 'Executive Brief',
    description: 'Health metrics and headlines only. No task-level detail.',
  },
];

const SECTION_OPTIONS = [
  { key: 'status_changes',  label: 'Status updates' },
  { key: 'task_completion', label: 'Completed tasks' },
  { key: 'phase_changes',   label: 'Phase progress' },
  { key: 'vitals',          label: 'Summary numbers (total completed, open tasks)' },
  { key: 'weekly_plan',     label: 'Last week / This week / Next week' },
];

const DETAIL_TOGGLES = [
  { key: 'show_assignees',         label: 'Show who is assigned to each task',                   default: false },
  { key: 'show_dates',             label: 'Show task completion dates',                           default: false },
  { key: 'show_who_changed',       label: 'Show who changed a status and when',                   default: false },
  { key: 'show_phase_delta',       label: 'Show previous progress on phases (e.g. 41% → 51%)',   default: false },
  { key: 'show_blockers',          label: 'Include blockers & issues section',                    default: false },
  { key: 'show_weather_impacts',   label: 'Include weather / schedule impacts (logged this period)', default: false },
  { key: 'include_task_photos',    label: 'Include task photos on completed work (uses signed image links)', default: false },
  { key: 'client_friendly_labels', label: 'Use friendly status labels (e.g. "Active" not "In Progress")', default: true },
];

const DEFAULT_SECTIONS = {
  status_changes: true,
  task_completion: true,
  phase_changes: true,
  vitals: true,
  weekly_plan: true,
  show_assignees: false,
  show_dates: false,
  show_who_changed: false,
  show_phase_delta: false,
  show_blockers: false,
  show_weather_impacts: false,
  include_task_photos: false,
  client_friendly_labels: true,
};

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
 * Progress Report Builder — single-page form with live preview.
 * Two report types: Standard (customisable detail level) and Executive Brief.
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
  const [showBranding, setShowBranding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');
  const [showAddFromContacts, setShowAddFromContacts] = useState(false);
  const [orgReportHour, setOrgReportHour] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    report_audience_type: 'standard',
    template_type: 'client_standard',
    frequency: 'manual',
    frequency_value: null,
    custom_subject: '',
    custom_message: '',
    report_sections: { ...DEFAULT_SECTIONS },
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

  const defaultReportNameSuffix = useMemo(() => {
    if (!projectId || !projects.length) return null;
    return projects.find((p) => p.id === projectId)?.name || 'Project';
  }, [projectId, projects]);

  useEffect(() => {
    if (!scheduleId) return;
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  useEffect(() => {
    if (scheduleId) return;
    if (projectId && defaultReportNameSuffix) {
      setFormData((prev) => ({
        ...prev,
        name: `Progress Report - ${defaultReportNameSuffix}`,
      }));
    }
  }, [scheduleId, projectId, defaultReportNameSuffix]);

  useEffect(() => {
    const loadOrgReportHour = async () => {
      const orgId = organizationId || state.currentOrganization?.id;
      if (!orgId) return;
      const { data } = await supabaseClient
        .from('organizations')
        .select('progress_report_send_hour')
        .eq('id', orgId)
        .maybeSingle();
      setOrgReportHour(
        Number.isFinite(Number(data?.progress_report_send_hour))
          ? Number(data.progress_report_send_hour)
          : null
      );
    };
    loadOrgReportHour();
  }, [organizationId, state.currentOrganization?.id]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('progress_report_schedules')
        .select('*, progress_report_recipients(*)')
        .eq('id', scheduleId)
        .single();

      if (error) throw error;

      // Map legacy audience values to the new two-option model.
      // 'internal' schedules get all detail toggles turned on so they look the same.
      const isLegacyInternal = data.report_audience_type === 'internal';
      const mappedAudience = data.report_audience_type === 'executive' ? 'executive' : 'standard';
      const base = data.report_sections || {};
      const legacyWeeklyPlanValue = base.weekly_plan ?? base.lookahead;
      const sections = isLegacyInternal
        ? {
            ...DEFAULT_SECTIONS,
            ...base,
            weekly_plan: legacyWeeklyPlanValue !== false,
            show_assignees:         base.show_assignees         ?? true,
            show_dates:             base.show_dates             ?? true,
            show_who_changed:       base.show_who_changed       ?? true,
            show_phase_delta:       base.show_phase_delta       ?? true,
            show_blockers:          base.show_blockers          ?? true,
            show_weather_impacts:   base.show_weather_impacts   ?? true,
            include_task_photos:    base.include_task_photos    ?? true,
            client_friendly_labels: base.client_friendly_labels ?? false,
          }
        : {
            ...DEFAULT_SECTIONS,
            ...base,
            weekly_plan: legacyWeeklyPlanValue !== false,
          };

      setFormData({
        name: data.name,
        report_audience_type: mappedAudience,
        template_type: data.template_type || 'client_standard',
        frequency: data.frequency || 'manual',
        frequency_value: data.frequency_value ?? null,
        custom_subject: data.custom_subject || '',
        custom_message: data.custom_message || '',
        report_sections: sections,
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
    if (formData.frequency !== 'manual' && !Number.isFinite(Number(orgReportHour))) {
      addToast('Set your organization report hour in Organization Settings before activating automated reports.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const orgId = organizationId || state.currentOrganization?.id;
      if (!orgId) throw new Error('Organization ID required');

      // Save standard audience as 'client' for edge-function backward compat
      const dbAudience = formData.report_audience_type === 'executive' ? 'executive' : 'client';
      const templateType = formData.report_audience_type === 'executive' ? 'executive_summary' : 'client_standard';

      const scheduleData = {
        ...formData,
        report_audience_type: dbAudience,
        template_type: templateType,
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

  const updateSection = (key, value) =>
    setFormData((prev) => ({
      ...prev,
      report_sections: { ...prev.report_sections, [key]: value },
    }));

  const isStandard = formData.report_audience_type === 'standard';
  const frequency = formData.frequency || 'manual';
  const frequencyValue = formData.frequency_value;
  const needsDayOfWeek = frequency === 'weekly' || frequency === 'bi-weekly';
  const needsMonthlyDay = frequency === 'monthly';
  const dayValue = frequencyValue != null && frequencyValue >= 0 && frequencyValue <= 6 ? frequencyValue : 1;
  const monthlyValue = frequency === 'monthly' ? (frequencyValue === 15 ? 15 : frequencyValue === -1 || frequencyValue === 31 ? -1 : 1) : 1;

  if (isLoading) {
    return <LoadingSpinner text="Loading schedule..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left column: form ── */}
      <div className="flex-1 space-y-4">

        {/* Card 1: Report setup */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Report setup</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Weekly Client Update"
            />
          </div>

          {/* Report type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_TYPES.map((opt) => {
                const selected = formData.report_audience_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, report_audience_type: opt.value })}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${selected ? 'text-blue-800' : 'text-gray-800'}`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-0.5 leading-snug ${selected ? 'text-blue-600' : 'text-gray-500'}`}>
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (emails)</label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="owner@example.com, investor@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple addresses with commas or new lines.
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

          {/* Schedule */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Schedule</label>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              Automated report send hour is managed in Organization Settings.
              {Number.isFinite(Number(orgReportHour)) ? ` Current org hour: ${orgReportHour}:00 ET.` : ' Set it there to activate automated sends.'}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[140px]">
                <select
                  value={frequency}
                  onChange={(e) => {
                    const f = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      frequency: f,
                      frequency_value:
                        f === 'weekly' || f === 'bi-weekly'
                          ? prev.frequency_value != null && prev.frequency_value <= 6 ? prev.frequency_value : 1
                          : f === 'monthly'
                          ? (prev.frequency_value === 15 ? 15 : prev.frequency_value === -1 || prev.frequency_value === 31 ? -1 : 1)
                          : null,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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

        {/* Card 2: Email content */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Email content</h2>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject line</label>
            <input
              type="text"
              value={formData.custom_subject}
              onChange={(e) => setFormData({ ...formData, custom_subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty for default"
            />
          </div>

          {/* Personal message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal message</label>
            <textarea
              value={formData.custom_message}
              onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="Optional note shown at the top of the email…"
            />
          </div>

          {/* Sections & detail level — standard only */}
          {isStandard && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sections to include</label>
                <div className="space-y-2">
                  {SECTION_OPTIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.report_sections[key] !== false}
                        onChange={(e) => updateSection(key, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Detail level</p>
                <p className="text-xs text-gray-400 mb-3">
                  Turn these on for internal team reports; leave them off for clean client-facing emails.
                </p>
                <div className="space-y-2">
                  {DETAIL_TOGGLES.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.report_sections[key]}
                        onChange={(e) => updateSection(key, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Email appearance accordion */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBranding((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <span>Email appearance</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showBranding ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showBranding && (
            <div className="border-t border-gray-200 bg-white px-4 py-4">
              <p className="text-xs text-gray-500 mb-4">
                Logo, colors, footer, and signature apply to <strong>all</strong> reports for this organization.
              </p>
              <BrandingSettings compact />
            </div>
          )}
        </div>

        {/* Action buttons */}
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
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save & Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right column: preview ── */}
      <div className="w-full lg:w-[min(480px,40vw)] flex-shrink-0">
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

export default ProgressReportBuilder;
