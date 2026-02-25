import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import { toFrappeGanttTasks } from '../utils/ganttAdapter';

const ROW_HEIGHT = 40;
const LEFT_PANEL_DEFAULT = 340;
const LEFT_PANEL_MIN = 240;
const LEFT_PANEL_MAX = 640;
const CHART_HEADER_HEIGHT = 50;
const VIEW_MODES = ['Day', 'Week', 'Month', 'Year'];

function formatGanttDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function StatusBadge({ completed }) {
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Complete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
      </svg>
      To do
    </span>
  );
}

/**
 * Renders a Gantt chart with split pane: left task table + right timeline.
 * Tasks should be pre-ordered (e.g. via orderTasksForGantt) so rows align.
 */
export default function GanttChart({
  tasks = [],
  dependencies = [],
  criticalPathIds = [],
  showCriticalPath = true,
}) {
  const chartContainerRef = useRef(null);
  const ganttInstanceRef = useRef(null);
  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const viewModeRef = useRef('Week');
  const [viewMode, setViewMode] = useState('Week');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(LEFT_PANEL_DEFAULT);

  const handleResizeMove = useCallback((e) => {
    const delta = e.clientX - resizeStartX.current;
    const next = Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, resizeStartWidth.current + delta));
    setLeftPanelWidth(next);
  }, []);

  const handleResizeEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftPanelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [leftPanelWidth, handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;
    if (!leftEl || !rightEl) return;
    function onRightScroll() {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      leftEl.scrollTop = rightEl.scrollTop;
      isSyncingScroll.current = false;
    }
    function onLeftScroll() {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      rightEl.scrollTop = leftEl.scrollTop;
      isSyncingScroll.current = false;
    }
    rightEl.addEventListener('scroll', onRightScroll);
    leftEl.addEventListener('scroll', onLeftScroll);
    return () => {
      rightEl.removeEventListener('scroll', onRightScroll);
      leftEl.removeEventListener('scroll', onLeftScroll);
    };
  }, []);

  const ganttTasks = useMemo(() => {
    const criticalIds = showCriticalPath ? (criticalPathIds || []) : [];
    return toFrappeGanttTasks(
      Array.isArray(tasks) ? tasks : [],
      Array.isArray(dependencies) ? dependencies : [],
      criticalIds
    );
  }, [tasks, dependencies, criticalPathIds, showCriticalPath]);

  const tasksWithDates = useMemo(() => {
    const taskById = new Map((Array.isArray(tasks) ? tasks : []).map((t) => [t.id, t]));
    return ganttTasks.map((gt) => taskById.get(gt.id)).filter(Boolean);
  }, [tasks, ganttTasks]);

  const handleScrollToday = useCallback(() => {
    try { ganttInstanceRef.current?.scroll_current?.(); } catch (_) { /* noop */ }
  }, []);

  const handleChangeViewMode = useCallback((mode) => {
    setViewMode(mode);
    viewModeRef.current = mode;
    try { ganttInstanceRef.current?.change_view_mode?.(mode, true); } catch (_) { /* noop */ }
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Start', 'Due', 'Status', 'Assignee'];
    const rows = tasksWithDates.map((t) => [
      (t.text || '').replace(/"/g, '""'),
      t.start_date || '',
      t.due_date || '',
      t.completed ? 'Complete' : 'To do',
      t.contacts?.name || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'gantt-tasks.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [tasksWithDates]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    if (ganttTasks.length === 0) {
      container.innerHTML = '';
      ganttInstanceRef.current = null;
      return;
    }
    container.innerHTML = '';
    try {
      const instance = new Gantt(container, ganttTasks, {
        view_mode: viewModeRef.current,
        readonly: true,
        view_mode_select: false,
        date_format: 'YYYY-MM-DD',
        scroll_to: 'today',
        today_button: false,
        bar_height: 28,
        padding: 12,
        container_height: 'auto',
        header_height: CHART_HEADER_HEIGHT,
      });
      ganttInstanceRef.current = instance;
    } catch (err) {
      console.error('Gantt render error', err);
      container.innerHTML = '<div class="p-4 text-red-600 text-sm">Could not render chart.</div>';
    }
    // viewModeRef intentionally excluded — view changes go through the API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganttTasks]);

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 text-sm rounded-lg bg-gray-50 border border-gray-200" style={{ minHeight: 200 }}>
        No tasks with dates to display. Add start dates or due dates to tasks.
      </div>
    );
  }

  return (
    <div className="gantt-split-root flex flex-col flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 py-2.5 px-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={handleScrollToday}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Today
        </button>
        <select
          value={viewMode}
          onChange={(e) => handleChangeViewMode(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="View mode"
        >
          {VIEW_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => handleChangeViewMode('Month')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Auto fit
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export CSV
        </button>
      </div>

      {/* Split pane: shared vertical scroll */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: task table (no horizontal scroll) */}
        <div className="flex-shrink-0 flex flex-col bg-white overflow-hidden" style={{ width: leftPanelWidth }}>
          {/* Left table header — fixed height to match chart header */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 flex items-end" style={{ height: CHART_HEADER_HEIGHT }}>
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 px-3 w-[32%]">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 px-2 w-[16%]">Start</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 px-2 w-[14%]">Due</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 px-2 w-[22%]">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 px-2 w-[16%]">Assignee</th>
                </tr>
              </thead>
            </table>
          </div>
          {/* Left table body — scrolls with chart */}
          <div ref={leftScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gantt-left-scroll">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <tbody>
                {tasksWithDates.map((task) => {
                  const isChild = !!task.parent_task_id;
                  const isSelected = selectedTaskId === task.id;
                  const assigneeName = task.contacts?.name;
                  return (
                    <tr
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTaskId(task.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTaskId(task.id); } }}
                      className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus:outline-none`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <td className="py-1 px-3 text-sm text-gray-900 truncate w-[32%]" style={{ paddingLeft: isChild ? 28 : 12 }}>
                        <span className={isChild ? 'text-gray-700' : 'font-semibold'}>
                          {task.text || 'Task'}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-xs text-gray-500 w-[16%]">{formatGanttDate(task.start_date)}</td>
                      <td className="py-1 px-2 text-xs text-gray-500 w-[14%]">{formatGanttDate(task.due_date)}</td>
                      <td className="py-1 px-2 w-[22%]">
                        <StatusBadge completed={task.completed} />
                      </td>
                      <td className="py-1 px-2 text-xs text-gray-500 truncate w-[16%]">{assigneeName || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resize handle — drag to show more task list or more chart */}
        <div
          role="separator"
          aria-label="Resize task list"
          tabIndex={0}
          onMouseDown={handleResizeStart}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); setLeftPanelWidth((w) => Math.max(LEFT_PANEL_MIN, w - 20)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setLeftPanelWidth((w) => Math.min(LEFT_PANEL_MAX, w + 20)); }
          }}
          className="gantt-resize-handle flex-shrink-0 w-2 flex flex-col items-center justify-center cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors select-none border-l border-r border-gray-200"
          style={{ minWidth: 8 }}
        >
          <div className="w-1 h-16 rounded-full bg-gray-400 opacity-70 pointer-events-none" />
        </div>

        {/* Right: chart (horizontal scroll here, vertical synced with left) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Chart header area is inside the chart SVG, so no separate element needed */}
          <div ref={rightScrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto gantt-right-scroll">
            <div
              ref={chartContainerRef}
              className="gantt-chart-wrapper"
            />
          </div>
        </div>
      </div>

      <style>{`
        /* Prevent frappe-gantt from adding its own scrollbars */
        .gantt-chart-wrapper .gantt-container {
          overflow: visible !important;
          height: auto !important;
        }
        .gantt-chart-wrapper .gantt {
          overflow: visible !important;
        }

        /* Hide frappe-gantt's built-in view mode select (we use our toolbar) */
        .gantt-chart-wrapper .view-mode-select,
        .gantt-chart-wrapper .today-button {
          display: none !important;
        }

        /* Today marker line */
        .gantt-chart-wrapper .today-highlight {
          fill: rgba(59, 130, 246, 0.08) !important;
        }
        .gantt-chart-wrapper .today-highlight + rect,
        .gantt-chart-wrapper line.today-line {
          stroke: #dc2626 !important;
          stroke-width: 2 !important;
        }

        /* Status-based bar colors */
        .gantt-critical .bar { fill: #dc2626 !important; stroke: #b91c1c !important; }
        .gantt-critical .bar-progress { fill: #f87171 !important; }
        .gantt-complete .bar { fill: #059669 !important; stroke: #047857 !important; }
        .gantt-complete .bar-progress { fill: #34d399 !important; }
        .gantt-todo .bar { fill: #94a3b8 !important; stroke: #64748b !important; }
        .gantt-todo .bar-progress { fill: #cbd5e1 !important; }

        /* Milestone: thin diamond-like bar (standalone or combined) */
        .gantt-milestone .bar,
        .gantt-todo-milestone .bar,
        .gantt-complete-milestone .bar,
        .gantt-critical-milestone .bar {
          rx: 2 !important;
          ry: 2 !important;
        }
        .gantt-milestone .bar-wrapper .bar,
        .gantt-todo-milestone .bar-wrapper .bar,
        .gantt-complete-milestone .bar-wrapper .bar,
        .gantt-critical-milestone .bar-wrapper .bar {
          width: 12px !important;
        }
        .gantt-todo-milestone .bar { fill: #94a3b8 !important; stroke: #64748b !important; }
        .gantt-complete-milestone .bar { fill: #059669 !important; stroke: #047857 !important; }
        .gantt-critical-milestone .bar { fill: #dc2626 !important; stroke: #b91c1c !important; }

        /* Sync vertical scroll between left table and chart */
        .gantt-left-scroll, .gantt-right-scroll {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
        .gantt-left-scroll::-webkit-scrollbar,
        .gantt-right-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .gantt-left-scroll::-webkit-scrollbar-thumb,
        .gantt-right-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .gantt-left-scroll::-webkit-scrollbar-track,
        .gantt-right-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        /* Left pane scrolls for sync but hides its scrollbar so only one is visible */
        .gantt-left-scroll {
          overflow-y: scroll !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .gantt-left-scroll::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
