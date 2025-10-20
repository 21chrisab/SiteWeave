import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';

const DEFAULT_CATEGORIES = [
    { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
    { id: 'work', name: 'Work', color: '#F59E0B' },
    { id: 'personal', name: 'Personal', color: '#10B981' },
    { id: 'deadline', name: 'Deadline', color: '#EF4444' },
    { id: 'other', name: 'Other', color: '#8B5CF6' }
];

// Recurrence functionality removed - not implemented in calendar view

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
    
    useEffect(() => {
        loadCategories();
    }, []);

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
            user_id: state.user?.id // Add user_id from context
        };
        
        if (isEditMode) {
            eventData.id = event.id;
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
                            <label className="block text-sm font-semibold mb-1">Category</label>
                            <select 
                                value={category} 
                                onChange={e => setCategory(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        
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
