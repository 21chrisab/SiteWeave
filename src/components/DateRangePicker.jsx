import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { localDateIso } from '../utils/dateHelpers';

function isoToLocalDate(iso) {
  if (!iso || typeof iso !== 'string') return undefined;
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function formatRangeLabel(startIso, endIso, locale) {
  const from = isoToLocalDate(startIso);
  const to = isoToLocalDate(endIso);
  if (!from && !to) return '';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  if (from && to) {
    const a = from.toLocaleDateString(locale, opts);
    const b = to.toLocaleDateString(locale, opts);
    return a === b ? a : `${a} – ${b}`;
  }
  if (from) return `${from.toLocaleDateString(locale, opts)} – …`;
  return '';
}

/**
 * Single trigger + popover calendar for selecting a start/end range (YYYY-MM-DD).
 */
function DateRangePicker({
  startValue,
  endValue,
  onChange,
  label = 'Date range',
  id,
  presets = null,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [numberOfMonths, setNumberOfMonths] = useState(1);
  const rootRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setNumberOfMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const selected = useMemo(() => {
    const from = isoToLocalDate(startValue);
    const to = isoToLocalDate(endValue);
    if (!from && !to) return undefined;
    return { from: from || undefined, to: to || undefined };
  }, [startValue, endValue]);

  const defaultMonth = selected?.from || selected?.to || new Date();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleSelect = (range) => {
    if (!range) {
      onChange({ start: '', end: '' });
      return;
    }
    if (range.from && !range.to) {
      onChange({ start: localDateIso(range.from), end: '' });
      return;
    }
    if (range.from && range.to) {
      onChange({
        start: localDateIso(range.from),
        end: localDateIso(range.to),
      });
    }
  };

  const summary = formatRangeLabel(startValue, endValue);
  const labelId = id || 'task-date-range';
  const year = new Date().getFullYear();

  const pickerStyle = {
    '--rdp-accent-color': '#2563eb',
    '--rdp-accent-background-color': '#dbeafe',
  };

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      {label ? (
        <label id={labelId} className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm shadow-xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <span className={summary ? 'text-gray-900' : 'text-gray-400'}>
          {summary || 'Select start and end dates'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
          role="dialog"
          aria-label="Choose date range"
          style={pickerStyle}
        >
          {presets ? (
            <div className="mb-3 flex flex-wrap gap-2 border-b border-gray-100 pb-3">{presets}</div>
          ) : null}
          <div className="overflow-x-auto">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={defaultMonth}
              numberOfMonths={numberOfMonths}
              captionLayout="dropdown"
              fromYear={year - 3}
              toYear={year + 12}
            />
          </div>
          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange({ start: '', end: '' });
                setOpen(false);
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Clear dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
