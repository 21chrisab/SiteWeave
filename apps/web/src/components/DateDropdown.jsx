import React, { useState, useEffect } from 'react';

function DateDropdown({ value, onChange, label, className = '' }) {
    // Internal state to track partial selections
    const [internalState, setInternalState] = useState(() => {
        if (!value) return { year: '', month: '', day: '' };
        const [year, month, day] = value.split('-');
        return { year: year || '', month: month || '', day: day || '' };
    });

    // Update internal state when value prop changes (but only if it's a complete date)
    useEffect(() => {
        if (value) {
            const [year, month, day] = value.split('-');
            if (year && month && day) {
                setInternalState({ year, month, day });
            }
        } else if (!internalState.year && !internalState.month && !internalState.day) {
            // Only reset if all are empty
            setInternalState({ year: '', month: '', day: '' });
        }
    }, [value]);

    // Generate date options (2026-2050 range)
    // Allow past dates but minimum year is 2026, maximum is 2050
    const minYear = 2026;
    const maxYear = 2050;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
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
        { value: '12', label: 'December' }
    ];

    const { year, month, day } = internalState;

    // Calculate days in month
    const getDaysInMonth = (year, month) => {
        if (!year || !month) return 31;
        return new Date(year, month, 0).getDate();
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
            // When month changes, validate day (in case it's now invalid for the new month)
            if (newDay) {
                const daysInNewMonth = new Date(newYear || 2000, parseInt(newMonth) || 1, 0).getDate();
                if (parseInt(newDay) > daysInNewMonth) {
                    newDay = ''; // Clear invalid day
                }
            }
        }
        if (field === 'day') newDay = newValue;

        // Update internal state immediately so dropdowns reflect the change
        setInternalState({ year: newYear, month: newMonth, day: newDay });

        // Only call onChange when all fields are filled with a complete date
        if (newYear && newMonth && newDay) {
            const dateString = `${newYear}-${newMonth}-${newDay.toString().padStart(2, '0')}`;
            onChange(dateString);
        } else if (!newYear && !newMonth && !newDay) {
            // Only clear if all fields are empty
            onChange('');
        }
        // Otherwise, keep the current value but update internal state
    };

    return (
        <div className={className}>
            {label && <label className="block text-sm font-semibold mb-1 text-gray-600">{label}</label>}
            <div className="flex gap-2">
                <select
                    value={month}
                    onChange={(e) => handleChange('month', e.target.value)}
                    className="flex-1 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Month</option>
                    {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <select
                    value={day}
                    onChange={(e) => handleChange('day', e.target.value)}
                    className="w-20 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Day</option>
                    {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
                <select
                    value={year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    className="w-24 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Year</option>
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default DateDropdown;

