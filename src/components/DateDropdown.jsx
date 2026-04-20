import React, { useState, useEffect, useMemo } from 'react';

/**
 * Month / day / year dropdowns — no typing. Construction schedules often need past dates;
 * year range defaults to a sliding window around the current year (overridable).
 *
 * @param {string} value - YYYY-MM-DD or ''
 * @param {function} onChange
 * @param {string} [label]
 * @param {string} [className]
 * @param {number} [yearsBack] - years before current year to include (default 2)
 * @param {number} [yearsForward] - years after current year to include (default 10)
 * @param {number} [minYear] - override computed min year
 * @param {number} [maxYear] - override computed max year
 * @param {boolean} [compact] - slightly smaller controls (e.g. popovers)
 */
function DateDropdown({
  value,
  onChange,
  label,
  className = '',
  yearsBack = 2,
  yearsForward = 10,
  minYear: minYearProp,
  maxYear: maxYearProp,
  compact = false,
}) {
  const [internalState, setInternalState] = useState(() => {
    if (!value) return { year: '', month: '', day: '' };
    const [year, month, day] = value.split('-');
    return { year: year || '', month: month || '', day: day || '' };
  });

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        setInternalState({ year, month, day });
      }
    } else if (!internalState.year && !internalState.month && !internalState.day) {
      setInternalState({ year: '', month: '', day: '' });
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const minYear = minYearProp ?? currentYear - yearsBack;
  const maxYear = maxYearProp ?? currentYear + yearsForward;

  const years = useMemo(() => {
    const lo = Math.min(minYear, maxYear);
    const hi = Math.max(minYear, maxYear);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [minYear, maxYear]);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const { year, month, day } = internalState;

  const getDaysInMonth = (y, m) => {
    if (!y || !m) return 31;
    const yi = parseInt(y, 10);
    const mi = parseInt(m, 10);
    if (Number.isNaN(yi) || Number.isNaN(mi)) return 31;
    return new Date(yi, mi, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleChange = (field, newValue) => {
    let newYear = year || '';
    let newMonth = month || '';
    let newDay = day || '';

    if (field === 'year') newYear = newValue;
    if (field === 'month') {
      newMonth = newValue;
      if (newDay) {
        const daysInNewMonth = new Date(
          parseInt(newYear || String(currentYear), 10),
          parseInt(newMonth, 10),
          0,
        ).getDate();
        if (parseInt(newDay, 10) > daysInNewMonth) {
          newDay = '';
        }
      }
    }
    if (field === 'day') newDay = newValue;

    setInternalState({ year: newYear, month: newMonth, day: newDay });

    if (newYear && newMonth && newDay) {
      const dateString = `${newYear}-${newMonth}-${String(newDay).padStart(2, '0')}`;
      onChange(dateString);
    } else if (!newYear && !newMonth && !newDay) {
      onChange('');
    }
  };

  const selClass = compact
    ? 'flex-1 min-w-0 py-1.5 px-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    : 'flex-1 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const dayClass = compact
    ? 'w-16 shrink-0 py-1.5 px-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    : 'w-20 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const yearClass = compact
    ? 'w-[4.5rem] shrink-0 py-1.5 px-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    : 'w-24 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold mb-1 text-gray-600">{label}</label>}
      <div className={`flex gap-2 ${compact ? 'flex-wrap' : ''}`}>
        <select
          value={month}
          onChange={(e) => handleChange('month', e.target.value)}
          className={selClass}
        >
          <option value="">Month</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => handleChange('day', e.target.value)}
          className={dayClass}
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => handleChange('year', e.target.value)}
          className={yearClass}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default DateDropdown;
