import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';
import DateDropdown from './DateDropdown';

function ProjectModal({ onClose, onSave, isLoading = false, project = null }) {
    const { state } = useAppContext();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [project_type, setProjectType] = useState('Residential');
    const [status, setStatus] = useState('Planning');
    const [due_date, setDueDate] = useState('');
    const [next_milestone, setNextMilestone] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);

    const isEditMode = !!project;
    
    // Get all team members
    const teamMembers = state.contacts.filter(c => c.type === 'Team');

    useEffect(() => {
        if (project) {
            setName(project.name || '');
            setAddress(project.address || '');
            setProjectType(project.project_type || 'Residential');
            setStatus(project.status || 'Planning');
            setDueDate(project.due_date || '');
            setNextMilestone(project.next_milestone || '');
        }
    }, [project]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const projectData = {
            name,
            address,
            project_type,
            status,
            due_date: due_date || null,
            next_milestone: next_milestone || null,
            selectedContacts: isEditMode ? [] : selectedContacts
        };
        
        if (isEditMode) {
            projectData.id = project.id;
        }
        
        onSave(projectData);
    };

    const toggleContact = (contactId) => {
        setSelectedContacts(prev => 
            prev.includes(contactId) 
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Project' : 'Create New Project'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Project Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Project Type</label>
                        <select value={project_type} onChange={e => setProjectType(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                            <option value="Residential">Residential</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Infrastructure">Infrastructure</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                            <option value="Planning">Planning</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Completed">Completed</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Status color will be automatically determined</p>
                    </div>
                    <DateDropdown 
                        value={due_date} 
                        onChange={setDueDate} 
                        label="Due Date"
                        className="mb-4"
                    />
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Next Milestone</label>
                        <input type="text" value={next_milestone} onChange={e => setNextMilestone(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="e.g., Foundation Complete" />
                    </div>
                    
                    {!isEditMode && teamMembers.length > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-2 text-gray-600">Add Team Members (Optional)</label>
                            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                                {teamMembers.map(contact => (
                                    <label key={contact.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedContacts.includes(contact.id)}
                                            onChange={() => toggleContact(contact.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex items-center gap-2 flex-1">
                                            <img 
                                                src={contact.avatar_url} 
                                                alt={contact.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                                <div className="text-xs text-gray-500">{contact.role}</div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {selectedContacts.length > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                    {selectedContacts.length} team member{selectedContacts.length > 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    {isEditMode ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                isEditMode ? 'Update Project' : 'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProjectModal;