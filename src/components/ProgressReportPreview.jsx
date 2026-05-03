import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  testSendProgressReport,
  computeProjectScheduleTimeline,
  listWeatherImpactsForProject,
} from '@siteweave/core-logic';
import { dedupeTasksById } from '../utils/taskDedupe';
import {
  dedupeLastWeekDoneRowsByDisplay,
  dedupeTasksByNamePhaseStartDate,
  dedupeTasksForLastWeekDone,
  dedupeWeeklyPlanRowsByDisplay,
} from '../utils/taskDuplicateDiagnostics';
import LoadingSpinner from './LoadingSpinner';

const SITEWEAVE_LOGO_URL = 'https://app.siteweave.org/logo.svg';

function TaskPhaseTag({ show, name }) {
  if (!show || !name) return null;
  return (
    <span
      className="ml-1.5 inline-block align-middle max-w-[140px] truncate rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600"
      title={name}
    >
      {name}
    </span>
  );
}

function TaskProjectNameTag({ name }) {
  if (!name) return null;
  return (
    <span className="ml-1.5 inline-block align-middle max-w-[160px] truncate text-[10px] font-medium text-gray-400">
      ({name})
    </span>
  );
}

function isOpenableImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function parsePreviewDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildPhaseNameMapFromList(phases) {
  const m = {};
  (phases || []).forEach((p) => {
    if (p?.id != null) m[p.id] = p.name;
  });
  return m;
}

