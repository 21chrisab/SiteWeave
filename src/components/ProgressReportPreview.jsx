import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { testSendProgressReport } from '@siteweave/core-logic';
import LoadingSpinner from './LoadingSpinner';

/**
 * Progress Report Preview Component
 * Shows live preview of email with actual data
 */
function ProgressReportPreview({ formData, recipients, scheduleId }) {
  const { i18n } = useTranslation();
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewMode, setPreviewMode] = useState(() => {
    const t = formData?.report_audience_type || 'client';
    return t === 'internal' ? 'client' : t;
  });

  const projects = state.projects || [];
  const tasks = state.tasks || [];
  const contacts = state.contacts || [];

  const reportSections = formData?.report_sections || {};
  const selectedProject = formData?.project_id
    ? projects.find((p) => String(p.id) === String(formData.project_id))
    : null;

  const handleSendTest = async () => {
    if (!scheduleId) {
      addToast('Please save the schedule first before sending a test', 'error');
      return;
    }

    if (!state.user?.email) {
      addToast('User email not found', 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      await testSendProgressReport(supabaseClient, scheduleId, state.user.email);
      addToast('Test email sent! Check your inbox.', 'success');
    } catch (error) {
      addToast('Error sending test email: ' + error.message, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const translateToClientFriendly = (status) => {
    const translations = {
      'In Progress': 'Active',
      'On Hold': 'Paused',
      'Completed': 'Finished'
    };
    return translations[status] || status;
  };

  const getTaskAssigneeName = (task) => {
    const assigneeId = task?.assignee_id;
    if (!assigneeId) return null;
    return contacts.find((c) => String(c.id) === String(assigneeId))?.name || null;
  };

  const now = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const organizationName = state.currentOrganization?.name || 'Organization';
  const projectName = selectedProject?.name || null;

  const scopedTasks = selectedProject
    ? tasks.filter((t) => String(t.project_id) === String(selectedProject.id))
    : tasks;

  const completedTasks = scopedTasks
    .filter((t) => t?.completed)
    .slice(0, 6)
    .map((t) => ({
      text: t.text,
      completed_at: t.completed_at || t.updated_at || t.created_at || null,
      assignee: getTaskAssigneeName(t)
    }));

  const totalTaskCount = scopedTasks.length;
  const completedTaskCount = scopedTasks.filter((t) => t?.completed).length;
  const overallProgress = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;

  // Build a personalized "sample" dataset from real org/project context where possible.
  const baseData = {
    organization_name: organizationName,
    project_name: projectName,
    start_date: periodStart.toISOString(),
    end_date: now.toISOString(),
    status_changes: selectedProject
      ? [
          {
            project_name: projectName,
            old_status: 'Planning',
            new_status: selectedProject.status || 'In Progress',
            changed_by: state.user?.email?.split('@')?.[0] || 'System',
            changed_at: now.toISOString()
          }
        ]
      : [],
    completed_tasks:
      completedTasks.length > 0
        ? completedTasks
        : [
            { text: 'Completed work item', completed_at: now.toISOString(), assignee: null },
            { text: 'Another completed work item', completed_at: now.toISOString(), assignee: null }
          ],
    phase_progress: [
      {
        name: selectedProject ? 'Overall Progress' : 'Overall',
        progress: overallProgress,
        old_progress: Math.max(0, overallProgress - 10),
        is_client_visible: true
      }
    ]
  };

  const getFilteredDataForAudience = (data, audienceType) => {
    if (audienceType === 'client') {
      return {
        ...data,
        completed_tasks: (data.completed_tasks || []).map((t) => ({
          text: t.text,
          completed_at: t.completed_at
        })),
        status_changes: (data.status_changes || []).map((s) => ({
          ...s,
          new_status: translateToClientFriendly(s.new_status)
        })),
        phase_progress: (data.phase_progress || []).filter((p) => p.is_client_visible !== false)
      };
    }

    if (audienceType === 'executive') {
      const totalProjects = selectedProject ? 1 : projects.length;
      const statusChanges = (data.status_changes || []).length;
      const completedTasks = (data.completed_tasks || []).length;
      const executiveSummary = `This period saw ${completedTasks} task(s) completed across ${totalProjects} project(s), with ${statusChanges} status update(s). Overall progress remains on track.`;

      return {
        organization_name: data.organization_name,
        project_name: data.project_name,
        start_date: data.start_date,
        end_date: data.end_date,
        executive_summary: executiveSummary,
        at_a_glance: {
          on_track: totalProjects,
          at_risk: 0,
          behind: 0
        },
        key_highlights: [
          completedTasks > 0 ? `${completedTasks} task(s) completed this period` : null,
          statusChanges > 0 ? `${statusChanges} project status update(s)` : null
        ].filter(Boolean)
      };
    }

    return data;
  };

  const effectiveAudience = previewMode === 'internal' ? 'client' : previewMode;
  const previewData = getFilteredDataForAudience(baseData, effectiveAudience);

  const defaultSubject = (() => {
    const subjectTarget = previewData.project_name || previewData.organization_name || 'Progress Report';
    if (effectiveAudience === 'client') return `Progress Update: ${subjectTarget}`;
    return `Executive Brief: ${previewData.organization_name || 'Organization'} Status`;
  })();

  const toDisplay = recipients.length > 0
    ? recipients.slice(0, 3).map((r) => r.email).join(', ')
    + (recipients.length > 3 ? ` +${recipients.length - 3} more` : '')
    : 'recipients@example.com';
  const fromDisplay = state.currentOrganization?.name
    ? `${state.currentOrganization.name} <notifications@siteweave.org>`
    : 'SiteWeave Notifications <notifications@siteweave.org>';
  const dateDisplay = now.toLocaleString(i18n.language, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode('client')}
            className={`px-3 py-1 text-sm rounded ${
              previewMode === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Client
          </button>
          <button
            onClick={() => setPreviewMode('executive')}
            className={`px-3 py-1 text-sm rounded ${
              previewMode === 'executive' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Executive
          </button>
        </div>

        {scheduleId && (
          <button
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSendingTest ? (
              <>
                <LoadingSpinner size="sm" text="" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Test Email
              </>
            )}
          </button>
        )}
      </div>

      {/* Outlook-style email frame */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-[#f3f3f3] shadow-inner">
        {/* Email header (Outlook reading-pane style) */}
        <div className="bg-white border-b border-gray-200 px-3 py-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            <span className="shrink-0 font-medium text-gray-500 w-10">From:</span>
            <span className="min-w-0 break-all">{fromDisplay}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1">
            <span className="shrink-0 font-medium text-gray-500 w-10">To:</span>
            <span className="min-w-0 break-all">{toDisplay}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1">
            <span className="shrink-0 font-medium text-gray-500 w-10">Date:</span>
            <span>{dateDisplay}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1">
            <span className="shrink-0 font-medium text-gray-500 w-10">Subject:</span>
            <span className="font-semibold text-gray-900">{formData.custom_subject || defaultSubject}</span>
          </div>
        </div>
        {/* Message body */}
        <div className="bg-white p-4 min-h-[200px]">
          <div className="max-w-[600px] mx-auto font-sans text-[15px] text-gray-800 leading-relaxed">
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Calibri, Segoe UI, sans-serif' }}>
                  {effectiveAudience === 'client' ? 'Progress Update' : 'Executive Brief'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(previewData.start_date).toLocaleDateString(i18n.language)} – {new Date(previewData.end_date).toLocaleDateString(i18n.language)}
                </p>
              </div>

              {formData.custom_message && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-gray-700">{formData.custom_message}</p>
                </div>
              )}

              {effectiveAudience === 'executive' && (
                <>
                  {previewData.executive_summary && (
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/90 p-4">
                      <h2 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                        Executive summary
                      </h2>
                      <p className="text-sm text-blue-900">{previewData.executive_summary}</p>
                    </div>
                  )}

                  {previewData.at_a_glance && (
                    <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">At a glance</h2>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded">
                          <p className="text-xs text-green-700 font-medium">On track</p>
                          <p className="text-2xl font-bold text-green-900">{previewData.at_a_glance.on_track || 0}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded">
                          <p className="text-xs text-yellow-700 font-medium">At risk</p>
                          <p className="text-2xl font-bold text-yellow-900">{previewData.at_a_glance.at_risk || 0}</p>
                        </div>
                        <div className="p-3 bg-red-50 border-2 border-red-200 rounded">
                          <p className="text-xs text-red-700 font-medium">Behind</p>
                          <p className="text-2xl font-bold text-red-900">{previewData.at_a_glance.behind || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {Array.isArray(previewData.key_highlights) && previewData.key_highlights.length > 0 && (
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50/80 p-3">
                      <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" aria-hidden />
                        Key changes
                      </h2>
                      <ul className="list-none space-y-2">
                        {previewData.key_highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-amber-900">
                            <span className="text-amber-600 font-bold shrink-0" aria-hidden>•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {effectiveAudience !== 'executive' && reportSections.status_changes && (previewData.status_changes || []).length > 0 && (
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/80 p-3">
                  <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" aria-hidden />
                    Status changes
                  </h2>
                  {(previewData.status_changes || []).map((change, i) => (
                    <div key={i} className="p-3 bg-white border border-amber-200 rounded mb-2 shadow-sm">
                      <p className="font-medium text-gray-900">{change.project_name}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="line-through text-gray-500">{change.old_status}</span>
                        <span className="mx-2 text-amber-600">→</span>
                        <strong className="text-amber-800">{change.new_status}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {effectiveAudience !== 'executive' && reportSections.task_completion && (previewData.completed_tasks || []).length > 0 && (
                <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/80 p-3">
                  <h2 className="text-lg font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                    Completed tasks
                  </h2>
                  <ul className="list-none space-y-2">
                    {(previewData.completed_tasks || []).map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-800">
                        <span className="text-emerald-600 font-bold shrink-0" aria-hidden>✓</span>
                        <span>{task.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {effectiveAudience !== 'executive' && reportSections.phase_changes && (previewData.phase_progress || []).length > 0 && (
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50/80 p-3">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                    Phase progress
                  </h2>
                  {(previewData.phase_progress || []).map((phase, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{phase.name}</span>
                        <span className="text-sm font-semibold text-blue-700">{phase.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${phase.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        This is a preview. Actual emails will use your organization branding.
      </p>
    </div>
  );
}

export default ProgressReportPreview;
