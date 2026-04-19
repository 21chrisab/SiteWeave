import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { testSendProgressReport } from '@siteweave/core-logic';
import LoadingSpinner from './LoadingSpinner';

const SAMPLE_TASK_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
      <rect width="240" height="180" fill="#dbeafe" />
      <rect x="20" y="20" width="200" height="140" rx="10" fill="#bfdbfe" />
      <path d="M40 130l42-42 24 24 40-52 54 70" fill="none" stroke="#2563eb" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="88" cy="62" r="14" fill="#60a5fa" />
    </svg>
  `);

/**
 * Progress Report Preview Component
 * Shows a live preview of the email using real org/project data where available.
 * Two preview modes: standard and executive.
 */
function ProgressReportPreview({ formData, recipients, scheduleId }) {
  const { i18n } = useTranslation();
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewMode, setPreviewMode] = useState(
    () => (formData?.report_audience_type === 'executive' ? 'executive' : 'standard')
  );

  // Keep previewMode in sync when the parent changes the audience selector
  const prevAudienceRef = React.useRef(formData?.report_audience_type);
  React.useEffect(() => {
    const next = formData?.report_audience_type === 'executive' ? 'executive' : 'standard';
    if (next !== prevAudienceRef.current) {
      prevAudienceRef.current = next;
      setPreviewMode(next);
    }
  }, [formData?.report_audience_type]);

  const projects = state.projects || [];
  const tasks = state.tasks || [];
  const contacts = state.contacts || [];

  const reportSections = formData?.report_sections || {};
  const includeTaskPhotosInReport =
    formData?.report_audience_type === 'internal' || reportSections.include_task_photos === true;
  // Preview should always surface available task photos so users can verify visuals.
  const showTaskPhotos = true;
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
      assignee: getTaskAssigneeName(t),
      photos: showTaskPhotos
        ? (t.task_photos || t.photos || []).slice(0, 2).map((photo) => ({
            thumbnail_url: photo.thumbnail_url || photo.preview_url || SAMPLE_TASK_PHOTO,
            full_url: photo.full_url || photo.thumbnail_url || photo.preview_url || SAMPLE_TASK_PHOTO,
            caption: photo.caption,
            is_completion_photo: photo.is_completion_photo,
          }))
        : [],
    }));

  const parseDay = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const todayDay = new Date();
  todayDay.setHours(0, 0, 0, 0);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = new Date(todayDay.getTime() - oneWeekMs);
  const thisWeekEnd = new Date(todayDay.getTime() + oneWeekMs);
  const nextWeekEnd = new Date(todayDay.getTime() + (2 * oneWeekMs));

  const lastWeekDone = scopedTasks
    .filter((t) => t?.completed)
    .filter((t) => {
      const completedAt = t.completed_at ? new Date(t.completed_at) : null;
      return completedAt && completedAt >= oneWeekAgo && completedAt < todayDay;
    })
    .slice(0, 6)
    .map((t) => ({
      text: t.text,
      completed_at: t.completed_at || t.updated_at || t.created_at || null,
      assignee: getTaskAssigneeName(t),
    }));

  const thisWeekPlan = scopedTasks
    .filter((t) => !t?.completed)
    .filter((t) => {
      const d = parseDay(t.start_date);
      return d && d >= todayDay && d < thisWeekEnd;
    })
    .slice(0, 6)
    .map((t) => ({
      text: t.text,
      start_date: t.start_date || null,
      assignee: getTaskAssigneeName(t),
    }));

  const nextWeekPlan = scopedTasks
    .filter((t) => !t?.completed)
    .filter((t) => {
      const d = parseDay(t.start_date);
      return d && d >= thisWeekEnd && d < nextWeekEnd;
    })
    .slice(0, 6)
    .map((t) => ({
      text: t.text,
      start_date: t.start_date || null,
      assignee: getTaskAssigneeName(t),
    }));

  const totalTaskCount = scopedTasks.length;
  const completedTaskCount = scopedTasks.filter((t) => t?.completed).length;
  const overallProgress = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;

  const baseData = {
    organization_name: organizationName,
    project_name: projectName,
    start_date: periodStart.toISOString(),
    end_date: now.toISOString(),
    weather_impacts: reportSections.show_weather_impacts
      ? [
          {
            title: 'Heavy rain delay',
            days_lost: 2,
            project_name: projectName || 'Project',
            schedule_shift_applied: true,
            description: 'Excavation paused for site safety.',
          },
        ]
      : [],
    vitals: {
      tasks_completed_count: completedTaskCount || 2,
      open_tasks_count: totalTaskCount - completedTaskCount || 8,
      current_phase: selectedProject ? 'Active Phase' : null,
      phase_progress_pct: overallProgress || 60,
    },
    last_week_done: lastWeekDone,
    this_week_plan: thisWeekPlan,
    next_week_plan: nextWeekPlan,
    status_changes: selectedProject
      ? [
          {
            project_name: projectName,
            old_status: 'Planning',
            new_status: selectedProject.status || 'In Progress',
            changed_by: state.user?.email?.split('@')?.[0] || 'System',
            changed_at: now.toISOString(),
          },
        ]
      : [],
    completed_tasks:
      completedTasks.length > 0
        ? completedTasks
        : [
            {
              text: 'Review drawings',
              completed_at: now.toISOString(),
              assignee: 'A. Smith',
              photos: showTaskPhotos
                ? [{ thumbnail_url: SAMPLE_TASK_PHOTO, full_url: SAMPLE_TASK_PHOTO, caption: 'Before install', is_completion_photo: false }]
                : [],
            },
            {
              text: 'Order materials',
              completed_at: now.toISOString(),
              assignee: null,
              photos: showTaskPhotos
                ? [{ thumbnail_url: SAMPLE_TASK_PHOTO, full_url: SAMPLE_TASK_PHOTO, caption: 'Delivery confirmation', is_completion_photo: true }]
                : [],
            },
            {
              text: 'Update timeline',
              completed_at: now.toISOString(),
              assignee: 'B. Jones',
              photos: [],
            },
          ],
    phase_progress: [
      {
        name: selectedProject ? 'Overall Progress' : 'Overall',
        progress: overallProgress || 51,
        old_progress: Math.max(0, (overallProgress || 51) - 10),
        is_client_visible: true,
      },
    ],
  };

  const getPreviewData = (data, mode) => {
    if (mode === 'executive') {
      const totalProjects = selectedProject ? 1 : projects.length;
      const cCount = (data.completed_tasks || []).length;
      const sCount = (data.status_changes || []).length;
      return {
        organization_name: data.organization_name,
        project_name: data.project_name,
        start_date: data.start_date,
        end_date: data.end_date,
        executive_summary: `This period saw ${cCount} task(s) completed across ${totalProjects} project(s), with ${sCount} status update(s). Overall progress remains on track.`,
        at_a_glance: { on_track: totalProjects, at_risk: 0, behind: 0 },
        key_highlights: [
          cCount > 0 ? `${cCount} task(s) completed this period` : null,
          sCount > 0 ? `${sCount} project status update(s)` : null,
        ].filter(Boolean),
      };
    }
    // standard — return all data; template flags control what to render
    return data;
  };

  const previewData = getPreviewData(baseData, previewMode);

  const clientFriendly = reportSections.client_friendly_labels !== false;
  const translateStatus = (s) => {
    if (!clientFriendly) return s;
    const m = { 'In Progress': 'Active', 'On Hold': 'Paused', 'Completed': 'Finished' };
    return m[s] || s;
  };

  const defaultSubject = previewMode === 'executive'
    ? `Executive Brief: ${previewData.organization_name || 'Organization'} Status`
    : `Progress Update: ${previewData.project_name || previewData.organization_name || 'Your Project'}`;

  const toDisplay = recipients.length > 0
    ? recipients.slice(0, 3).map((r) => r.email).join(', ')
    + (recipients.length > 3 ? ` +${recipients.length - 3} more` : '')
    : 'recipients@example.com';
  const fromDisplay = state.currentOrganization?.name
    ? `${state.currentOrganization.name} <notifications@siteweave.org>`
    : 'SiteWeave Notifications <notifications@siteweave.org>';
  const dateDisplay = now.toLocaleString(i18n.language, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {['standard', 'executive'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded capitalize ${
                previewMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode === 'standard' ? 'Standard' : 'Executive'}
            </button>
          ))}
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
        {/* Email header */}
        <div className="bg-white border-b border-gray-200 px-3 py-2.5">
          {[
            { label: 'From:', value: fromDisplay },
            { label: 'To:', value: toDisplay },
            { label: 'Date:', value: dateDisplay },
            { label: 'Subject:', value: formData.custom_subject || defaultSubject, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1 first:mt-0">
              <span className="shrink-0 font-medium text-gray-500 w-14">{label}</span>
              <span className={`min-w-0 break-all ${bold ? 'font-semibold text-gray-900' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Message body */}
        <div className="bg-white p-4 min-h-[200px]">
          <div className="max-w-[600px] mx-auto font-sans text-[15px] text-gray-800 leading-relaxed">
            <div className="space-y-4">
              {/* Title + period */}
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Calibri, Segoe UI, sans-serif' }}>
                  {previewMode === 'executive' ? 'Executive Brief' : 'Progress Update'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(previewData.start_date).toLocaleDateString(i18n.language)} – {new Date(previewData.end_date).toLocaleDateString(i18n.language)}
                </p>
              </div>

              {/* Personal message */}
              {formData.custom_message && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-gray-700">{formData.custom_message}</p>
                </div>
              )}

              {/* ── EXECUTIVE ── */}
              {previewMode === 'executive' && (
                <>
                  {previewData.executive_summary && (
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/90 p-4">
                      <h2 className="text-base font-semibold text-blue-900 mb-2">Executive summary</h2>
                      <p className="text-sm text-blue-900">{previewData.executive_summary}</p>
                    </div>
                  )}
                  {previewData.at_a_glance && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">At a glance</h2>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'On track', val: previewData.at_a_glance.on_track || 0, cls: 'bg-green-50 border-green-200', textCls: 'text-green-800', subCls: 'text-green-700' },
                          { label: 'At risk',  val: previewData.at_a_glance.at_risk  || 0, cls: 'bg-amber-50 border-amber-200', textCls: 'text-amber-800', subCls: 'text-amber-700' },
                          { label: 'Behind',   val: previewData.at_a_glance.behind   || 0, cls: 'bg-red-50 border-red-200',   textCls: 'text-red-800',   subCls: 'text-red-700'   },
                        ].map(({ label, val, cls, textCls, subCls }) => (
                          <div key={label} className={`p-3 border rounded text-center ${cls}`}>
                            <p className={`text-2xl font-bold ${textCls}`}>{val}</p>
                            <p className={`text-xs mt-0.5 font-medium ${subCls}`}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(previewData.key_highlights) && previewData.key_highlights.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <h2 className="text-sm font-semibold text-amber-900 mb-2 uppercase tracking-wide">Key highlights</h2>
                      <ul className="space-y-1.5">
                        {previewData.key_highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* ── STANDARD ── */}
              {previewMode === 'standard' && (
                <>
                  {/* Vitals row */}
                  {reportSections.vitals !== false && previewData.vitals && (
                    <div className="grid grid-cols-2 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-center">
                      {[
                        { val: previewData.vitals.tasks_completed_count ?? 0, label: 'Total completed', color: 'text-emerald-700' },
                        { val: previewData.vitals.open_tasks_count ?? 0,      label: 'Open Tasks',      color: 'text-blue-700' },
                      ].map((cell, i) => (
                        <div key={i} className={`p-3 ${i > 0 ? 'border-l border-gray-200' : ''}`}>
                          <p className={`text-2xl font-bold ${cell.color}`}>{cell.val}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mt-1 font-medium">{cell.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status changes */}
                  {reportSections.status_changes !== false && (previewData.status_changes || []).length > 0 && (
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/80 p-3">
                      <h2 className="text-sm font-semibold text-emerald-900 mb-2 uppercase tracking-wide">Status update</h2>
                      {(previewData.status_changes || []).map((change, i) => (
                        <div key={i} className="p-2.5 bg-white border border-emerald-200 rounded mb-2 last:mb-0">
                          <p className="font-medium text-gray-900 text-sm">{change.project_name}</p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            <span className="line-through text-gray-400">{change.old_status}</span>
                            <span className="mx-1.5 text-emerald-600">→</span>
                            <strong className="text-emerald-800">{translateStatus(change.new_status)}</strong>
                            {reportSections.show_who_changed && change.changed_by && (
                              <span className="ml-1.5 text-gray-400">· {change.changed_by}</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed tasks */}
                  {reportSections.task_completion !== false && (previewData.completed_tasks || []).length > 0 && (
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/80 p-3">
                      <h2 className="text-sm font-semibold text-emerald-900 mb-2 uppercase tracking-wide">Completed work</h2>
                      {(reportSections.show_assignees || reportSections.show_dates) && !showTaskPhotos
                        ? (
                          <table className="w-full text-sm">
                            <tbody>
                              {(previewData.completed_tasks || []).map((task, i) => (
                                <tr key={i} className="border-b border-emerald-100 last:border-0">
                                  <td className="py-1.5 pr-2 text-emerald-600 font-bold w-4">✓</td>
                                  <td className="py-1.5 text-gray-800">{task.text}</td>
                                  {reportSections.show_assignees && task.assignee && (
                                    <td className="py-1.5 pl-2 text-gray-400 text-xs text-right whitespace-nowrap">@{task.assignee}</td>
                                  )}
                                  {reportSections.show_dates && task.completed_at && (
                                    <td className="py-1.5 pl-2 text-gray-400 text-xs text-right whitespace-nowrap">
                                      {new Date(task.completed_at).toLocaleDateString(i18n.language)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                        : (
                          <ul className="space-y-3">
                            {(previewData.completed_tasks || []).map((task, i) => (
                              <li key={i} className="rounded-md border border-emerald-100 bg-white p-2.5 text-sm text-gray-800">
                                <div className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                                  <div className="flex-1">
                                    <p>{task.text}</p>
                                    {(task.assignee || task.completed_at) && (
                                      <p className="mt-1 text-xs text-gray-400">
                                        {task.assignee ? `@${task.assignee}` : ''}
                                        {task.assignee && task.completed_at ? ' · ' : ''}
                                        {task.completed_at ? new Date(task.completed_at).toLocaleDateString(i18n.language) : ''}
                                      </p>
                                    )}
                                    {showTaskPhotos && Array.isArray(task.photos) && task.photos.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {task.photos.map((photo, photoIndex) => (
                                          <a
                                            key={photoIndex}
                                            href={photo.full_url || photo.thumbnail_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block"
                                          >
                                            <img
                                              src={photo.thumbnail_url || photo.full_url}
                                              alt={photo.caption || task.text}
                                              className="h-20 w-24 rounded border border-gray-200 object-cover"
                                            />
                                            {photo.caption && (
                                              <p className="mt-1 max-w-24 text-[11px] text-gray-500">{photo.caption}</p>
                                            )}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  )}

                  {/* Phase progress */}
                  {reportSections.phase_changes !== false && (previewData.phase_progress || []).length > 0 && (
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/80 p-3">
                      <h2 className="text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wide">Phase progress</h2>
                      {(previewData.phase_progress || []).map((phase, i) => (
                        <div key={i} className="mb-2.5 last:mb-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{phase.name}</span>
                            <span className="text-blue-600 font-semibold">
                              {reportSections.show_phase_delta && phase.old_progress != null
                                ? `${phase.old_progress}% → ${phase.progress}%`
                                : `${phase.progress}%`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${phase.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reportSections.show_weather_impacts && (previewData.weather_impacts || []).length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <h2 className="text-sm font-semibold text-amber-900 mb-2 uppercase tracking-wide">Weather / Schedule impacts</h2>
                      <ul className="space-y-2">
                        {(previewData.weather_impacts || []).map((impact, i) => (
                          <li key={i} className="text-sm text-amber-900">
                            <span className="font-semibold">{impact.title || 'Weather impact'}</span>
                            {typeof impact.days_lost === 'number' ? ` — ${impact.days_lost} day(s) lost` : ''}
                            {impact.schedule_shift_applied ? ' · schedule updated' : ' · logged only'}
                            {impact.description ? (
                              <span className="block text-xs text-amber-800 mt-1">{impact.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reportSections.weekly_plan !== false && (
                    <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                      <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Weekly plan</h2>

                      <div>
                        <h3 className="text-xs font-semibold text-emerald-800 mb-1">We did this last week</h3>
                        {(previewData.last_week_done || []).length > 0 ? (
                          <ul className="space-y-1">
                            {(previewData.last_week_done || []).map((t, i) => (
                              <li key={`last-${i}`} className="text-sm text-gray-700">
                                {t.text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500">No completed tasks in the last week.</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-blue-800 mb-1">Here&apos;s what we are doing this week</h3>
                        {(previewData.this_week_plan || []).length > 0 ? (
                          <ul className="space-y-1">
                            {(previewData.this_week_plan || []).map((t, i) => (
                              <li key={`this-${i}`} className="text-sm text-gray-700">
                                {t.text}
                                {t.start_date && <span className="text-gray-400 ml-1.5 text-xs">starts {t.start_date}</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500">No tasks scheduled this week.</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-indigo-800 mb-1">Here&apos;s what we will do next week</h3>
                        {(previewData.next_week_plan || []).length > 0 ? (
                          <ul className="space-y-1">
                            {(previewData.next_week_plan || []).map((t, i) => (
                              <li key={`next-${i}`} className="text-sm text-gray-700">
                                {t.text}
                                {t.start_date && <span className="text-gray-400 ml-1.5 text-xs">starts {t.start_date}</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500">No tasks scheduled for next week.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        Preview uses sample data. &ldquo;Send test&rdquo; runs the live generator.
      </p>
    </div>
  );
}

export default ProgressReportPreview;
