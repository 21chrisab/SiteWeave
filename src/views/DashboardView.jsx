import React, { useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ProjectCard from '../components/ProjectCard';
import ProjectModal from '../components/ProjectModal';
import MyDaySidebar from '../components/MyDaySidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardStats from '../components/DashboardStats';
import ViewSwitcher from '../components/ViewSwitcher';
import ProjectBoardView from '../components/ProjectBoardView';
import ProjectListView from '../components/ProjectListView';
import { useProjectShortcuts } from '../hooks/useKeyboardShortcuts';

function DashboardView() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [viewType, setViewType] = useState('card'); // 'card', 'list', or 'board'

    // Keyboard shortcuts
    useProjectShortcuts({
        createProject: () => setShowModal(true),
        goToDashboard: () => dispatch({ type: 'SET_VIEW', payload: 'Dashboard' })
    });

    const handleSaveProject = async (projectData) => {
        if (editingProject) {
            setIsUpdatingProject(true);
            // Remove selectedContacts and emailAddresses from projectData as they're not columns in the projects table
            const { selectedContacts, emailAddresses, ...projectFields } = projectData;
            const projectDataWithAudit = {
                ...projectFields,
                updated_by_user_id: state.user.id,
                updated_at: new Date().toISOString()
            };
            const { data: updatedProject, error } = await supabaseClient
                .from('projects')
                .update(projectDataWithAudit)
                .eq('id', editingProject.id)
                .select()
                .single();
            if (error) {
                addToast('Error updating project: ' + error.message, 'error');
            } else {
                // Update project contacts if selectedContacts or emailAddresses is provided
                if (selectedContacts !== undefined || projectData.emailAddresses) {
                    // First, remove all existing project contacts
                    const { error: deleteError } = await supabaseClient
                        .from('project_contacts')
                        .delete()
                        .eq('project_id', editingProject.id);
                    
                    if (deleteError) {
                        console.error('Error removing existing contacts:', deleteError);
                        addToast('Project updated, but contacts could not be updated', 'warning');
                    } else {
                        // Handle email addresses - create contacts for emails that don't exist
                        const emailAddresses = projectData.emailAddresses || [];
                        const contactsToAdd = [...(selectedContacts || [])];
                        
                        if (emailAddresses.length > 0) {
                            for (const email of emailAddresses) {
                                try {
                                    // Check if contact already exists
                                    const { data: existingContact } = await supabaseClient
                                        .from('contacts')
                                        .select('id')
                                        .ilike('email', email)
                                        .maybeSingle();
                                    
                                    if (existingContact) {
                                        // Contact exists, add to list
                                        contactsToAdd.push(existingContact.id);
                                    } else {
                                        // Create new contact
                                        const { data: newContact, error: contactError } = await supabaseClient
                                            .from('contacts')
                                            .insert({
                                                name: email.split('@')[0], // Use email prefix as name
                                                email: email,
                                                type: 'Team',
                                                role: 'Team Member',
                                                status: 'Available'
                                            })
                                            .select()
                                            .single();
                                        
                                        if (contactError) {
                                            console.error(`Error creating contact for ${email}:`, contactError);
                                            addToast(`Could not create contact for ${email}`, 'warning');
                                        } else {
                                            contactsToAdd.push(newContact.id);
                                            // Refresh contacts in context
                                            dispatch({ type: 'ADD_CONTACT', payload: newContact });
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error processing email ${email}:`, error);
                                    addToast(`Error processing ${email}`, 'warning');
                                }
                            }
                        }
                        
                        // Then add the new selected contacts
                        if (contactsToAdd.length > 0) {
                            const projectContactsData = contactsToAdd.map(contactId => ({
                                project_id: editingProject.id,
                                contact_id: contactId
                            }));
                            const { error: contactsError } = await supabaseClient
                                .from('project_contacts')
                                .insert(projectContactsData);
                            if (contactsError) {
                                console.error('Error adding contacts to project:', contactsError);
                                addToast('Project updated, but some contacts could not be added', 'warning');
                            }
                        }
                    }
                }
                dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
                addToast('Project updated successfully!', 'success');
                setShowModal(false);
                setEditingProject(null);
            }
            setIsUpdatingProject(false);
        } else {
            setIsCreatingProject(true);
            // Remove selectedContacts and emailAddresses from projectData as they're not columns in the projects table
            const { selectedContacts, emailAddresses, ...projectFields } = projectData;
            const projectDataWithAudit = {
                ...projectFields,
                project_manager_id: state.user.id,
                created_by_user_id: state.user.id,
                updated_by_user_id: state.user.id,
                updated_at: new Date().toISOString()
            };
            console.log('Creating project with data:', projectDataWithAudit);
            const { data: createdProject, error } = await supabaseClient
                .from('projects')
                .insert(projectDataWithAudit)
                .select()
                .single();
            if (error) {
                console.error('Project creation error:', error);
                addToast('Error creating project: ' + error.message, 'error');
            } else {
                // Create a message channel for the project
                const { data: messageChannel, error: channelError } = await supabaseClient
                    .from('message_channels')
                    .insert({
                        project_id: createdProject.id,
                        name: `${createdProject.name} Discussion`
                    })
                    .select()
                    .single();

                if (channelError) {
                    console.error('Error creating message channel:', channelError);
                    addToast('Project created, but message channel could not be created', 'warning');
                } else {
                    dispatch({ type: 'ADD_CHANNEL', payload: messageChannel });
                }

                // Handle email addresses - create contacts for emails that don't exist
                const emailAddresses = projectData.emailAddresses || [];
                const contactsToAdd = [...(selectedContacts || [])];
                
                if (emailAddresses.length > 0) {
                    for (const email of emailAddresses) {
                        try {
                            // Check if contact already exists
                            const { data: existingContact } = await supabaseClient
                                .from('contacts')
                                .select('id')
                                .ilike('email', email)
                                .maybeSingle();
                            
                            if (existingContact) {
                                // Contact exists, add to list
                                contactsToAdd.push(existingContact.id);
                            } else {
                                // Create new contact
                                const { data: newContact, error: contactError } = await supabaseClient
                                    .from('contacts')
                                    .insert({
                                        name: email.split('@')[0], // Use email prefix as name
                                        email: email,
                                        type: 'Team',
                                        role: 'Team Member',
                                        status: 'Available'
                                    })
                                    .select()
                                    .single();
                                
                                if (contactError) {
                                    console.error(`Error creating contact for ${email}:`, contactError);
                                    addToast(`Could not create contact for ${email}`, 'warning');
                                } else {
                                    contactsToAdd.push(newContact.id);
                                    // Refresh contacts in context
                                    dispatch({ type: 'ADD_CONTACT', payload: newContact });
                                }
                            }
                        } catch (error) {
                            console.error(`Error processing email ${email}:`, error);
                            addToast(`Error processing ${email}`, 'warning');
                        }
                    }
                }
                
                // Always add the creator to project_contacts if they have a contact_id
                // This ensures they can see the project they created
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('contact_id')
                    .eq('id', state.user.id)
                    .single();
                
                const creatorContactId = profile?.contact_id;
                if (creatorContactId && !contactsToAdd.includes(creatorContactId)) {
                    contactsToAdd.push(creatorContactId);
                    console.log('Adding creator to project_contacts:', creatorContactId);
                } else if (!creatorContactId) {
                    console.warn('Creator does not have a contact_id - project may not be visible after reload');
                }
                
                // Add all contacts (existing + newly created + creator) to the project
                if (contactsToAdd.length > 0) {
                    const projectContactsData = contactsToAdd.map(contactId => ({
                        project_id: createdProject.id,
                        contact_id: contactId
                    }));
                    console.log('Inserting project_contacts:', projectContactsData);
                    const { data: insertedContacts, error: contactsError } = await supabaseClient
                        .from('project_contacts')
                        .insert(projectContactsData)
                        .select();
                    if (contactsError) {
                        console.error('Error adding contacts to project:', contactsError);
                        addToast('Project created, but some contacts could not be added: ' + contactsError.message, 'warning');
                    } else {
                        console.log('Successfully added contacts to project:', insertedContacts);
                        // Dispatch action to update local state with project contacts
                        contactsToAdd.forEach(contactId => {
                            dispatch({ 
                                type: 'ADD_PROJECT_CONTACT', 
                                payload: { project_id: createdProject.id, contact_id: contactId } 
                            });
                        });
                    }
                } else {
                    console.warn('No contacts to add to project - project may not be visible after reload');
                }
                dispatch({ type: 'ADD_PROJECT', payload: createdProject });
                addToast('Project created successfully!', 'success');
                setShowModal(false);
            }
            setIsCreatingProject(false);
        }
    };

    const handleEditProject = (project) => {
        setEditingProject(project);
        setShowModal(true);
    };

    const handleDeleteProject = (project) => {
        setProjectToDelete(project);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteProject = async () => {
        if (projectToDelete) {
            const { error } = await supabaseClient.from('projects').delete().eq('id', projectToDelete.id);
            if (error) {
                addToast('Error deleting project: ' + error.message, 'error');
            } else {
                dispatch({ type: 'DELETE_PROJECT', payload: projectToDelete.id });
                addToast('Project deleted successfully!', 'success');
            }
        }
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProject(null);
    };

    const handleProjectClick = (project) => {
        dispatch({ type: 'SET_PROJECT', payload: project.id });
        dispatch({ type: 'SET_VIEW', payload: 'Projects' });
    };

    return (
        <>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full">
                <div className="xl:col-span-3">
                    <header className="flex items-center justify-between mb-6" data-onboarding="dashboard-welcome">
                         <div>
                            <h1 className="text-3xl font-bold text-gray-900">Project Dashboard</h1>
                            <p className="text-gray-500">Manage your construction projects</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <ViewSwitcher currentView={viewType} onViewChange={setViewType} />
                            <button 
                                onClick={() => setShowModal(true)} 
                                data-onboarding="new-project-btn"
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 btn-smooth"
                            >
                                + New Project
                            </button>
                        </div>
                    </header>
                    
                    {/* Dashboard Statistics */}
                    <DashboardStats />
                    
                    {/* Project Views */}
                    {state.projects.length > 0 ? (
                        <div data-onboarding="project-grid">
                            {viewType === 'card' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {state.projects.map(p => (
                                        <div key={p.id} data-onboarding="project-cards">
                                            <ProjectCard 
                                                project={p} 
                                                onEdit={handleEditProject}
                                                onDelete={handleDeleteProject}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {viewType === 'list' && (
                                <ProjectListView
                                    projects={state.projects}
                                    onEdit={handleEditProject}
                                    onDelete={handleDeleteProject}
                                    onProjectClick={handleProjectClick}
                                />
                            )}
                            {viewType === 'board' && (
                                <ProjectBoardView
                                    projects={state.projects}
                                    onEdit={handleEditProject}
                                    onDelete={handleDeleteProject}
                                    onProjectClick={handleProjectClick}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
                            <p className="text-gray-500 mb-6 max-w-md">Get started by creating your first construction project. Track progress, manage tasks, and collaborate with your team.</p>
                            <button 
                                onClick={() => setShowModal(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Create Your First Project
                            </button>
                        </div>
                    )}
                </div>
                <aside 
                    data-onboarding="my-day-sidebar"
                    className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-gray-200"
                >
                    <MyDaySidebar />
                </aside>
            </div>
            {showModal && (
                <ProjectModal 
                    onClose={handleCloseModal} 
                    onSave={handleSaveProject} 
                    isLoading={isCreatingProject || isUpdatingProject}
                    project={editingProject}
                />
            )}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${projectToDelete?.name}"? This will also delete all associated tasks, files, message boards, and messages. This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
}

export default DashboardView;