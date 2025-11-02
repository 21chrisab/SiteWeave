import React from 'react';

function DateDropdown({ value, onChange, label, className = '' }) {
    // Generate date options (50 years range)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear + i);
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

    // Parse the current value (YYYY-MM-DD format)
    const parseDate = (dateString) => {
        if (!dateString) return { year: '', month: '', day: '' };
        const [year, month, day] = dateString.split('-');
        return { year, month, day };
    };

    const { year, month, day } = parseDate(value);

    // Calculate days in month
    const getDaysInMonth = (year, month) => {
        if (!year || !month) return 31;
        return new Date(year, month, 0).getDate();
    };

    const daysInMonth = getDaysInMonth(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleChange = (field, newValue) => {
        let newYear = year;
        let newMonth = month;
        let newDay = day;

        if (field === 'year') newYear = newValue;
        if (field === 'month') newMonth = newValue;
        if (field === 'day') newDay = newValue;

        // If all fields are filled, construct the date string
        if (newYear && newMonth && newDay) {
            const dateString = `${newYear}-${newMonth}-${newDay.toString().padStart(2, '0')}`;
            onChange(dateString);
        } else {
            // Otherwise keep partial state
            onChange('');
        }
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

