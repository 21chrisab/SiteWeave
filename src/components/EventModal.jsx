import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';
import { parseRecurrence, validateRecurrence } from '../utils/recurrenceService';
import { getStoredCalendarToken } from '../utils/calendarIntegration';

const DEFAULT_CATEGORIES = [
    { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
    { id: 'work', name: 'Work', color: '#F59E0B' },
    { id: 'personal', name: 'Personal', color: '#10B981' },
    { id: 'deadline', name: 'Deadline', color: '#EF4444' },
    { id: 'other', name: 'Other', color: '#8B5CF6' }
];

function EventModal({ onClose, onSave, onDelete, event = null, date, isLoading = false }) {
    const { state } = useAppContext();
    const isEditMode = !!event;
    
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [projectId, setProjectId] = useState(event?.project_id || '');
    const [category, setCategory] = useState(event?.category || 'meeting');
    const [startTime, setStartTime] = useState(
        event?.start_time ? event.start_time.substring(0, 16) : 
        date ? date.toISOString().substring(0, 16) : ''
    );
    const [endTime, setEndTime] = useState(
        event?.end_time ? event.end_time.substring(0, 16) : 
        date ? new Date(date.getTime() + 60*60*1000).toISOString().substring(0, 16) : ''
    );
    const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
    const [location, setLocation] = useState(event?.location || '');
    const [attendees, setAttendees] = useState(event?.attendees || '');
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
    
    useEffect(() => {
        loadCategories();
        
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
    }, [event]);

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
        
        const eventData = {
            title,
            description,
            project_id: projectId || null,
            category,
            start_time: startTime,
            end_time: endTime,
            is_all_day: isAllDay,
            location,
            attendees,
            recurrence: recurrenceJson,
            user_id: state.user?.id,
            // Include sync preferences
            sync_enabled: syncToGoogle || syncToOutlook,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {isEditMode ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    {isEditMode && onDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold mb-1">Event Title *</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                required 
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold mb-1">Description</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                                placeholder="Add event details..."
                            />
                        </div>
                    </div>

                    {/* Category and Project */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Project (Optional)</label>
                            <select 
                                value={projectId} 
                                onChange={e => setProjectId(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">None</option>
                                {state.projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold mb-1">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                        category === cat.id 
                                            ? 'border-gray-400 bg-gray-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div 
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: cat.color }}
                                    ></div>
                                    <span className="text-sm font-medium">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="allDay" 
                                checked={isAllDay} 
                                onChange={e => setIsAllDay(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="allDay" className="text-sm font-semibold">All Day Event</label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">
                                    {isAllDay ? 'Start Date' : 'Start Time'}
                                </label>
                                <input 
                                    type={isAllDay ? "date" : "datetime-local"} 
                                    value={isAllDay ? startTime.substring(0, 10) : startTime} 
                                    onChange={e => setStartTime(e.target.value + (isAllDay ? 'T09:00' : ''))} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">
                                    {isAllDay ? 'End Date' : 'End Time'}
                                </label>
                                <input 
                                    type={isAllDay ? "date" : "datetime-local"} 
                                    value={isAllDay ? endTime.substring(0, 10) : endTime} 
                                    onChange={e => setEndTime(e.target.value + (isAllDay ? 'T17:00' : ''))} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="isRecurring" 
                                checked={isRecurring} 
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isRecurring" className="text-sm font-semibold">Repeat</label>
                        </div>

                        {isRecurring && (
                            <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Pattern</label>
                                        <select 
                                            value={recurrencePattern} 
                                            onChange={e => setRecurrencePattern(e.target.value)}
                                            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Repeat Every</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={recurrenceInterval} 
                                                onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-600">
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
                                        <label className="block text-sm font-semibold mb-2">Days of Week</label>
                                        <div className="flex flex-wrap gap-2">
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
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
                                    <label className="block text-sm font-semibold mb-1">End</label>
                                    <select 
                                        value={recurrenceEndType} 
                                        onChange={e => setRecurrenceEndType(e.target.value)}
                                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 mb-2"
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
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                                className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                            <span className="text-sm text-gray-600">occurrences</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Calendar Sync Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <label className="block text-sm font-semibold mb-2">Sync to External Calendars</label>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="syncToGoogle" 
                                    checked={syncToGoogle} 
                                    onChange={e => setSyncToGoogle(e.target.checked)}
                                    disabled={!getStoredCalendarToken('google')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <label htmlFor="syncToGoogle" className={`text-sm ${!getStoredCalendarToken('google') ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Sync to Google Calendar
                                    {!getStoredCalendarToken('google') && (
                                        <span className="ml-1 text-xs text-gray-400">(Import from Google first)</span>
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
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <label htmlFor="syncToOutlook" className={`text-sm ${!getStoredCalendarToken('outlook') ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Sync to Outlook Calendar
                                    {!getStoredCalendarToken('outlook') && (
                                        <span className="ml-1 text-xs text-gray-400">(Import from Outlook first)</span>
                                    )}
                                </label>
                            </div>
                            {(!getStoredCalendarToken('google') && !getStoredCalendarToken('outlook')) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Import events from Google or Outlook Calendar first to enable syncing.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Location</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Meeting room, address, etc."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Attendees</label>
                            <input 
                                type="text" 
                                value={attendees} 
                                onChange={e => setAttendees(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Email addresses separated by commas"
                            />
                        </div>
                    </div>


                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isLoading} 
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
