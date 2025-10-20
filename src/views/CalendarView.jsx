import React, { useState, useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { parseOAuthCallback, clearOAuthParams, handleGoogleCalendarCallback, handleOutlookCalendarCallback } from '../utils/calendarIntegration';
import EventModal from '../components/EventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import CalendarImportModal from '../components/CalendarImportModal';
import CategoryColorManager from '../components/CategoryColorManager';

// --- Mini Calendar Component (Sidebar) ---
function MiniCalendar({ currentDate, setCurrentDate }) {
    const today = new Date();

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        let days = [];
        // Add days from previous month to fill the first week
        for (let i = firstDayOfMonth.getDay(); i > 0; i--) {
            days.push(new Date(year, month, 1 - i));
        }
        // Add days of the current month
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        // Add days from next month to fill the grid
        while (days.length < 42) { // Ensure 6 rows
            const lastDay = days[days.length - 1];
            days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
        }
        return days;
    };

    const days = getDaysInMonth(currentDate);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100">&lt;</button>
                <span className="font-semibold text-sm">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`day-${index}`}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 text-center text-sm">
                {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isSelected = day.toDateString() === currentDate.toDateString();
                    return (
                        <button 
                            key={index} 
                            onClick={() => setCurrentDate(day)}
                            className={`py-1 rounded-full ${isCurrentMonth ? 'text-gray-700' : 'text-gray-300'} ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


// --- Main Calendar View Component ---
function CalendarView() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
    const [isDeletingEvent, setIsDeletingEvent] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [showGoogleImportModal, setShowGoogleImportModal] = useState(false);
    const [showOutlookImportModal, setShowOutlookImportModal] = useState(false);
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const calendarRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [categories, setCategories] = useState([]);

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
                // Use default categories if table doesn't exist
                setCategories([
                    { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
                    { id: 'work', name: 'Work', color: '#F59E0B' },
                    { id: 'personal', name: 'Personal', color: '#10B981' },
                    { id: 'deadline', name: 'Deadline', color: '#EF4444' },
                    { id: 'other', name: 'Other', color: '#8B5CF6' }
                ]);
            } else {
                const loadedCategories = data.length > 0 ? data : [
                    { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
                    { id: 'work', name: 'Work', color: '#F59E0B' },
                    { id: 'personal', name: 'Personal', color: '#10B981' },
                    { id: 'deadline', name: 'Deadline', color: '#EF4444' },
                    { id: 'other', name: 'Other', color: '#8B5CF6' }
                ];
                setCategories(loadedCategories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            setCategories([
                { id: 'meeting', name: 'Meeting', color: '#3B82F6' },
                { id: 'work', name: 'Work', color: '#F59E0B' },
                { id: 'personal', name: 'Personal', color: '#10B981' },
                { id: 'deadline', name: 'Deadline', color: '#EF4444' },
                { id: 'other', name: 'Other', color: '#8B5CF6' }
            ]);
        }
    };

    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.gotoDate(currentDate);
        }
    }, [currentDate]);

    // Handle OAuth callbacks
    useEffect(() => {
        const { code, error } = parseOAuthCallback();
        
        if (error) {
            addToast(`OAuth error: ${error}`, 'error');
            clearOAuthParams();
            return;
        }

        if (code) {
            handleOAuthCallback(code);
        }
    }, []);

    const handleOAuthCallback = async (code) => {
        try {
            setIsImporting(true);
            let events = [];
            
            // Determine which service based on the current URL or stored state
            const state = localStorage.getItem('oauth_state');
            
            if (state === 'google') {
                events = await handleGoogleCalendarCallback(code);
            } else if (state === 'outlook') {
                events = await handleOutlookCalendarCallback(code);
            } else {
                throw new Error('Unknown OAuth provider');
            }

            if (events.length > 0) {
                // Save events to database
                const { data, error } = await supabaseClient
                    .from('calendar_events')
                    .insert(events)
                    .select();

                if (error) {
                    throw error;
                }

                // Add events to context
                data.forEach(event => {
                    dispatch({ type: 'ADD_EVENT', payload: event });
                });

                addToast(`Successfully imported ${data.length} events from ${state === 'google' ? 'Google' : 'Outlook'} Calendar!`, 'success');
            } else {
                addToast('No events found to import.', 'info');
            }

            // Clean up
            localStorage.removeItem('oauth_state');
            clearOAuthParams();
            
        } catch (error) {
            console.error('OAuth callback error:', error);
            addToast('Error importing calendar events: ' + error.message, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const events = useMemo(() => {
        // Create category color map from loaded categories
        const categoryColors = categories.reduce((acc, category) => {
            acc[category.id] = category.color;
            return acc;
        }, {});

        return state.calendarEvents.map(event => {
            // Use category color, fallback to 'other' if category not found
            let eventColor = categoryColors[event.category] || categoryColors.other || '#8B5CF6';
            
            // Fallback to title-based color detection if no category
            if (!event.category) {
                const title = event.title.toLowerCase();
                if (title.includes('meeting') || title.includes('standup') || title.includes('call') || title.includes('team')) {
                    eventColor = categoryColors.meeting || '#3B82F6';
                } else if (title.includes('deadline') || title.includes('due') || title.includes('urgent') || title.includes('review')) {
                    eventColor = categoryColors.deadline || '#EF4444';
                } else if (title.includes('personal') || title.includes('break') || title.includes('lunch') || title.includes('vacation')) {
                    eventColor = categoryColors.personal || '#10B981';
                } else if (title.includes('work') || title.includes('project') || title.includes('task') || title.includes('planning')) {
                    eventColor = categoryColors.work || '#F59E0B';
                }
            }

            return {
                id: event.id,
                title: event.title,
                start: event.start_time,
                end: event.end_time,
                backgroundColor: eventColor,
                borderColor: eventColor,
                allDay: event.is_all_day || false,
                className: `outlook-event`,
                extendedProps: {
                    project_id: event.project_id,
                    description: event.description,
                    category: event.category,
                    location: event.location,
                    attendees: event.attendees,
                    recurrence: event.recurrence,
                    color: eventColor
                }
            };
        });
    }, [state.calendarEvents, state.projects, categories]);

    const handleDateClick = (arg) => {
        setModalDate(arg.date);
        setEditingEvent(null);
        setShowModal(true);
    };

    const handleEventClick = (arg) => {
        const event = state.calendarEvents.find(e => e.id === arg.event.id);
        if (event) {
            setEditingEvent(event);
            setShowModal(true);
        }
    };

    const handleEventDrop = async (info) => {
        const eventId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end;
        
        try {
            const updateData = {
                start_time: newStart.toISOString(),
                end_time: newEnd ? newEnd.toISOString() : newStart.toISOString()
            };

            const { error } = await supabaseClient
                .from('calendar_events')
                .update(updateData)
                .eq('id', eventId);

            if (error) {
                throw error;
            }

            // Update local state
            const updatedEvent = state.calendarEvents.find(e => e.id === eventId);
            if (updatedEvent) {
                dispatch({ 
                    type: 'UPDATE_EVENT', 
                    payload: { 
                        ...updatedEvent, 
                        start_time: updateData.start_time,
                        end_time: updateData.end_time
                    } 
                });
            }

            addToast('Event moved successfully!', 'success');
        } catch (error) {
            addToast('Error moving event: ' + error.message, 'error');
            // Revert the change
            info.revert();
        }
    };

    const handleEventResize = async (info) => {
        const eventId = info.event.id;
        const newEnd = info.event.end;
        
        try {
            const updateData = {
                end_time: newEnd.toISOString()
            };

            const { error } = await supabaseClient
                .from('calendar_events')
                .update(updateData)
                .eq('id', eventId);

            if (error) {
                throw error;
            }

            // Update local state
            const updatedEvent = state.calendarEvents.find(e => e.id === eventId);
            if (updatedEvent) {
                dispatch({ 
                    type: 'UPDATE_EVENT', 
                    payload: { 
                        ...updatedEvent, 
                        end_time: updateData.end_time
                    } 
                });
            }

            addToast('Event resized successfully!', 'success');
        } catch (error) {
            addToast('Error resizing event: ' + error.message, 'error');
            // Revert the change
            info.revert();
        }
    };

    const handleSaveEvent = async (eventData) => {
        if (editingEvent) {
            setIsUpdatingEvent(true);
            const { error } = await supabaseClient
                .from('calendar_events')
                .update(eventData)
                .eq('id', eventData.id);
            
            if (error) {
                addToast("Error updating event: " + error.message, 'error');
            } else {
                addToast('Event updated successfully!', 'success');
                dispatch({ type: 'UPDATE_EVENT', payload: { ...eventData, id: editingEvent.id } });
                setShowModal(false);
                setEditingEvent(null);
            }
            setIsUpdatingEvent(false);
        } else {
            setIsCreatingEvent(true);
            const { data, error } = await supabaseClient
                .from('calendar_events')
                .insert(eventData)
                .select()
                .single();
            
            if (error) {
                addToast("Error saving event: " + error.message, 'error');
            } else {
                addToast('Event saved successfully!', 'success');
                dispatch({ type: 'ADD_EVENT', payload: data });
                setShowModal(false);
            }
            setIsCreatingEvent(false);
        }
    };

    const handleDeleteEvent = (eventId) => {
        const event = state.calendarEvents.find(e => e.id === eventId);
        if (event) {
            setEventToDelete(event);
            setShowDeleteConfirm(true);
        }
    };

    const confirmDeleteEvent = async () => {
        if (!eventToDelete) return;
        
        setIsDeletingEvent(true);
        const { error } = await supabaseClient
            .from('calendar_events')
            .delete()
            .eq('id', eventToDelete.id);
        
        if (error) {
            addToast("Error deleting event: " + error.message, 'error');
        } else {
            addToast('Event deleted successfully!', 'success');
            dispatch({ type: 'DELETE_EVENT', payload: eventToDelete.id });
            setShowModal(false);
            setEditingEvent(null);
        }
        
        setIsDeletingEvent(false);
        setShowDeleteConfirm(false);
        setEventToDelete(null);
    };

    const handleViewChange = (view) => {
        setCurrentView(view);
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.changeView(view);
        }
    };


    return (
        <>
            <div className="flex h-full gap-8">
                {/* Left Sidebar */}
                <aside className="w-64 flex-shrink-0">
                    <MiniCalendar currentDate={currentDate} setCurrentDate={setCurrentDate} />
                    
                    {/* Calendar Actions */}
                    <div className="mt-6 space-y-3" data-onboarding="calendar-nav">
                        <button
                            onClick={() => setShowGoogleImportModal(true)}
                            className="w-full px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Import from Google Calendar
                        </button>
                        <button
                            onClick={() => setShowOutlookImportModal(true)}
                            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Import from Outlook Calendar
                        </button>
                    </div>

                    <div className="mt-6" data-onboarding="calendar-events">
                        <h3 className="text-sm font-semibold text-gray-500 mb-2">My Calendars</h3>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                            Calendar
                        </label>
                    </div>

                    {/* Color Legend */}
                    <div className="mt-6" data-onboarding="calendar-legend">
                        <h3 className="text-sm font-semibold text-gray-500 mb-3">Event Categories</h3>
                        <div className="space-y-2">
                            {categories.map(category => (
                                <div key={category.id} className="flex items-center gap-2 text-xs">
                                    <div 
                                        className="w-3 h-3 rounded" 
                                        style={{backgroundColor: category.color}}
                                    ></div>
                                    <span className="text-gray-600">{category.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Calendar */}
                <main 
                    data-onboarding="calendar-container"
                    className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                    {/* Outlook-style Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        + New Event
                                    </button>
                                    <button
                                        onClick={() => setShowCategoryManager(true)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                    >
                                        Manage Categories
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                    <button 
                                        onClick={() => handleViewChange('timeGridDay')}
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                            currentView === 'timeGridDay' 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-700 hover:bg-white hover:text-gray-900'
                                        }`}
                                    >
                                        Day
                                    </button>
                                    <button 
                                        onClick={() => handleViewChange('timeGridWeek')}
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                            currentView === 'timeGridWeek' 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-700 hover:bg-white hover:text-gray-900'
                                        }`}
                                    >
                                        Week
                                    </button>
                                    <button 
                                        onClick={() => handleViewChange('dayGridMonth')}
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                            currentView === 'dayGridMonth' 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-700 hover:bg-white hover:text-gray-900'
                                        }`}
                                    >
                                        Month
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Content */}
                    <div className="h-full" data-onboarding="add-event-btn">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView={currentView}
                            headerToolbar={false}
                            events={events}
                            dateClick={handleDateClick}
                            eventClick={handleEventClick}
                            eventDrop={handleEventDrop}
                            eventResize={handleEventResize}
                            editable={true}
                            selectable={true}
                            height="calc(100vh - 200px)"
                            allDaySlot={true}
                            slotMinTime="06:00:00"
                            slotMaxTime="22:00:00"
                            eventDisplay="block"
                            eventTextColor="white"
                            dayHeaderFormat={{ weekday: 'short', month: 'short', day: 'numeric' }}
                            slotLabelFormat={{
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }}
                            eventTimeFormat={{
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }}
                            nowIndicator={true}
                            scrollTime="08:00:00"
                            businessHours={{
                                daysOfWeek: [1, 2, 3, 4, 5],
                                startTime: '09:00',
                                endTime: '17:00'
                            }}
                            eventClassNames="outlook-event"
                            dayCellClassNames="outlook-day"
                        />
                    </div>
                </main>
            </div>

            {/* Event Modal */}
            {showModal && (
                <EventModal 
                    onClose={() => {
                        setShowModal(false);
                        setEditingEvent(null);
                    }} 
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    event={editingEvent}
                    date={modalDate} 
                    isLoading={isCreatingEvent || isUpdatingEvent} 
                />
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setEventToDelete(null);
                    }}
                    onConfirm={confirmDeleteEvent}
                    title="Delete Event"
                    message={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
                    confirmText="Delete"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    isLoading={isDeletingEvent}
                />
            )}

            {/* Google Import Modal */}
            {showGoogleImportModal && (
                <CalendarImportModal 
                    onClose={() => setShowGoogleImportModal(false)} 
                    importType="google"
                />
            )}

            {/* Outlook Import Modal */}
            {showOutlookImportModal && (
                <CalendarImportModal 
                    onClose={() => setShowOutlookImportModal(false)} 
                    importType="outlook"
                />
            )}

            {/* Category Color Manager */}
            {showCategoryManager && (
                <CategoryColorManager 
                    isOpen={showCategoryManager}
                    onClose={() => setShowCategoryManager(false)}
                />
            )}
        </>
    );
}

export default CalendarView;