import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';
import { parseRecurrence, validateRecurrence } from '../utils/recurrenceService';
import { getStoredCalendarToken } from '../utils/calendarIntegration';

const DEFAULT_CATEGORIES = [
    { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
    { id: 'work', name: 'Work', color: '#F59E0B' },
    { id: 'personal', name: 'Personal', color: '#10B981' },
    { id: 'deadline', name: 'Deadline', color: '#EF4444' },
    { id: 'other', name: 'Other', color: '#8B5CF6' }
];

// Generate time options for dropdown (15-minute intervals)
const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            options.push({ value: timeString, label: displayTime });
        }
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

function EventModal({ onClose, onSave, onDelete, event = null, date, isLoading = false }) {
    const { state } = useAppContext();
    const isEditMode = !!event;
    
    // Parse initial times
    const getInitialDateTime = (timeString, defaultDate) => {
        // Always provide a fallback date if none is provided
        const fallbackDate = defaultDate || new Date();
        const dt = timeString ? new Date(timeString) : fallbackDate;
        const dateStr = dt.toISOString().substring(0, 10);
        const timeStr = dt.toTimeString().substring(0, 5);
        return { date: dateStr, time: timeStr };
    };
    
    const initialStart = getInitialDateTime(event?.start_time, date);
    const initialEnd = getInitialDateTime(
        event?.end_time, 
        date ? new Date(date.getTime() + 60*60*1000) : (event?.start_time ? new Date(new Date(event.start_time).getTime() + 60*60*1000) : new Date())
    );
    
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [projectId, setProjectId] = useState(event?.project_id || '');
    const [category, setCategory] = useState(event?.category || 'meeting');
    const [startDate, setStartDate] = useState(initialStart.date || new Date().toISOString().substring(0, 10));
    const [startTime, setStartTime] = useState(initialStart.time || '09:00');
    const [endDate, setEndDate] = useState(initialEnd.date || new Date().toISOString().substring(0, 10));
    const [endTime, setEndTime] = useState(initialEnd.time || '10:00');
    const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
    const [location, setLocation] = useState(event?.location || '');
    const [attendeeEmails, setAttendeeEmails] = useState(() => {
        if (event?.attendees) {
            return event.attendees.split(',').map(e => e.trim()).filter(Boolean);
        }
        return [];
    });
    const [attendeeInput, setAttendeeInput] = useState('');
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    
    // Recurrence state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrencePattern, setRecurrencePattern] = useState('weekly');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState([1, 3, 5]); // Mon, Wed, Fri
    const [recurrenceEndType, setRecurrenceEndType] = useState('never');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(10);
    
    // Sync options
    const [syncToGoogle, setSyncToGoogle] = useState(false);
    const [syncToOutlook, setSyncToOutlook] = useState(false);
    
    // Progressive disclosure - show/hide optional sections
    // Show by default if editing and event has optional fields filled
    const [showOptionalFields, setShowOptionalFields] = useState(() => {
        if (event) {
            return !!(event.project_id || event.location || event.description || event.recurrence);
        }
        return false;
    });
    
    useEffect(() => {
        loadCategories();
        
        // Update date/time fields when event changes
        if (event) {
            const start = getInitialDateTime(event.start_time, null);
            const end = getInitialDateTime(event.end_time, null);
            setStartDate(start.date);
            setStartTime(start.time);
            setEndDate(end.date);
            setEndTime(end.time);
            
            // Update attendees
            if (event.attendees) {
                setAttendeeEmails(event.attendees.split(',').map(e => e.trim()).filter(Boolean));
            } else {
                setAttendeeEmails([]);
            }
            
            // Show optional fields if event has optional data
            if (event.project_id || event.location || event.description || event.recurrence) {
                setShowOptionalFields(true);
            }
        } else if (date) {
            // New event with date
            const start = getInitialDateTime(null, date);
            const end = getInitialDateTime(null, new Date(date.getTime() + 60*60*1000));
            setStartDate(start.date);
            setStartTime(start.time);
            setEndDate(end.date);
            setEndTime(end.time);
            setShowOptionalFields(false);
        }
        
        // Load recurrence if editing
        if (event?.recurrence) {
            const recurrence = parseRecurrence(event.recurrence);
            if (recurrence) {
                setIsRecurring(true);
                setRecurrencePattern(recurrence.pattern || 'weekly');
                setRecurrenceInterval(recurrence.interval || 1);
                setRecurrenceDaysOfWeek(recurrence.daysOfWeek || [1, 3, 5]);
                setRecurrenceEndType(recurrence.endType || 'never');
                setRecurrenceEndDate(recurrence.endDate || '');
                setRecurrenceOccurrences(recurrence.occurrences || 10);
            }
        } else {
            setIsRecurring(false);
        }
        
        // Check if user has connected calendars
        const googleToken = getStoredCalendarToken('google');
        const outlookToken = getStoredCalendarToken('outlook');
        setSyncToGoogle(!!googleToken);
        setSyncToOutlook(!!outlookToken);
        
        // If editing, check if event is already synced
        if (event?.external_source) {
            if (event.external_source === 'google') {
                setSyncToGoogle(true);
            } else if (event.external_source === 'outlook') {
                setSyncToOutlook(true);
            }
        }
    }, [event, date]);

    const loadCategories = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('event_categories')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error loading categories:', error);
                setCategories(DEFAULT_CATEGORIES);
            } else {
                const loadedCategories = data.length > 0 ? data : DEFAULT_CATEGORIES;
                setCategories(loadedCategories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            setCategories(DEFAULT_CATEGORIES);
        }
    };
    
    // Helper functions for attendees
    const availableContacts = useMemo(() => {
        return state.contacts.filter(c => c.email && !attendeeEmails.includes(c.email.toLowerCase()));
    }, [state.contacts, attendeeEmails]);

    const addAttendeeFromContact = (contact) => {
        if (contact.email && !attendeeEmails.includes(contact.email.toLowerCase())) {
            setAttendeeEmails([...attendeeEmails, contact.email.toLowerCase()]);
        }
    };

    const addAttendeesFromInput = () => {
        const parts = attendeeInput
            .split(/[\s,;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e.includes('@') && !attendeeEmails.includes(e));
        if (parts.length > 0) {
            setAttendeeEmails([...attendeeEmails, ...parts]);
            setAttendeeInput('');
        }
    };

    const removeAttendee = (email) => {
        setAttendeeEmails(attendeeEmails.filter(e => e !== email));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Build recurrence JSON if recurring
        let recurrenceJson = null;
        if (isRecurring) {
            const recurrence = {
                pattern: recurrencePattern,
                interval: recurrenceInterval,
                daysOfWeek: recurrencePattern === 'weekly' ? recurrenceDaysOfWeek : undefined,
                endType: recurrenceEndType,
                endDate: recurrenceEndType === 'until' ? recurrenceEndDate : undefined,
                occurrences: recurrenceEndType === 'after' ? recurrenceOccurrences : undefined
            };
            
            const validation = validateRecurrence(recurrence);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }
            
            recurrenceJson = JSON.stringify(recurrence);
        }
        
        // Ensure dates are set (fallback to today if empty)
        const finalStartDate = startDate || new Date().toISOString().substring(0, 10);
        const finalEndDate = endDate || finalStartDate;
        const finalStartTime = startTime || '09:00';
        const finalEndTime = endTime || '10:00';
        
        // Combine date and time for start/end, ensuring proper ISO format
        let startDateTime, endDateTime;
        try {
            let startDateObj, endDateObj;
            if (isAllDay) {
                // For all-day events, use start of day and end of day
                startDateObj = new Date(`${finalStartDate}T00:00:00`);
                endDateObj = new Date(`${finalEndDate}T23:59:59`);
            } else {
                // For timed events, combine date and time
                startDateObj = new Date(`${finalStartDate}T${finalStartTime}:00`);
                endDateObj = new Date(`${finalEndDate}T${finalEndTime}:00`);
            }
            
            // Validate the dates are valid
            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                alert('Invalid date/time format. Please check your dates and times.');
                return;
            }
            
            // Convert to ISO string format
            startDateTime = startDateObj.toISOString();
            endDateTime = endDateObj.toISOString();
        } catch (e) {
            alert('Invalid date/time format. Please check your dates and times.');
            return;
        }
        
        const eventData = {
            title,
            description,
            project_id: projectId || null,
            category,
            start_time: startDateTime,
            end_time: endDateTime,
            is_all_day: isAllDay,
            location,
            attendees: attendeeEmails.join(', '),
            recurrence: recurrenceJson,
            user_id: state.user?.id,
            // Include sync preferences
            sync_to_google: syncToGoogle,
            sync_to_outlook: syncToOutlook
        };
        
        if (isEditMode) {
            eventData.id = event.id;
            // Preserve external IDs if already synced
            if (event.external_id) {
                eventData.external_id = event.external_id;
            }
            if (event.external_source) {
                eventData.external_source = event.external_source;
            }
        }
        
        onSave(eventData);
    };

    const handleDelete = () => {
        if (onDelete && event) {
            onDelete(event.id);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {isEditMode ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    {isEditMode && onDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Essential Fields Only */}
                    <div className="space-y-4">
                        {/* Event Title */}
                        <div>
                            <label className="block text-xs font-semibold mb-1">Event Title *</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                required 
                            />
                        </div>
                        
                        {/* Attendees - Moved to Essential Section */}
                        <div>
                            <label className="block text-xs font-semibold mb-1">Attendees</label>
                            <div className="space-y-2">
                                <div className="flex gap-1.5">
                                    <input 
                                        type="text" 
                                        value={attendeeInput} 
                                        onChange={e => setAttendeeInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAttendeesFromInput())}
                                        className="flex-1 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter email or select contact"
                                    />
                                    <button 
                                        type="button"
                                        onClick={addAttendeesFromInput}
                                        className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                                    >
                                        Add
                                    </button>
                                </div>
                                
                                {availableContacts.length > 0 && (
                                    <select 
                                        onChange={e => {
                                            const contact = availableContacts.find(c => c.id === e.target.value);
                                            if (contact) addAttendeeFromContact(contact);
                                            e.target.value = '';
                                        }}
                                        className="w-full p-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select from contacts...</option>
                                        {availableContacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.name} ({contact.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                                
                                {attendeeEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {attendeeEmails.map(email => (
                                            <span 
                                                key={email}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                            >
                                                {email}
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttendee(email)}
                                                    className="text-blue-700 hover:text-blue-900"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date and Time - Horizontal Layout */}
                    <div className="pt-3 border-t">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Date Input with Calendar Icon */}
                            <div className="relative flex-1 min-w-[140px]">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    className="w-full p-2 pr-8 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                <Icon 
                                    path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                />
                            </div>
                            
                            {/* Start Time Dropdown */}
                            {!isAllDay && (
                                <>
                                    <div className="relative flex-1 min-w-[120px]">
                                        <select 
                                            value={startTime} 
                                            onChange={e => setStartTime(e.target.value)} 
                                            className="w-full p-2 pr-8 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        >
                                            {TIME_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Icon 
                                            path="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                        />
                                    </div>
                                    
                                    {/* "to" Label */}
                                    <span className="text-sm text-gray-600">to</span>
                                    
                                    {/* End Time Dropdown */}
                                    <div className="relative flex-1 min-w-[120px]">
                                        <select 
                                            value={endTime} 
                                            onChange={e => setEndTime(e.target.value)} 
                                            className="w-full p-2 pr-8 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        >
                                            {TIME_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Icon 
                                            path="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {/* All Day Toggle Switch - Inline with date/time */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">All day</span>
                                <button
                                    type="button"
                                    onClick={() => setIsAllDay(!isAllDay)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        isAllDay ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            isAllDay ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            
                            {/* Make Recurring Link */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRecurring(!isRecurring);
                                    if (!isRecurring && !showOptionalFields) {
                                        setShowOptionalFields(true);
                                    }
                                }}
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <Icon 
                                    path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                                    className="w-4 h-4"
                                />
                                <span>Make recurring</span>
                            </button>
                        </div>
                    </div>

                    {/* More Options Toggle */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowOptionalFields(!showOptionalFields)}
                            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <span>{showOptionalFields ? '▼' : '▶'}</span>
                            <span>{showOptionalFields ? 'Hide' : 'Show'} Additional Options</span>
                        </button>
                    </div>

                    {/* Optional Fields - Progressive Disclosure */}
                    {showOptionalFields && (
                        <div className="space-y-4 pt-3 border-t">
                            {/* Project */}
                            <div>
                                <label className="block text-xs font-semibold mb-1">Project (Optional)</label>
                                <select 
                                    value={projectId} 
                                    onChange={e => setProjectId(e.target.value)} 
                                    className="w-full p-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">None</option>
                                    {state.projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Recurrence Section */}
                            <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="isRecurring" 
                                checked={isRecurring} 
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isRecurring" className="text-xs font-semibold">Repeat</label>
                        </div>

                        {isRecurring && (
                            <div className="ml-6 space-y-3 bg-gray-50 p-3 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Pattern</label>
                                        <select 
                                            value={recurrencePattern} 
                                            onChange={e => setRecurrencePattern(e.target.value)}
                                            className="w-full p-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Repeat Every</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceInterval} 
                                                onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                className="w-16 p-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-600">
                                                {recurrencePattern === 'daily' ? 'day(s)' : 
                                                 recurrencePattern === 'weekly' ? 'week(s)' :
                                                 recurrencePattern === 'monthly' ? 'month(s)' :
                                                 recurrencePattern === 'yearly' ? 'year(s)' : 'time(s)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {recurrencePattern === 'weekly' && (
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5">Days of Week</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { value: 0, label: 'Sun' },
                                                { value: 1, label: 'Mon' },
                                                { value: 2, label: 'Tue' },
                                                { value: 3, label: 'Wed' },
                                                { value: 4, label: 'Thu' },
                                                { value: 5, label: 'Fri' },
                                                { value: 6, label: 'Sat' }
                                            ].map(day => (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => {
                                                        if (recurrenceDaysOfWeek.includes(day.value)) {
                                                            setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== day.value));
                                                        } else {
                                                            setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day.value].sort());
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                        recurrenceDaysOfWeek.includes(day.value)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold mb-1">End</label>
                                    <select 
                                        value={recurrenceEndType} 
                                        onChange={e => setRecurrenceEndType(e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 mb-2"
                                    >
                                        <option value="never">Never</option>
                                        <option value="until">Until date</option>
                                        <option value="after">After N occurrences</option>
                                    </select>

                                    {recurrenceEndType === 'until' && (
                                        <input 
                                            type="date" 
                                            value={recurrenceEndDate} 
                                            onChange={e => setRecurrenceEndDate(e.target.value)}
                                            className="w-full p-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    )}

                                    {recurrenceEndType === 'after' && (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceOccurrences} 
                                                onChange={e => setRecurrenceOccurrences(parseInt(e.target.value) || 1)}
                                                className="w-20 p-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                            <span className="text-xs text-gray-600">occurrences</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                            {/* Location and Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold mb-1">Location</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Meeting room, address, etc."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold mb-1">Description</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-16"
                                placeholder="Add event details..."
                            />
                        </div>
                    </div>

                            {/* Calendar Sync Section */}
                            <div className="space-y-2 pt-3 border-t">
                        <label className="block text-xs font-semibold mb-1.5">Sync to External Calendars</label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="syncToGoogle" 
                                    checked={syncToGoogle} 
                                    onChange={e => setSyncToGoogle(e.target.checked)}
                                    disabled={!getStoredCalendarToken('google')}
                                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <label htmlFor="syncToGoogle" className={`text-xs ${!getStoredCalendarToken('google') ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Sync to Google Calendar
                                    {!getStoredCalendarToken('google') && (
                                        <span className="ml-1 text-xs text-gray-400">(Import first)</span>
                                    )}
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="syncToOutlook" 
                                    checked={syncToOutlook} 
                                    onChange={e => setSyncToOutlook(e.target.checked)}
                                    disabled={!getStoredCalendarToken('outlook')}
                                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <label htmlFor="syncToOutlook" className={`text-xs ${!getStoredCalendarToken('outlook') ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Sync to Outlook Calendar
                                    {!getStoredCalendarToken('outlook') && (
                                        <span className="ml-1 text-xs text-gray-400">(Import first)</span>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                    
                            {/* Category - Moved to Bottom of Optional Section */}
                            <div className="pt-3 border-t">
                                <label className="block text-xs font-semibold mb-1">Category</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                                                category === cat.id 
                                                    ? 'border-gray-400 bg-gray-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div 
                                                className="w-3 h-3 rounded-full border border-gray-300"
                                                style={{ backgroundColor: cat.color }}
                                            ></div>
                                            <span className="text-xs font-medium">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-3 border-t">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isLoading} 
                            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    {isEditMode ? 'Updating...' : 'Saving...'}
                                </>
                            ) : (
                                isEditMode ? 'Update Event' : 'Save Event'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EventModal;
