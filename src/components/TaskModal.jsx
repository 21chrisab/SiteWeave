import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';

function TaskModal({ project, onClose, onSave, isLoading = false }) {
    const { state } = useAppContext();
    const [text, setText] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [assigneeId, setAssigneeId] = useState('');

    const projectContacts = state.contacts.filter(contact =>
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project.id)
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            project_id: project.id,
            text,
            due_date: dueDate || null,
            priority,
            assignee_id: assigneeId || null,
            completed: false,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Create New Task for {project.name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Task Description</label>
                        <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded-lg" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Due Date</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Assignee</label>
                        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                            <option value="">Unassigned</option>
                            {projectContacts.map(contact => (
                                <option key={contact.id} value={contact.id}>{contact.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    Adding...
                                </>
                            ) : (
                                'Add Task'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TaskModal;