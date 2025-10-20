import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import Avatar from './Avatar';
import dropboxStorage from '../utils/dropboxStorage';

const FieldIssues = ({ projectId }) => {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fieldIssues, setFieldIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Get project team members for dropdown
    const projectTeamMembers = state.contacts.filter(contact => {
        const hasProjectAccess = contact.project_contacts?.some(pc => 
            pc.project_id === projectId || 
            pc.project_id === String(projectId) || 
            String(pc.project_id) === String(projectId)
        );
        return hasProjectAccess && contact.type === 'Team';
    });

    // Debug logging
    console.log('Current projectId:', projectId);
    console.log('All contacts:', state.contacts);
    console.log('Project team members:', projectTeamMembers);
    console.log('Contact IDs:', projectTeamMembers.map(c => ({ id: c.id, name: c.name, idType: typeof c.id })));

    // Form state for creating new issues
    const [newIssue, setNewIssue] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: ''
    });
    const [workflowSteps, setWorkflowSteps] = useState([
        { step_order: 1, description: '', assigned_to_contact_id: '', assigned_to_name: '', assigned_to_role: '' }
    ]);

    // Fetch field issues from database
    useEffect(() => {
        const fetchFieldIssues = async () => {
            if (!projectId) return;
            
            try {
                setIsLoading(true);
                const { data, error } = await supabaseClient
                    .from('project_issues')
                    .select(`
                        *,
                        issue_steps(*, contacts(name, role, avatar_url)),
                        issue_files(*)
                    `)
                    .eq('project_id', projectId)
                    .eq('status', 'open')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching field issues:', error);
                    addToast('Error loading field issues', 'error');
                    return;
                }

                setFieldIssues(data || []);
            } catch (error) {
                console.error('Error fetching field issues:', error);
                addToast('Error loading field issues', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFieldIssues();
    }, [projectId, addToast]);

    const getPriorityColor = (priority) => {
        switch (priority.toLowerCase()) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleIssueClick = (issueId) => {
        setExpandedIssue(expandedIssue === issueId ? null : issueId);
    };

    const handleFileUpload = async (issueId, event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check if Dropbox is connected
        if (!state.dropboxConnected) {
            addToast('Please connect to Dropbox in Settings to upload files', 'error');
            return;
        }

        setIsUploading(true);
        try {
            // Upload to Dropbox
            const uploadResult = await dropboxStorage.uploadFile(file, `/field-issues/${issueId}`, file.name);

            // Insert record into issue_files table with Dropbox URL
            const { error: insertError } = await supabaseClient
                .from('issue_files')
                .insert({
                    issue_id: issueId,
                    file_name: file.name,
                    file_url: uploadResult.sharedUrl,
                    file_type: file.type.startsWith('image') ? 'image' : (file.type === 'application/pdf' ? 'pdf' : 'file'),
                    file_size_kb: Math.round(file.size / 1024),
                    uploaded_by_user_id: state.user?.id
                });

            if (insertError) {
                throw insertError;
            }

            addToast('File uploaded successfully to Dropbox!', 'success');
            
            // Refresh the field issues
            await fetchFieldIssues();
        } catch (error) {
            addToast('Error uploading file: ' + error.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleStepComplete = async (stepId, issueId) => {
        try {
            // Mark step as completed
            const { error } = await supabaseClient
                .from('issue_steps')
                .update({ 
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    completed_by_user_id: state.user?.id
                })
                .eq('id', stepId);

            if (error) {
                throw error;
            }

            // Add a comment about the completion
            await supabaseClient
                .from('issue_comments')
                .insert({
                    issue_id: issueId,
                    step_id: stepId,
                    user_id: state.user?.id,
                    user_name: state.user?.user_metadata?.full_name || 'User',
                    comment: 'Step completed successfully.',
                    comment_type: 'step_completion'
                });

            addToast('Step completed! Workflow will advance automatically.', 'success');
            
            // Refresh the field issues
            await fetchFieldIssues();
        } catch (error) {
            addToast('Error completing step: ' + error.message, 'error');
        }
    };

    const fetchFieldIssues = async () => {
        if (!projectId) return;
        
        try {
            const { data, error } = await supabaseClient
                .from('project_issues')
                .select(`
                    *,
                    issue_steps(*, contacts(name, role, avatar_url)),
                    issue_files(*)
                `)
                .eq('project_id', projectId)
                .eq('status', 'open')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching field issues:', error);
                return;
            }

            setFieldIssues(data || []);
        } catch (error) {
            console.error('Error fetching field issues:', error);
        }
    };

    const isCurrentUserAssigned = (step) => {
        // For now, we'll check if the current user's name matches the assigned name
        // This is a simplified approach - in a real app, you'd want to link contacts to users
        const currentUserName = state.user?.user_metadata?.full_name || state.user?.email;
        return currentUserName && step.assigned_to_name && 
               (currentUserName.toLowerCase().includes(step.assigned_to_name.toLowerCase()) ||
                step.assigned_to_name.toLowerCase().includes(currentUserName.toLowerCase()));
    };

    const getCurrentStep = (issue) => {
        return issue.issue_steps?.find(step => step.id === issue.current_step_id);
    };

    const getActionPanelContent = (issue) => {
        const currentStep = getCurrentStep(issue);
        if (!currentStep) return null;

        const isAssigned = isCurrentUserAssigned(currentStep);

        if (isAssigned) {
            return (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Your Action Required</h4>
                        <p className="text-sm text-blue-700 mb-4">
                            {currentStep.description}
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Supporting Files
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                                    onChange={(e) => handleFileUpload(issue.id, e)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <button
                                onClick={() => handleStepComplete(currentStep.id, issue.id)}
                                disabled={isUploading}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                            >
                                {isUploading ? 'Uploading...' : 'Mark Step Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
                        <p className="text-sm text-gray-600">
                            Awaiting completion from {currentStep.assigned_to_name} ({currentStep.assigned_to_role})
                        </p>
                    </div>
                </div>
            );
        }
    };

    const handleCreateIssue = async () => {
        if (!newIssue.title.trim()) {
            addToast('Please enter an issue title', 'error');
            return;
        }

        if (workflowSteps.some(step => !step.description.trim() || !step.assigned_to_contact_id.trim())) {
            addToast('Please complete all workflow steps and assign team members', 'error');
            return;
        }

        setIsCreating(true);
        try {
            // Create the issue
            const { data: issueData, error: issueError } = await supabaseClient
                .from('project_issues')
                .insert({
                    project_id: projectId,
                    title: newIssue.title,
                    description: newIssue.description,
                    priority: newIssue.priority,
                    due_date: newIssue.dueDate || null,
                    created_by_user_id: state.user?.id
                })
                .select()
                .single();

            if (issueError) {
                throw issueError;
            }

            // Create the workflow steps
            const stepsToInsert = workflowSteps.map(step => ({
                issue_id: issueData.id,
                step_order: step.step_order,
                description: step.description,
                assigned_to_contact_id: step.assigned_to_contact_id,
                assigned_to_name: step.assigned_to_name,
                assigned_to_role: step.assigned_to_role
            }));

            const { error: stepsError } = await supabaseClient
                .from('issue_steps')
                .insert(stepsToInsert);

            if (stepsError) {
                throw stepsError;
            }

            addToast('Issue created successfully!', 'success');
            setShowCreateModal(false);
            setNewIssue({ title: '', description: '', priority: 'Medium', dueDate: '' });
            setWorkflowSteps([{ step_order: 1, description: '', assigned_to_contact_id: '', assigned_to_name: '', assigned_to_role: '' }]);
            
            // Refresh the field issues
            await fetchFieldIssues();
        } catch (error) {
            addToast('Error creating issue: ' + error.message, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const addWorkflowStep = () => {
        setWorkflowSteps([...workflowSteps, { 
            step_order: workflowSteps.length + 1, 
            description: '', 
            assigned_to_contact_id: '', 
            assigned_to_name: '', 
            assigned_to_role: '' 
        }]);
    };

    const removeWorkflowStep = (index) => {
        if (workflowSteps.length > 1) {
            const newSteps = workflowSteps.filter((_, i) => i !== index);
            // Reorder the steps
            const reorderedSteps = newSteps.map((step, i) => ({ ...step, step_order: i + 1 }));
            setWorkflowSteps(reorderedSteps);
        }
    };

    const updateWorkflowStep = (index, field, value) => {
        console.log(`Updating step ${index}, field: ${field}, value:`, value);
        const newSteps = [...workflowSteps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        console.log('New workflow steps:', newSteps);
        setWorkflowSteps(newSteps);
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Field Issues ({fieldIssues.length})</h2>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
                >
                    + Create Issue
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading field issues...</p>
                </div>
            ) : fieldIssues.length > 0 ? (
                <div className="space-y-4">
                    {fieldIssues.map((issue) => {
                        const currentStep = getCurrentStep(issue);
                        const completedSteps = issue.issue_steps?.filter(step => step.status === 'completed').length || 0;
                        const totalSteps = issue.issue_steps?.length || 0;
                        
                        return (
                            <div key={issue.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Issue Card */}
                                <div 
                                    onClick={() => handleIssueClick(issue.id)}
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{issue.title}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>Created: {formatDate(issue.created_at)}</span>
                                                <span>Due: {formatDate(issue.due_date)}</span>
                                                <span>Progress: {completedSteps}/{totalSteps} steps</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(issue.priority)}`}>
                                                {issue.priority}
                                            </span>
                                            <Icon 
                                                path={expandedIssue === issue.id ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} 
                                                className="w-4 h-4 text-gray-400" 
                                            />
                                        </div>
                                    </div>

                                    {/* Workflow Progress Tracker */}
                                    <div className="flex items-center justify-between">
                                        {issue.issue_steps?.map((step, index) => (
                                            <div key={step.id} className="flex items-center">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                                                    step.status === 'completed' 
                                                        ? 'bg-green-600 text-white' 
                                                        : step.id === issue.current_step_id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                    {step.status === 'completed' ? (
                                                        <Icon path="M5 13l4 4L19 7" className="w-4 h-4" />
                                                    ) : (
                                                        <span>{index + 1}</span>
                                                    )}
                                                </div>
                                                <span className={`ml-2 text-xs font-medium ${
                                                    step.status === 'completed' 
                                                        ? 'text-green-600' 
                                                        : step.id === issue.current_step_id
                                                        ? 'text-blue-600'
                                                        : 'text-gray-500'
                                                }`}>
                                                    {step.description.length > 20 ? step.description.substring(0, 20) + '...' : step.description}
                                                </span>
                                                {index < issue.issue_steps.length - 1 && (
                                                    <div className={`w-8 h-0.5 mx-2 ${
                                                        step.status === 'completed' ? 'bg-green-600' : 'bg-gray-200'
                                                    }`} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Expanded Action Panel */}
                                {expandedIssue === issue.id && (
                                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                                        {currentStep && (
                                            <div className="flex items-center gap-3 mb-4">
                                                <Avatar name={currentStep.assigned_to_name} size="sm" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Current Step: {currentStep.description}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Assigned to: {currentStep.assigned_to_name} ({currentStep.assigned_to_role})
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {getActionPanelContent(issue)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon path="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No field issues</h3>
                    <p className="text-gray-500 mb-4">Create custom workflows to track and resolve project issues.</p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Create Your First Issue
                    </button>
                </div>
            )}

            {/* Create Issue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Create New Issue</h3>
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Issue Details */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-900">Issue Details</h4>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Issue Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newIssue.title}
                                        onChange={(e) => setNewIssue({...newIssue, title: e.target.value})}
                                        placeholder="e.g., Soil conflict in Sector C"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={newIssue.description}
                                        onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                                        placeholder="e.g., Hit unexpected rock shelf at grid line B-4..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Priority
                                        </label>
                                        <select
                                            value={newIssue.priority}
                                            onChange={(e) => setNewIssue({...newIssue, priority: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={newIssue.dueDate}
                                            onChange={(e) => setNewIssue({...newIssue, dueDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Steps */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-semibold text-gray-900">Workflow Steps</h4>
                                    <button
                                        onClick={addWorkflowStep}
                                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        + Add Step
                                    </button>
                                </div>

                                {projectTeamMembers.length === 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" className="w-5 h-5 text-yellow-600 mr-2" />
                                            <div>
                                                <h5 className="text-sm font-medium text-yellow-800">No Team Members Available</h5>
                                                <p className="text-sm text-yellow-700 mt-1">
                                                    Add team members to this project in the Contacts section before creating workflow steps.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {workflowSteps.map((step, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Step {step.step_order}</span>
                                            {workflowSteps.length > 1 && (
                                                <button
                                                    onClick={() => removeWorkflowStep(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Icon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Task Description *
                                            </label>
                                            <input
                                                type="text"
                                                value={step.description}
                                                onChange={(e) => updateWorkflowStep(index, 'description', e.target.value)}
                                                placeholder="e.g., Survey new elevation at B-4"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Assign to Team Member *
                                                </label>
                                                <select
                                                    value={step.assigned_to_contact_id || ''}
                                                    onChange={(e) => {
                                                        console.log('Dropdown changed:', e.target.value);
                                                        console.log('Available contacts:', projectTeamMembers);
                                                        const selectedContact = projectTeamMembers.find(c => 
                                                            c.id === e.target.value || 
                                                            String(c.id) === String(e.target.value)
                                                        );
                                                        console.log('Selected contact:', selectedContact);
                                                        if (selectedContact) {
                                                            // Update all fields at once to avoid multiple state updates
                                                            const newSteps = [...workflowSteps];
                                                            newSteps[index] = { 
                                                                ...newSteps[index], 
                                                                assigned_to_contact_id: selectedContact.id,
                                                                assigned_to_name: selectedContact.name,
                                                                assigned_to_role: selectedContact.role
                                                            };
                                                            console.log('Updating with contact:', selectedContact);
                                                            console.log('New steps:', newSteps);
                                                            setWorkflowSteps(newSteps);
                                                        } else {
                                                            // Clear all fields at once
                                                            const newSteps = [...workflowSteps];
                                                            newSteps[index] = { 
                                                                ...newSteps[index], 
                                                                assigned_to_contact_id: '',
                                                                assigned_to_name: '',
                                                                assigned_to_role: ''
                                                            };
                                                            console.log('Clearing contact selection');
                                                            setWorkflowSteps(newSteps);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select a team member...</option>
                                                    {projectTeamMembers.map(contact => (
                                                        <option key={contact.id} value={contact.id}>
                                                            {contact.name} ({contact.role})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Selected Member Info
                                                </label>
                                                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                                    {step.assigned_to_name ? (
                                                        <div>
                                                            <div className="font-medium">{step.assigned_to_name}</div>
                                                            <div className="text-xs text-gray-500">{step.assigned_to_role}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No member selected</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateIssue}
                                disabled={isCreating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isCreating ? 'Creating...' : 'Create Issue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldIssues;