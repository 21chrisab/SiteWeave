import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function AddContactModal({ onClose, onSave, contact = null, isLoading = false }) {
    const isEditMode = !!contact;
    
    const [name, setName] = useState(contact?.name || '');
    const [role, setRole] = useState(contact?.role || '');
    const [type, setType] = useState(contact?.type || 'Team');
    const [company, setCompany] = useState(contact?.company || '');
    const [trade, setTrade] = useState(contact?.trade || '');
    const [avatarUrl, setAvatarUrl] = useState(contact?.avatar_url || '');
    const [email, setEmail] = useState(contact?.email || '');
    const [phone, setPhone] = useState(contact?.phone || '');
    const [status, setStatus] = useState(contact?.status || 'Available');

    useEffect(() => {
        if (contact) {
            setName(contact.name || '');
            setRole(contact.role || '');
            setType(contact.type || 'Team');
            setCompany(contact.company || '');
            setTrade(contact.trade || '');
            setAvatarUrl(contact.avatar_url || '');
            setEmail(contact.email || '');
            setPhone(contact.phone || '');
            setStatus(contact.status || 'Available');
        }
    }, [contact]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const contactData = {
            name,
            role,
            type,
            company: type === 'Subcontractor' ? company : 'SiteWeave',
            trade: type === 'Subcontractor' ? trade : 'Internal',
            avatar_url: avatarUrl || `https://i.pravatar.cc/150?u=${name.replace(/\s/g, '_').toLowerCase()}`,
            email,
            phone,
            status
        };
        
        if (isEditMode) {
            contactData.id = contact.id;
        }
        
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">
                    {isEditMode ? 'Edit Contact' : 'Add New Contact'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Name *</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Role *</label>
                            <input 
                                type="text" 
                                value={role} 
                                onChange={e => setRole(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                required 
                            />
                        </div>
                    </div>

                    {/* Contact Type and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Contact Type</label>
                            <select 
                                value={type} 
                                onChange={e => setType(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Team">Team Member</option>
                                <option value="Subcontractor">Subcontractor</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Status</label>
                            <select 
                                value={status} 
                                onChange={e => setStatus(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Available">Available</option>
                                <option value="Busy">Busy</option>
                                <option value="Offline">Offline</option>
                            </select>
                        </div>
                    </div>

                    {/* Company and Trade (for Subcontractors) */}
                    {type === 'Subcontractor' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Company</label>
                                <input 
                                    type="text" 
                                    value={company} 
                                    onChange={e => setCompany(e.target.value)} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold mb-1">Trade</label>
                                <input 
                                    type="text" 
                                    value={trade} 
                                    onChange={e => setTrade(e.target.value)} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                />
                            </div>
                        </div>
                    )}

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Phone</label>
                            <input 
                                type="tel" 
                                value={phone} 
                                onChange={e => setPhone(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            />
                        </div>
                    </div>

                    {/* Avatar */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Avatar URL (Optional)</label>
                        <input 
                            type="url" 
                            value={avatarUrl} 
                            onChange={e => setAvatarUrl(e.target.value)} 
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            placeholder="https://example.com/avatar.jpg"
                        />
                        {avatarUrl && (
                            <div className="mt-2 flex items-center gap-2">
                                <img 
                                    src={avatarUrl} 
                                    alt="Avatar preview" 
                                    className="w-8 h-8 rounded-full"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <span className="text-xs text-gray-500">Preview</span>
                            </div>
                        )}
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
                                    {isEditMode ? 'Updating...' : 'Adding...'}
                                </>
                            ) : (
                                isEditMode ? 'Update Contact' : 'Add Contact'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddContactModal;
