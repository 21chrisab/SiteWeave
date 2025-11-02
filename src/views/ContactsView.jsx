import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import AddContactModal from '../components/AddContactModal';
import ContactCard from '../components/ContactCard';
import ConfirmDialog from '../components/ConfirmDialog';

function ContactsView() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('Team');
    const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id || null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isCreatingContact, setIsCreatingContact] = useState(false);
    const [isUpdatingContact, setIsUpdatingContact] = useState(false);
    const [isDeletingContact, setIsDeletingContact] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [contactToDelete, setContactToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Listen for tour navigation to switch to Subcontractors tab
    useEffect(() => {
        const handleSwitchToSubcontractors = () => {
            setActiveTab('Subcontractors');
        };
        
        window.addEventListener('switchToSubcontractorsTab', handleSwitchToSubcontractors);
        
        return () => {
            window.removeEventListener('switchToSubcontractorsTab', handleSwitchToSubcontractors);
        };
    }, []);

    const teamMembers = state.contacts.filter(c => c.type === 'Team');
    const subcontractors = state.contacts.filter(c => c.type === 'Subcontractor');

    const assignedTeam = teamMembers.filter(c => c.project_contacts.some(pc => pc.project_id === selectedProjectId));
    const availablePersonnel = teamMembers.filter(c => !c.project_contacts.some(pc => pc.project_id === selectedProjectId));

    // Filter contacts based on search and status
    const filteredContacts = useMemo(() => {
        let contacts = activeTab === 'Team' ? teamMembers : subcontractors;
        
        if (searchTerm) {
            contacts = contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        if (statusFilter !== 'All') {
            contacts = contacts.filter(contact => contact.status === statusFilter);
        }
        
        return contacts;
    }, [activeTab, teamMembers, subcontractors, searchTerm, statusFilter]);

    const handleAddMember = async (contactId) => {
        const { error } = await supabaseClient.from('project_contacts').insert({ project_id: selectedProjectId, contact_id: contactId });
        if (error) {
            addToast('Error adding member: ' + error.message, 'error');
        } else {
            addToast('Member added to project successfully!', 'success');
            dispatch({ type: 'ADD_PROJECT_CONTACT', payload: { project_id: selectedProjectId, contact_id: contactId } });
        }
    };

    const handleRemoveMember = async (contactId) => {
        const { error } = await supabaseClient.from('project_contacts').delete().match({ project_id: selectedProjectId, contact_id: contactId });
        if (error) {
            addToast('Error removing member: ' + error.message, 'error');
        } else {
            addToast('Member removed from project successfully!', 'success');
            dispatch({ type: 'REMOVE_PROJECT_CONTACT', payload: { project_id: selectedProjectId, contact_id: contactId } });
        }
    };
    
    const handleSaveContact = async (contactData) => {
        if (editingContact) {
            setIsUpdatingContact(true);
            const { error } = await supabaseClient
                .from('contacts')
                .update(contactData)
                .eq('id', contactData.id);
            
            if (error) {
                addToast('Error updating contact: ' + error.message, 'error');
            } else {
                addToast('Contact updated successfully!', 'success');
                dispatch({ type: 'UPDATE_CONTACT', payload: contactData });
                setShowAddModal(false);
                setEditingContact(null);
            }
            setIsUpdatingContact(false);
        } else {
            setIsCreatingContact(true);
            const contactDataWithAudit = {
                ...contactData,
                created_by_user_id: state.user?.id
            };
            const { data, error } = await supabaseClient
                .from('contacts')
                .insert(contactDataWithAudit)
                .select()
                .single();
            
            if (error) {
                addToast('Error creating contact: ' + error.message, 'error');
            } else {
                addToast('Contact created successfully!', 'success');
                dispatch({ type: 'ADD_CONTACT', payload: data });
                setShowAddModal(false);
            }
            setIsCreatingContact(false);
        }
    };

    const handleEditContact = (contact) => {
        setEditingContact(contact);
        setShowAddModal(true);
    };

    const handleDeleteContact = (contact) => {
        setContactToDelete(contact);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteContact = async () => {
        if (!contactToDelete) return;
        
        setIsDeletingContact(true);
        const { error } = await supabaseClient
            .from('contacts')
            .delete()
            .eq('id', contactToDelete.id);
        
        if (error) {
            addToast('Error deleting contact: ' + error.message, 'error');
        } else {
            addToast('Contact deleted successfully!', 'success');
            dispatch({ type: 'DELETE_CONTACT', payload: contactToDelete.id });
        }
        
        setIsDeletingContact(false);
        setShowDeleteConfirm(false);
        setContactToDelete(null);
    };

    const handleImportContacts = () => {
        // Create file input for CSV import
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const csv = e.target.result;
                        const lines = csv.split('\n');
                        const headers = lines[0].split(',');
                        
                        // Basic CSV parsing (would need more robust parsing in production)
                        const contacts = lines.slice(1).map(line => {
                            const values = line.split(',');
                            const contact = {};
                            headers.forEach((header, index) => {
                                contact[header.trim().toLowerCase().replace(' ', '_')] = values[index]?.trim();
                            });
                            return contact;
                        }).filter(contact => contact.name); // Filter out empty rows
                        
                        addToast(`Found ${contacts.length} contacts to import`, 'info');
                        // Here you would typically show a preview modal before importing
                        
                    } catch (error) {
                        addToast('Error parsing CSV file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
        setShowImportModal(false);
    };

    const handleExportContacts = () => {
        const contacts = activeTab === 'Team' ? teamMembers : subcontractors;
        const csvContent = [
            'Name,Role,Type,Company,Trade,Email,Phone,Status',
            ...contacts.map(contact => 
                `"${contact.name}","${contact.role}","${contact.type}","${contact.company || ''}","${contact.trade || ''}","${contact.email || ''}","${contact.phone || ''}","${contact.status}"`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeTab.toLowerCase()}_contacts.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        addToast('Contacts exported successfully!', 'success');
        setShowExportModal(false);
    };

    return (
        <>
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
                    <p className="text-gray-500">Manage your team members and subcontractors</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowImportModal(true)} 
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Import
                    </button>
                    <button 
                        onClick={() => setShowExportModal(true)} 
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Export
                    </button>
                    <button 
                        onClick={() => setShowAddModal(true)} 
                        data-onboarding="add-contact-btn"
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                        + Add Contact
                    </button>
                </div>
            </header>

            {/* Search and Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="All">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Offline">Offline</option>
                    </select>
                </div>
            </div>

            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('Team')} 
                    className={`px-4 py-2 text-sm font-semibold ${activeTab === 'Team' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Team ({teamMembers.length})
                </button>
                <button 
                    onClick={() => setActiveTab('Subcontractors')} 
                    className={`px-4 py-2 text-sm font-semibold ${activeTab === 'Subcontractors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Subcontractors ({subcontractors.length})
                </button>
            </div>
            
            {activeTab === 'Team' ? (
                <>
                    <div className="mb-6">
                        <label className="text-sm font-medium text-gray-700">Select a Project to Manage Team:</label>
                        <select 
                            value={selectedProjectId || ''} 
                            onChange={e => setSelectedProjectId(e.target.value)} 
                            className="mt-1 block w-full max-w-sm pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                        >
                            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-onboarding="contacts-list">
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-4">Available Personnel ({availablePersonnel.length})</h2>
                            <ul className="space-y-3">
                                {availablePersonnel.map(c => (
                                    <ContactCard 
                                        key={c.id} 
                                        contact={c} 
                                        onAction={handleAddMember} 
                                        actionType="add"
                                        onEdit={handleEditContact}
                                        onDelete={handleDeleteContact}
                                        showActions={true}
                                    />
                                ))}
                            </ul>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-4">
                                {state.projects.find(p => p.id === selectedProjectId)?.name} Team ({assignedTeam.length})
                            </h2>
                            <ul className="space-y-3">
                                {assignedTeam.map(c => (
                                    <ContactCard 
                                        key={c.id} 
                                        contact={c} 
                                        onAction={handleRemoveMember} 
                                        actionType="remove"
                                        onEdit={handleEditContact}
                                        onDelete={handleDeleteContact}
                                        showActions={true}
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200" data-onboarding="contacts-list">
                    <h2 className="text-xl font-bold mb-4">
                        All Subcontractors ({filteredContacts.length})
                    </h2>
                    <ul className="space-y-3">
                        {filteredContacts.map(c => (
                            <ContactCard 
                                key={c.id} 
                                contact={c}
                                onEdit={handleEditContact}
                                onDelete={handleDeleteContact}
                                showActions={true}
                            />
                        ))}
                    </ul>
                    {filteredContacts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm || statusFilter !== 'All' 
                                ? 'No contacts match your search criteria' 
                                : 'No subcontractors found'
                            }
                        </div>
                    )}
                </div>
            )}

            {/* Contact Modal */}
            {showAddModal && (
                <AddContactModal 
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingContact(null);
                    }} 
                    onSave={handleSaveContact} 
                    contact={editingContact}
                    isLoading={isCreatingContact || isUpdatingContact} 
                />
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setContactToDelete(null);
                    }}
                    onConfirm={confirmDeleteContact}
                    title="Delete Contact"
                    message={`Are you sure you want to delete "${contactToDelete?.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    isLoading={isDeletingContact}
                />
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">Import Contacts</h2>
                        <p className="text-gray-600 mb-6">
                            Import contacts from a CSV file. The file should have columns: Name, Role, Type, Company, Trade, Email, Phone, Status
                        </p>
                        <div className="flex justify-end gap-4">
                            <button 
                                onClick={() => setShowImportModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleImportContacts}
                                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Choose File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">Export Contacts</h2>
                        <p className="text-gray-600 mb-6">
                            Export {activeTab.toLowerCase()} contacts as a CSV file.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExportContacts}
                                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ContactsView;
