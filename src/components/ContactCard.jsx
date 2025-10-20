import React, { useState } from 'react';
import Icon from './Icon';

function ContactCard({ contact, onAction, actionType, onEdit, onDelete, showActions = false }) {
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const statusColor = contact.status === 'Available' ? 'bg-green-400' : 'bg-orange-400';

    const ActionButton = () => {
        if (!onAction) return <span className={`w-3 h-3 rounded-full ${statusColor}`} title={contact.status}></span>;
        
        if (actionType === 'add') {
            return (
                <button onClick={() => onAction(contact.id)} className="text-blue-500 hover:text-blue-700" title="Add to project">
                    <Icon name="plus" className="w-5 h-5" />
                </button>
            );
        }

        if (actionType === 'remove') {
            return (
                <button onClick={() => onAction(contact.id)} className="text-red-500 hover:text-red-700" title="Remove from project">
                    <Icon name="minus" className="w-5 h-5" />
                </button>
            );
        }
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        if (onEdit) onEdit(contact);
        setShowActionsMenu(false);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(contact);
        setShowActionsMenu(false);
    };

    return (
        <li className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group relative">
            <div className="flex items-center gap-3 flex-1">
                <img src={contact.avatar_url} alt={contact.name} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.role}</p>
                    {contact.company && contact.company !== 'SiteWeave' && (
                        <p className="text-xs text-gray-400">{contact.company}</p>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <ActionButton />
                
                {showActions && (onEdit || onDelete) && (
                    <div className="relative">
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Icon name="more-vertical" className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                {onEdit && (
                                    <button
                                        onClick={handleEdit}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Icon name="edit" className="w-4 h-4" />
                                        Edit
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}

export default ContactCard;