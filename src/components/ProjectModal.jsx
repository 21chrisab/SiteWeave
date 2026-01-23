import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { duplicateProject } from '../utils/projectDuplicationService';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import DateDropdown from './DateDropdown';
import Avatar from './Avatar';
import PermissionGuard from './PermissionGuard';

function ProjectModal({ onClose, onSave, isLoading = false, project = null }) {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [project_number, setProjectNumber] = useState('');
    const [project_type, setProjectType] = useState('Residential');
    const [project_type_custom, setProjectTypeCustom] = useState('');
    const [status, setStatus] = useState('Planning');
    const [due_date, setDueDate] = useState('');
    const [next_milestone, setNextMilestone] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [emailInput, setEmailInput] = useState('');
    const [emailAddresses, setEmailAddresses] = useState([]);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [duplicateName, setDuplicateName] = useState('');
    const [duplicateStartDate, setDuplicateStartDate] = useState('');
    const [isDuplicating, setIsDuplicating] = useState(false);

    const isEditMode = !!project;
    
    // Get all team members
    const teamMembers = state.contacts.filter(c => c.type === 'Team');

    useEffect(() => {
        if (project) {
            setName(project.name || '');
            setAddress(project.address || '');
            setProjectNumber(project.project_number || '');
            const projectType = project.project_type || 'Residential';
            // Check if project_type is one of the predefined options
            const predefinedTypes = ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Multi-family'];
            if (predefinedTypes.includes(projectType)) {
                setProjectType(projectType);
                setProjectTypeCustom('');
            } else {
                setProjectType('Other');
                setProjectTypeCustom(projectType);
            }
            setStatus(project.status || 'Planning');
            setDueDate(project.due_date || '');
            setNextMilestone(project.next_milestone || '');
            
            // Load existing project contacts
            const existingContacts = state.contacts
                .filter(contact => 
                    contact.type === 'Team' && 
                    contact.project_contacts && 
                    contact.project_contacts.some(pc => pc.project_id === project.id)
                )
                .map(contact => contact.id);
            setSelectedContacts(existingContacts);
        } else {
            // Reset when creating new project
            setProjectNumber('');
            setProjectType('Residential');
            setProjectTypeCustom('');
            setSelectedContacts([]);
            setEmailAddresses([]);
        }
    }, [project, state.contacts]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Determine the final project_type value
        const finalProjectType = project_type === 'Other' ? project_type_custom : project_type;
        
        const projectData = {
            name,
            address,
            project_number: project_number || null,
            project_type: finalProjectType || null,
            status,
            due_date: due_date || null,
            next_milestone: next_milestone || null,
            selectedContacts: selectedContacts,
            emailAddresses: emailAddresses
        };
        
        if (isEditMode) {
            projectData.id = project.id;
        }
        
        onSave(projectData);
    };

    const handleAddEmails = () => {
        if (!emailInput.trim()) return;
        
        const emails = emailInput
            .split(/[\s,;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e.includes('@') && e.length > 0);
        
        const deduped = Array.from(new Set(emails));
        const newEmails = deduped.filter(
            email => !emailAddresses.includes(email) && 
            !teamMembers.some(contact => contact.email?.toLowerCase() === email)
        );
        
        if (newEmails.length > 0) {
            setEmailAddresses(prev => [...prev, ...newEmails]);
            setEmailInput('');
        }
    };

    const handleRemoveEmail = (emailToRemove) => {
        setEmailAddresses(prev => prev.filter(email => email !== emailToRemove));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddEmails();
        }
    };

    const toggleContact = (contactId) => {
        setSelectedContacts(prev => 
            prev.includes(contactId) 
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const handleDuplicateProject = async () => {
        if (!duplicateName || !duplicateStartDate) {
            addToast('Please provide a name and start date for the duplicated project', 'error');
            return;
        }

        if (!state.currentOrganization?.id) {
            addToast('Organization context is missing', 'error');
            return;
        }

        setIsDuplicating(true);
        try {
            const result = await duplicateProject(
                supabaseClient,
                project.id,
                duplicateName,
                state.currentOrganization.id,
                duplicateStartDate
            );

            if (result.success) {
                addToast('Project duplicated successfully!', 'success');
                setShowDuplicateDialog(false);
                onClose();
                // Refresh the page or trigger data reload
                window.location.reload();
            } else {
                addToast(result.error || 'Failed to duplicate project', 'error');
            }
        } catch (error) {
            console.error('Error duplicating project:', error);
            addToast('Failed to duplicate project', 'error');
        } finally {
            setIsDuplicating(false);
        }
    };

    if (showDuplicateDialog) {
        return (
            <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-6">Duplicate Project</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">New Project Name</label>
                        <input 
                            type="text" 
                            value={duplicateName} 
                            onChange={e => setDuplicateName(e.target.value)} 
                            className="w-full p-2 border rounded-lg" 
                            placeholder={`${project.name} - Copy`}
                            required 
                        />
                    </div>
                    <DateDropdown 
                        value={duplicateStartDate} 
                        onChange={setDuplicateStartDate} 
                        label="New Start Date"
                        className="mb-6"
                        required
                    />
                    <p className="text-sm text-gray-600 mb-6">
                        This will create a copy of the project structure (phases, tasks) with dates adjusted based on the new start date. 
                        Transactional data (comments, files, activity logs) will not be copied.
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowDuplicateDialog(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={isDuplicating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDuplicateProject}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            disabled={isDuplicating}
                        >
                            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{isEditMode ? 'Edit Project' : 'Create New Project'}</h2>
                    {isEditMode && (
                        <PermissionGuard permission="can_create_projects">
                            <button
                                type="button"
                                onClick={() => {
                                    setDuplicateName(`${project.name} - Copy`);
                                    setDuplicateStartDate('');
                                    setShowDuplicateDialog(true);
                                }}
                                className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                            >
                                Duplicate Project
                            </button>
                        </PermissionGuard>
                    )}
                </div>
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
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Project Number</label>
                        <input type="text" value={project_number} onChange={e => setProjectNumber(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Optional" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1 text-gray-600">Project Type</label>
                        <select value={project_type} onChange={e => setProjectType(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                            <option value="Residential">Residential</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Multi-family">Multi-family</option>
                            <option value="Other">Other</option>
                        </select>
                        {project_type === 'Other' && (
                            <input
                                type="text"
                                value={project_type_custom}
                                onChange={e => setProjectTypeCustom(e.target.value)}
                                placeholder="Enter project type"
                                className="w-full p-2 border rounded-lg mt-2"
                            />
                        )}
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
                    
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2 text-gray-600">
                            {isEditMode ? 'Team Members' : 'Add Team Members'} (Optional)
                        </label>
                        
                        {/* Add email addresses input */}
                        <div className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter email addresses (comma or space separated)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddEmails}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                    Add
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Add email addresses for people who don't have accounts yet. They'll be invited to join.
                            </p>
                        </div>

                        {/* Display added email addresses */}
                        {emailAddresses.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {emailAddresses.map((email, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                                    >
                                        {email}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEmail(email)}
                                            className="text-blue-700 hover:text-blue-900"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Existing team members list */}
                        {teamMembers.length > 0 && (
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
                                            {contact.avatar_url ? (
                                                <img 
                                                    src={contact.avatar_url} 
                                                    alt={contact.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            ) : (
                                                <Avatar name={contact.name} size="md" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                                <div className="text-xs text-gray-500">{contact.role}</div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                        
                        {(selectedContacts.length > 0 || emailAddresses.length > 0) && (
                            <p className="text-xs text-gray-500 mt-2">
                                {selectedContacts.length} existing contact{selectedContacts.length !== 1 ? 's' : ''} selected
                                {emailAddresses.length > 0 && `, ${emailAddresses.length} email${emailAddresses.length !== 1 ? 's' : ''} to invite`}
                            </p>
                        )}
                    </div>
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