/** Standard-report-shaped slice for one project (org stacked preview). */
function computeOrgProjectPreviewSlice({
  project,
  projectTasks,
  projectPhases,
  locale,
  getTaskAssigneeName,
  reportSections,
  showTaskPhotos,
  showTaskPhaseTag,
  weatherImpactsForProject,
  projectNameForTask,
}) {
  const phaseNameById = buildPhaseNameMapFromList(projectPhases);
  const phaseLabelForTask = (task) =>
    task?.project_phase_id ? phaseNameById[task.project_phase_id] || null : null;

  const scoped = dedupeTasksByNamePhaseStartDate(dedupeTasksById(projectTasks));

  const todayDay = new Date();
  todayDay.setHours(0, 0, 0, 0);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = new Date(todayDay.getTime() - oneWeekMs);
  const thisWeekEnd = new Date(todayDay.getTime() + oneWeekMs);
  const nextWeekEnd = new Date(todayDay.getTime() + 2 * oneWeekMs);

  const completedTasks = (() => {
    const rows = dedupeLastWeekDoneRowsByDisplay(
      dedupeTasksForLastWeekDone(scoped.filter((t) => t?.completed))
        .map((t) => ({
          text: t.text,
          project_id: t.project_id,
          project_name: projectNameForTask(t),
          completed_at: t.completed_at || t.updated_at || t.created_at || null,
          assignee: getTaskAssigneeName(t),
          phase_name: phaseLabelForTask(t),
          photos: showTaskPhotos
            ? (t.task_photos || t.photos || [])
                .slice(0, 2)
                .map((photo) => {
                  const thumb = photo.thumbnail_url || photo.preview_url || photo.full_url || null;
                  const full = photo.full_url || photo.thumbnail_url || photo.preview_url || null;
                  if (!thumb && !full) return null;
                  return {
                    thumbnail_url: thumb || full,
                    full_url: full || thumb,
                    caption: photo.caption,
                    is_completion_photo: photo.is_completion_photo,
                  };
                })
                .filter(Boolean)
            : [],
        })),
    );
    const seen = new Set();
    return rows
      .filter((task) => {
        const completedDate = task?.completed_at ? new Date(task.completed_at) : null;
        const renderedDate = completedDate && !Number.isNaN(completedDate.getTime())
          ? completedDate.toLocaleDateString(locale)
          : '';
        const renderedPhase = showTaskPhaseTag ? String(task?.phase_name ?? '').trim() : '';
        const renderedProject = String(task?.project_name ?? '').trim();
        const renderedKey = [String(task?.text ?? '').trim(), renderedDate, renderedPhase, renderedProject].join('\u0001');
        if (seen.has(renderedKey)) return false;
        seen.add(renderedKey);
        return true;
      })
      .slice(0, 6);
  })();

  const lastWeekDone = dedupeLastWeekDoneRowsByDisplay(
    dedupeTasksForLastWeekDone(
      scoped
        .filter((t) => t?.completed)
        .filter((t) => {
          const completedAt = t.completed_at ? new Date(t.completed_at) : null;
          return completedAt && completedAt >= oneWeekAgo && completedAt < todayDay;
        }),
    )
      .slice(0, 6)
      .map((t) => ({
        text: t.text,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        completed_at: t.completed_at || t.updated_at || t.created_at || null,
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  );

  const thisWeekPlan = dedupeWeeklyPlanRowsByDisplay(
    scoped
      .filter((t) => !t?.completed)
      .filter((t) => {
        const d = parsePreviewDay(t.start_date);
        return d && d >= todayDay && d < thisWeekEnd;
      })
      .map((t) => ({
        text: t.text,
        start_date: t.start_date || null,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  ).slice(0, 6);

  const nextWeekPlan = dedupeWeeklyPlanRowsByDisplay(
    scoped
      .filter((t) => !t?.completed)
      .filter((t) => {
        const d = parsePreviewDay(t.start_date);
        return d && d >= thisWeekEnd && d < nextWeekEnd;
      })
      .map((t) => ({
        text: t.text,
        start_date: t.start_date || null,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  ).slice(0, 6);

  const totalTaskCount = scoped.length;
  const completedTaskCount = scoped.filter((t) => t?.completed).length;

  const scheduleTimeline = project
    ? computeProjectScheduleTimeline(
        projectPhases,
        project.due_date,
        new Date(),
        project.start_date ?? null,
        scoped,
      )
    : null;

  const visiblePhases = (projectPhases || []).filter((p) => p.is_client_visible !== false);
  const phaseProgressPreview = visiblePhases.map((p) => ({
    name: p.name,
    progress: typeof p.progress === 'number' ? p.progress : 0,
    old_progress: typeof p.progress === 'number' ? p.progress : 0,
    is_client_visible: true,
  }));

  return {
    vitals: {
      tasks_completed_count: completedTaskCount,
      open_tasks_count: Math.max(0, totalTaskCount - completedTaskCount),
      project_end_date:
        scoped.reduce((max, t) => {
          const d = t?.due_date;
          if (!d) return max;
          return !max || d > max ? d : max;
        }, null) || project?.due_date || null,
      ...(scheduleTimeline
        ? {
            schedule_day_current: scheduleTimeline.schedule_day_current,
            schedule_day_total: scheduleTimeline.schedule_day_total,
            schedule_progress_pct: scheduleTimeline.schedule_progress_pct,
          }
        : {}),
    },
    status_changes: [],
    completed_tasks: completedTasks,
    phase_progress: phaseProgressPreview,
    weather_impacts: weatherImpactsForProject || [],
    last_week_done: lastWeekDone,
    this_week_plan: thisWeekPlan,
    next_week_plan: nextWeekPlan,
  };
}

/** One standard progress-report block (vitals through weekly plan). */
function StandardPreviewSections({
  data,
  reportSections,
  locale,
  translateStatus,
  showTaskPhaseTag,
  showTaskPhotos,
  showProjectNameOnTasks,
}) {
  const d = data;
  return (
    <>
      {reportSections.vitals !== false && d.vitals && (
        <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-3 border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 text-center">
          <div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{d.vitals.tasks_completed_count ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-[9rem]">Done (all time)</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{d.vitals.open_tasks_count ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-[9rem]">Not complete</p>
          </div>
          {d.vitals.project_end_date && (
            <div className="sm:border-l sm:border-gray-200 sm:pl-10">
              <p className="text-lg font-semibold text-gray-800 leading-tight">
                {new Date(d.vitals.project_end_date).toLocaleDateString(locale)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Latest task due</p>
            </div>
          )}
          {d.vitals.schedule_day_total != null && (
            <div className="sm:border-l sm:border-gray-200 sm:pl-10">
              <p className="text-lg font-semibold text-gray-800 leading-tight">
                {d.vitals.schedule_day_current} / {d.vitals.schedule_day_total}
              </p>
              {d.vitals.schedule_progress_pct != null && (
                <p className="text-xs text-gray-500 mt-0.5">{d.vitals.schedule_progress_pct}% through schedule</p>
              )}
              <p className="text-xs text-gray-500 mt-1 font-medium">Schedule (business days)</p>
            </div>
          )}
        </div>
      )}

      {reportSections.status_changes !== false && (d.status_changes || []).length > 0 && (
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/80 p-3">
          <h2 className="text-sm font-semibold text-emerald-900 mb-2 uppercase tracking-wide">Status update</h2>
          {(d.status_changes || []).map((change, i) => (
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

      {reportSections.task_completion !== false && (d.completed_tasks || []).length > 0 && (
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/80 p-3">
          <h2 className="text-sm font-semibold text-emerald-900 mb-2 uppercase tracking-wide">Completed work</h2>
          {(reportSections.show_assignees || reportSections.show_dates) && !showTaskPhotos ? (
            <table className="w-full text-sm">
              <tbody>
                {(d.completed_tasks || []).map((task, i) => (
                  <tr key={i} className="border-b border-emerald-100 last:border-0">
                    <td className="py-1.5 pr-2 text-emerald-600 font-bold w-4">✓</td>
                    <td className="py-1.5 text-gray-800">
                      {task.text}
                      <TaskPhaseTag show={showTaskPhaseTag} name={task.phase_name} />
                    </td>
                    {reportSections.show_assignees && task.assignee && (
                      <td className="py-1.5 pl-2 text-gray-400 text-xs text-right whitespace-nowrap">@{task.assignee}</td>
                    )}
                    {reportSections.show_dates && task.completed_at && (
                      <td className="py-1.5 pl-2 text-gray-400 text-xs text-right whitespace-nowrap">
                        {new Date(task.completed_at).toLocaleDateString(locale)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="space-y-3">
              {(d.completed_tasks || []).map((task, i) => (
                <li key={i} className="rounded-md border border-emerald-100 bg-white p-2.5 text-sm text-gray-800">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <div className="flex-1">
                      <p className="inline">
                        {task.text}
                        <TaskPhaseTag show={showTaskPhaseTag} name={task.phase_name} />
                        {showProjectNameOnTasks ? <TaskProjectNameTag name={task.project_name} /> : null}
                      </p>
                      {(task.assignee || task.completed_at) && (
                        <p className="mt-1 text-xs text-gray-400">
                          {task.assignee ? `@${task.assignee}` : ''}
                          {task.assignee && task.completed_at ? ' · ' : ''}
                          {task.completed_at ? new Date(task.completed_at).toLocaleDateString(locale) : ''}
                        </p>
                      )}
                      {showTaskPhotos && Array.isArray(task.photos) && task.photos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {task.photos.map((photo, photoIndex) => {
                            const imageUrl = photo.thumbnail_url || photo.full_url;
                            const linkUrl = photo.full_url || photo.thumbnail_url;
                            const content = (
                              <>
                                <img
                                  src={imageUrl}
                                  alt={photo.caption || task.text}
                                  className="h-20 w-24 rounded border border-gray-200 object-cover"
                                />
                                {photo.caption && (
                                  <p className="mt-1 max-w-24 text-[11px] text-gray-500">{photo.caption}</p>
                                )}
                              </>
                            );
                            return isOpenableImageUrl(linkUrl) ? (
                              <a
                                key={photoIndex}
                                href={linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                {content}
                              </a>
                            ) : (
                              <span key={photoIndex} className="block">
                                {content}
                              </span>
                            );
                          })}
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

      {reportSections.phase_changes !== false && (d.phase_progress || []).length > 0 && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50/80 p-3">
          <h2 className="text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wide">Phase progress</h2>
          {(d.phase_progress || []).map((phase, i) => (
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

      {reportSections.show_weather_impacts && (d.weather_impacts || []).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <h2 className="text-sm font-semibold text-amber-900 mb-2 uppercase tracking-wide">Weather / Schedule impacts</h2>
          <ul className="space-y-2">
            {(d.weather_impacts || []).map((impact, i) => (
              <li key={i} className="text-sm text-amber-900">
                <span className="font-semibold">{impact.title || 'Weather impact'}</span>
                {showProjectNameOnTasks && impact.project_name ? (
                  <span className="text-gray-500 font-normal"> ({impact.project_name})</span>
                ) : null}
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
          <p className="text-[11px] text-gray-500 leading-snug">
            Lists use scheduled start dates for this/next week (not every open task).
          </p>

          <div>
            <h3 className="text-xs font-semibold text-emerald-800 mb-1">We did this last week</h3>
            {(d.last_week_done || []).length > 0 ? (
              <ul className="space-y-1">
                {(d.last_week_done || []).map((t, i) => (
                  <li key={`last-${i}`} className="text-sm text-gray-700">
                    <span className="inline">{t.text}</span>
                    <TaskPhaseTag show={showTaskPhaseTag} name={t.phase_name} />
                    {showProjectNameOnTasks ? <TaskProjectNameTag name={t.project_name} /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No completed tasks in the last week.</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-blue-800 mb-1">Here&apos;s what we are doing this week</h3>
            {(d.this_week_plan || []).length > 0 ? (
              <ul className="space-y-1">
                {(d.this_week_plan || []).map((t, i) => (
                  <li key={`this-${i}`} className="text-sm text-gray-700">
                    <span className="inline">{t.text}</span>
                    <TaskPhaseTag show={showTaskPhaseTag} name={t.phase_name} />
                    {showProjectNameOnTasks ? <TaskProjectNameTag name={t.project_name} /> : null}
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
            {(d.next_week_plan || []).length > 0 ? (
              <ul className="space-y-1">
                {(d.next_week_plan || []).map((t, i) => (
                  <li key={`next-${i}`} className="text-sm text-gray-700">
                    <span className="inline">{t.text}</span>
                    <TaskPhaseTag show={showTaskPhaseTag} name={t.phase_name} />
                    {showProjectNameOnTasks ? <TaskProjectNameTag name={t.project_name} /> : null}
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
  );
}

/**
 * Progress Report Preview Component
 * Shows a live preview of the email using real org/project data where available.
 * Preview layout follows the schedule report type (Standard vs Brief); there is no separate preview toggle.
 */
function ProgressReportPreview({ formData, recipients, scheduleId, projectId: projectIdProp = null }) {
  const { i18n } = useTranslation();
  const locale = i18n?.language || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewPhases, setPreviewPhases] = useState([]);
  const [previewWeatherImpacts, setPreviewWeatherImpacts] = useState([]);

  const previewMode = formData?.report_audience_type === 'executive' ? 'executive' : 'standard';

  /** Schedule row + builder prop — both needed so phase names resolve in the preview */
  const effectiveProjectId = formData?.project_id ?? projectIdProp ?? null;

  const projects = state.projects || [];
  const effectiveIncludedProjectIds = React.useMemo(() => {
    const ids = formData?.included_project_ids;
    if (Array.isArray(ids)) return ids;
    return projects.map((p) => p.id);
  }, [formData?.included_project_ids, projects]);

  const [orgTasks, setOrgTasks] = React.useState(null);

  React.useEffect(() => {
    const pid = effectiveProjectId;
    const ids = effectiveIncludedProjectIds;
    if (pid) {
      const ac = new AbortController();
      (async () => {
        let q = supabaseClient
          .from('project_phases')
          .select('*')
          .eq('project_id', pid)
          .order('order', { ascending: true });
        if (state.currentOrganization?.id) {
          q = q.eq('organization_id', state.currentOrganization.id);
        }
        const { data, error } = await q;
        if (ac.signal.aborted) return;
        if (error) setPreviewPhases([]);
        else setPreviewPhases(data || []);
      })();
      return () => ac.abort();
    }
    if (!ids.length) {
      setPreviewPhases([]);
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      let q = supabaseClient
        .from('project_phases')
        .select('*')
        .in('project_id', ids)
        .order('order', { ascending: true });
      if (state.currentOrganization?.id) {
        q = q.eq('organization_id', state.currentOrganization.id);
      }
      const { data, error } = await q;
      if (ac.signal.aborted) return;
      if (error) setPreviewPhases([]);
      else setPreviewPhases(data || []);
    })();
    return () => ac.abort();
  }, [effectiveProjectId, effectiveIncludedProjectIds, state.currentOrganization?.id]);

  React.useEffect(() => {
    const pid = effectiveProjectId;
    const ids = effectiveIncludedProjectIds;
    if (pid) {
      const ac = new AbortController();
      (async () => {
        try {
          const rows = await listWeatherImpactsForProject(
            supabaseClient,
            pid,
            state.currentOrganization?.id || null,
          );
          if (ac.signal.aborted) return;
          setPreviewWeatherImpacts(rows || []);
        } catch {
          if (ac.signal.aborted) return;
          setPreviewWeatherImpacts([]);
        }
      })();
      return () => ac.abort();
    }
    if (!ids.length || !state.currentOrganization?.id) {
      setPreviewWeatherImpacts([]);
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      const { data, error } = await supabaseClient
        .from('weather_impacts')
        .select('*, projects!weather_impacts_project_id_fkey(name)')
        .eq('organization_id', state.currentOrganization.id)
        .in('project_id', ids)
        .order('created_at', { ascending: false });
      if (ac.signal.aborted) return;
      setPreviewWeatherImpacts(error ? [] : data || []);
    })();
    return () => ac.abort();
  }, [effectiveProjectId, effectiveIncludedProjectIds, state.currentOrganization?.id]);

  React.useEffect(() => {
    if (effectiveProjectId) {
      setOrgTasks(null);
      return undefined;
    }
    const ids = effectiveIncludedProjectIds;
    if (!ids.length) {
      setOrgTasks([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      let q = supabaseClient
        .from('tasks')
        .select('*, contacts(name, avatar_url), projects!fk_tasks_project_id(name), task_photos(*)')
        .in('project_id', ids);
      if (state.currentOrganization?.id) {
        q = q.eq('organization_id', state.currentOrganization.id);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) setOrgTasks([]);
      else setOrgTasks(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId, effectiveIncludedProjectIds, state.currentOrganization?.id]);

  const phaseNameById = React.useMemo(() => {
    const m = {};
    (previewPhases || []).forEach((p) => {
      if (p?.id != null) m[p.id] = p.name;
    });
    return m;
  }, [previewPhases]);

  const phaseLabelForTask = (task) =>
    task?.project_phase_id ? phaseNameById[task.project_phase_id] || null : null;

  const projectNameForTask = (task) =>
    task?.projects?.name ||
    projects.find((p) => String(p.id) === String(task?.project_id))?.name ||
    null;

  const projectNameForPhase = (phase) =>
    projects.find((p) => String(p.id) === String(phase?.project_id))?.name || null;

  const tasks = state.tasks || [];
  const contacts = state.contacts || [];

  /** Prefer fetched org tasks; until then use in-memory tasks so vitals are not 0/0. */
  const orgTasksResolved = React.useMemo(() => {
    if (effectiveProjectId) return null;
    const fromState = dedupeTasksById(
      tasks.filter((t) => effectiveIncludedProjectIds.some((id) => String(id) === String(t.project_id))),
    );
    if (orgTasks === null) return fromState;
    return orgTasks.length > 0 ? orgTasks : fromState;
  }, [effectiveProjectId, orgTasks, tasks, effectiveIncludedProjectIds]);

  const reportSections = formData?.report_sections || {};
  const showTaskPhaseTag = Boolean(reportSections.show_task_phase);
  const includeTaskPhotosInReport =
    formData?.report_audience_type === 'internal' || reportSections.include_task_photos === true;
  // Preview should always surface available task photos so users can verify visuals.
  const showTaskPhotos = true;
  const selectedProject = effectiveProjectId
    ? projects.find((p) => String(p.id) === String(effectiveProjectId))
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
  const previewWindowStartIso = periodStart.toISOString();
  const previewWindowEndIso = now.toISOString();
  const organizationName = state.currentOrganization?.name || 'Organization';
  const projectName = selectedProject?.name || null;

  const scopedTasks = dedupeTasksByNamePhaseStartDate(
    dedupeTasksById(
      selectedProject
        ? tasks.filter((t) => String(t.project_id) === String(selectedProject.id))
        : orgTasksResolved ?? [],
    ),
  );

  const completedTasks = (() => {
    const rows = dedupeLastWeekDoneRowsByDisplay(
      dedupeTasksForLastWeekDone(scopedTasks.filter((t) => t?.completed))
        .map((t) => ({
          text: t.text,
          project_id: t.project_id,
          project_name: projectNameForTask(t),
          completed_at: t.completed_at || t.updated_at || t.created_at || null,
          assignee: getTaskAssigneeName(t),
          phase_name: phaseLabelForTask(t),
          photos: showTaskPhotos
            ? (t.task_photos || t.photos || [])
                .slice(0, 2)
                .map((photo) => {
                  const thumb = photo.thumbnail_url || photo.preview_url || photo.full_url || null;
                  const full = photo.full_url || photo.thumbnail_url || photo.preview_url || null;
                  if (!thumb && !full) return null;
                  return {
                    thumbnail_url: thumb || full,
                    full_url: full || thumb,
                    caption: photo.caption,
                    is_completion_photo: photo.is_completion_photo,
                  };
                })
                .filter(Boolean)
            : [],
        })),
    );

    const seen = new Set();
    return rows
      .filter((task) => {
        const completedDate = task?.completed_at ? new Date(task.completed_at) : null;
        const renderedDate = completedDate && !Number.isNaN(completedDate.getTime())
          ? completedDate.toLocaleDateString(locale)
          : '';
        const renderedPhase = showTaskPhaseTag ? String(task?.phase_name ?? '').trim() : '';
        const renderedProject = String(task?.project_name ?? '').trim();
        const renderedKey = [String(task?.text ?? '').trim(), renderedDate, renderedPhase, renderedProject].join('\u0001');
        if (seen.has(renderedKey)) return false;
        seen.add(renderedKey);
        return true;
      })
      .slice(0, 6);
  })();

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

  const lastWeekDone = dedupeLastWeekDoneRowsByDisplay(
    dedupeTasksForLastWeekDone(
      scopedTasks
        .filter((t) => t?.completed)
        .filter((t) => {
          const completedAt = t.completed_at ? new Date(t.completed_at) : null;
          return completedAt && completedAt >= oneWeekAgo && completedAt < todayDay;
        }),
    )
      .slice(0, 6)
      .map((t) => ({
        text: t.text,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        completed_at: t.completed_at || t.updated_at || t.created_at || null,
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  );

  const thisWeekPlan = dedupeWeeklyPlanRowsByDisplay(
    scopedTasks
      .filter((t) => !t?.completed)
      .filter((t) => {
        const d = parseDay(t.start_date);
        return d && d >= todayDay && d < thisWeekEnd;
      })
      .map((t) => ({
        text: t.text,
        start_date: t.start_date || null,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  ).slice(0, 6);

  const nextWeekPlan = dedupeWeeklyPlanRowsByDisplay(
    scopedTasks
      .filter((t) => !t?.completed)
      .filter((t) => {
        const d = parseDay(t.start_date);
        return d && d >= thisWeekEnd && d < nextWeekEnd;
      })
      .map((t) => ({
        text: t.text,
        start_date: t.start_date || null,
        project_id: t.project_id,
        project_name: projectNameForTask(t),
        assignee: getTaskAssigneeName(t),
        phase_name: phaseLabelForTask(t),
      })),
  ).slice(0, 6);

  const totalTaskCount = scopedTasks.length;
  const completedTaskCount = scopedTasks.filter((t) => t?.completed).length;

  const scheduleTimeline = selectedProject
    ? computeProjectScheduleTimeline(
        previewPhases,
        selectedProject.due_date,
        new Date(),
        selectedProject.start_date ?? null,
        scopedTasks
      )
    : null;
  const scheduleVitals = scheduleTimeline || null;

  const visiblePreviewPhases = (previewPhases || []).filter((p) => p.is_client_visible !== false);
  const phaseProgressPreview = visiblePreviewPhases.map((p) => {
    const prog = typeof p.progress === 'number' ? p.progress : 0;
    const projLabel = projectNameForPhase(p);
    const name =
      selectedProject || !projLabel
        ? p.name
        : `${projLabel}: ${p.name}`;
    return {
      name,
      progress: prog,
      old_progress: prog,
      is_client_visible: true,
    };
  });

  const parseDateLike = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const toCalendarDayKey = (value) => {
    const parsed = parseDateLike(value);
    if (!parsed) return null;
    return parsed.toISOString().slice(0, 10);
  };

  const weatherImpactFallsInPreviewWindow = (row) => {
    const windowStartDay = toCalendarDayKey(previewWindowStartIso);
    const windowEndDay = toCalendarDayKey(previewWindowEndIso);
    if (!windowStartDay || !windowEndDay) return true;

    const createdAtDay = toCalendarDayKey(row?.created_at || null);
    if (createdAtDay && createdAtDay >= windowStartDay && createdAtDay <= windowEndDay) return true;

    const impactStartDay = toCalendarDayKey(row?.start_date || null);
    const impactEndDay = toCalendarDayKey(row?.end_date || null);
    if (impactStartDay && impactEndDay) {
      return impactStartDay <= windowEndDay && impactEndDay >= windowStartDay;
    }
    if (impactStartDay) return impactStartDay >= windowStartDay && impactStartDay <= windowEndDay;
    if (impactEndDay) return impactEndDay >= windowStartDay && impactEndDay <= windowEndDay;
    return false;
  };

  const weatherImpactsInWindow = (previewWeatherImpacts || [])
    .filter((row) => weatherImpactFallsInPreviewWindow(row))
    .map((row) => ({
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      description: row.description,
      days_lost: row.days_lost,
      start_date: row.start_date,
      end_date: row.end_date,
      schedule_shift_applied: row.schedule_shift_applied === true,
      project_name: row.projects?.name || projectNameForTask(row) || projectName || 'Project',
    }));

  const orgAggregateVitals = React.useMemo(() => {
    if (selectedProject) return null;
    const tot = scopedTasks.length;
    const done = scopedTasks.filter((t) => t?.completed).length;
    return {
      project_count: effectiveIncludedProjectIds.length,
      tasks_completed_count: done,
      open_tasks_count: Math.max(0, tot - done),
    };
  }, [selectedProject, scopedTasks, effectiveIncludedProjectIds]);

  const orgProjectPreviewSlices = React.useMemo(() => {
    if (selectedProject) return null;
    return effectiveIncludedProjectIds.map((pid) => {
      const project = projects.find((p) => String(p.id) === String(pid));
      const projectTasks = scopedTasks.filter((t) => String(t.project_id) === String(pid));
      const projectPhases = (previewPhases || []).filter((p) => String(p.project_id) === String(pid));
      const weatherFor = (weatherImpactsInWindow || []).filter((w) => String(w.project_id) === String(pid));
      return {
        id: String(pid),
        project,
        slice: computeOrgProjectPreviewSlice({
          project: project || { id: pid, name: 'Project' },
          projectTasks,
          projectPhases,
          locale,
          getTaskAssigneeName,
          reportSections,
          showTaskPhotos,
          showTaskPhaseTag,
          weatherImpactsForProject: weatherFor,
          projectNameForTask,
        }),
      };
    });
  }, [
    selectedProject,
    effectiveIncludedProjectIds,
    projects,
    scopedTasks,
    previewPhases,
    weatherImpactsInWindow,
    locale,
    getTaskAssigneeName,
    reportSections,
    showTaskPhotos,
    showTaskPhaseTag,
  ]);

  const baseData = {
    organization_name: organizationName,
    project_name: projectName,
    start_date: periodStart.toISOString(),
    end_date: now.toISOString(),
    weather_impacts: reportSections.show_weather_impacts ? weatherImpactsInWindow : [],
    vitals: {
      tasks_completed_count: completedTaskCount,
      open_tasks_count: Math.max(0, totalTaskCount - completedTaskCount),
      project_end_date:
        scopedTasks.reduce((max, t) => {
          const d = t?.due_date;
          if (!d) return max;
          return !max || d > max ? d : max;
        }, null) || selectedProject?.due_date || null,
      ...(scheduleVitals ? { ...scheduleVitals } : {}),
    },
    last_week_done: lastWeekDone,
    this_week_plan: thisWeekPlan,
    next_week_plan: nextWeekPlan,
    status_changes: [],
    completed_tasks: completedTasks,
    phase_progress: phaseProgressPreview,
  };

  const getPreviewData = (data, mode) => {
    if (mode === 'executive') {
      const deriveStatusKey = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('hold') || s.includes('pause') || s.includes('behind') || s.includes('delay')) return 'behind';
        if (s.includes('risk') || s.includes('concern')) return 'at_risk';
        return 'on_track';
      };

      let atAGlance = { on_track: 0, at_risk: 0, behind: 0 };
      if (selectedProject) {
        const k = deriveStatusKey(selectedProject.status);
        atAGlance = {
          on_track: k === 'on_track' ? 1 : 0,
          at_risk: k === 'at_risk' ? 1 : 0,
          behind: k === 'behind' ? 1 : 0,
        };
      } else {
        const list = (projects || []).filter((p) =>
          effectiveIncludedProjectIds.some((id) => String(id) === String(p.id)),
        );
        atAGlance = list.reduce(
          (acc, p) => {
            const k = deriveStatusKey(p.status);
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          },
          { on_track: 0, at_risk: 0, behind: 0 },
        );
      }

      const startMs = new Date(data.start_date).getTime();
      const endMs = new Date(data.end_date).getTime();
      const periodCompleted = scopedTasks.filter((t) => {
        if (!t?.completed) return false;
        const ca = t.completed_at || t.updated_at || t.created_at;
        if (!ca) return false;
        const ts = new Date(ca).getTime();
        return !Number.isNaN(ts) && ts >= startMs && ts <= endMs;
      }).length;

      const v = data.vitals;
      const wiCount = (data.weather_impacts || []).length;
      const openCount = v?.open_tasks_count ?? Math.max(0, totalTaskCount - completedTaskCount);

      const totalProjectsInScope = selectedProject ? 1 : effectiveIncludedProjectIds.length;

      const parts = [];
      if (!selectedProject && totalProjectsInScope > 0) {
        parts.push(
          `Summary covers ${totalProjectsInScope} selected project${totalProjectsInScope !== 1 ? 's' : ''}`,
        );
      }
      if (periodCompleted > 0) {
        parts.push(
          `${periodCompleted} task${periodCompleted !== 1 ? 's' : ''} completed in this reporting period`,
        );
      }
      if (v?.schedule_day_current != null && v?.schedule_day_total != null) {
        const schedPct = v.schedule_progress_pct;
        parts.push(
          `day ${v.schedule_day_current} of ${v.schedule_day_total} on the schedule${schedPct != null ? ` (${schedPct}% through)` : ''}`,
        );
      }
      if (openCount > 0) {
        parts.push(`${openCount} open task${openCount !== 1 ? 's' : ''}`);
      }
      if (wiCount > 0) {
        parts.push(
          `${wiCount} weather/schedule impact record${wiCount !== 1 ? 's' : ''} in this period`,
        );
      }

      const executive_summary =
        parts.length > 0
          ? parts.join(', ').replace(/,([^,]*)$/, ' and$1') + '.'
          : 'No significant changes recorded in this reporting period.';

      const highlights = [];
      if (periodCompleted > 0) {
        highlights.push(
          `${periodCompleted} task${periodCompleted !== 1 ? 's' : ''} completed this period`,
        );
      }
      if (v?.schedule_day_total != null && v?.schedule_day_current != null) {
        highlights.push(
          `Schedule: day ${v.schedule_day_current} of ${v.schedule_day_total}${
            v.schedule_progress_pct != null ? ` (${v.schedule_progress_pct}% through schedule)` : ''
          }`,
        );
      }
      if (data.last_week_done?.length) {
        highlights.push(`${data.last_week_done.length} task(s) completed last week (by completion date)`);
      }
      if (data.this_week_plan?.length) {
        highlights.push(`${data.this_week_plan.length} task(s) planned this week`);
      }
      if (data.next_week_plan?.length) {
        highlights.push(`${data.next_week_plan.length} task(s) starting next week`);
      }
      if (v?.open_tasks_count > 0) {
        highlights.push(
          `${v.open_tasks_count} open task${v.open_tasks_count !== 1 ? 's' : ''} across ${totalProjectsInScope} project(s)`,
        );
      }
      if (wiCount > 0) {
        highlights.push(`${wiCount} weather/schedule impact${wiCount !== 1 ? 's' : ''} logged this period`);
      }

      return {
        organization_name: data.organization_name,
        project_name: data.project_name,
        start_date: data.start_date,
        end_date: data.end_date,
        executive_summary,
        at_a_glance: atAGlance,
        key_highlights: highlights.slice(0, 5),
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
    ? `Brief: ${previewData.organization_name || 'Organization'} Status`
    : `Progress Update: ${previewData.project_name || previewData.organization_name || 'Your Project'}`;

  const toDisplay = recipients.length > 0
    ? recipients.slice(0, 3).map((r) => r.email).join(', ')
    + (recipients.length > 3 ? ` +${recipients.length - 3} more` : '')
    : 'recipients@example.com';
  const fromDisplay = state.currentOrganization?.name
    ? `${state.currentOrganization.name} <notifications@siteweave.org>`
    : 'SiteWeave Notifications <notifications@siteweave.org>';
  const dateDisplay = now.toLocaleString(locale, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* Controls — single header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 min-w-0">
          Preview:{' '}
          <span className="font-semibold text-gray-700">
            {previewMode === 'executive' ? 'Brief' : 'Standard'}
          </span>
        </p>

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
                <p
                  className="text-xl font-bold text-gray-900 leading-snug"
                  style={{ fontFamily: 'Calibri, Segoe UI, sans-serif' }}
                >
                  {previewMode === 'executive' ? 'Brief' : 'Progress Update'}
                  <span className="text-gray-400 font-semibold"> — </span>
                  <span className="font-semibold text-blue-600">
                    {previewData.project_name || previewData.organization_name || 'Your Project'}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {new Date(previewData.start_date).toLocaleDateString(locale)} –{' '}
                  {new Date(previewData.end_date).toLocaleDateString(locale)}
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

              {/* ── STANDARD: single project vs stacked per-project (org) ── */}
              {previewMode === 'standard' && selectedProject && (
                <StandardPreviewSections
                  data={previewData}
                  reportSections={reportSections}
                  locale={locale}
                  translateStatus={translateStatus}
                  showTaskPhaseTag={showTaskPhaseTag}
                  showTaskPhotos={showTaskPhotos}
                  showProjectNameOnTasks={false}
                />
              )}
              {previewMode === 'standard' && !selectedProject && orgProjectPreviewSlices && (
                <>
                  {reportSections.vitals !== false && orgAggregateVitals && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 mb-4">
                      <p className="text-sm text-slate-800 leading-snug">
                        <span className="font-semibold">{orgAggregateVitals.project_count}</span>
                        {' '}
                        project{orgAggregateVitals.project_count !== 1 ? 's' : ''} in this report
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="font-semibold tabular-nums">{orgAggregateVitals.tasks_completed_count}</span>
                        {' '}
                        done (all tasks, selected projects)
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="font-semibold tabular-nums">{orgAggregateVitals.open_tasks_count}</span>
                        {' '}
                        not complete
                      </p>
                    </div>
                  )}
                  <div className="space-y-5">
                    {orgProjectPreviewSlices.map(({ id, project, slice }) => (
                      <section
                        key={id}
                        className="rounded-lg border border-gray-200 bg-gray-50/90 p-3 sm:p-4 shadow-sm space-y-4"
                      >
                        <div className="border-b border-gray-200 pb-2">
                          <h2 className="text-base font-bold text-gray-900">{project?.name || 'Project'}</h2>
                          {project?.status ? (
                            <p className="text-xs text-gray-500 mt-0.5">Status: {translateStatus(project.status)}</p>
                          ) : null}
                        </div>
                        <StandardPreviewSections
                          data={slice}
                          reportSections={reportSections}
                          locale={locale}
                          translateStatus={translateStatus}
                          showTaskPhaseTag={showTaskPhaseTag}
                          showTaskPhotos={showTaskPhotos}
                          showProjectNameOnTasks={false}
                        />
                      </section>
                    ))}
                  </div>
                </>
              )}

              <div className="pt-4 mt-2 border-t border-gray-200 text-center">
                {reportSections.show_siteweave_logo !== false ? (
                  <div className="inline-flex items-center gap-2.5 text-left max-w-full">
                    <img
                      src={SITEWEAVE_LOGO_URL}
                      alt="SiteWeave"
                      className="w-9 h-9 shrink-0"
                      width={36}
                      height={36}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 m-0 leading-snug">Generated by SiteWeave</p>
                      <p className="text-[11px] text-gray-400 m-0 mt-0.5 leading-snug">
                        Automated progress report from{' '}
                        {state.currentOrganization?.name || 'SiteWeave'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-gray-400 m-0">Generated by SiteWeave</p>
                    <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                      Automated progress report from {state.currentOrganization?.name || 'SiteWeave'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        {selectedProject
          ? 'Preview uses current project data and a rolling 7-day weather impact window.'
          : 'Organization preview stacks one block per selected project (same sections as a single-project report). Uses current task data and a rolling 7-day weather window.'}
      </p>
    </div>
  );
}

export default ProgressReportPreview;
