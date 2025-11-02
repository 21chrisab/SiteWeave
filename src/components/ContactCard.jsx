import React, { useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';

function ContactCard({ contact, onAction, actionType, onEdit, onDelete, showActions = false }) {
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const statusColor = contact.status === 'Available' ? 'bg-green-400' : 'bg-orange-400';

    const ActionButton = () => {
        if (!onAction) return <span className={`w-3 h-3 rounded-full ${statusColor}`} title={contact.status}></span>;
        
        if (actionType === 'add') {
            return (
                <button onClick={() => onAction(contact.id)} className="text-blue-500 hover:text-blue-700" title="Add to project">
                    <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-5 h-5" />
                </button>
            );
        }

        if (actionType === 'remove') {
            return (
                <button onClick={() => onAction(contact.id)} className="text-red-500 hover:text-red-700" title="Remove from project">
                    <Icon path="M19.5 12h-15" className="w-5 h-5" />
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
                {contact.avatar_url ? (
                    <img src={contact.avatar_url} alt={contact.name} className="w-10 h-10 rounded-full" />
                ) : (
                    <Avatar name={contact.name} size="lg" />
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold">{contact.name}</p>
                        {contact.email && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full" title={`Email: ${contact.email}`}>
                                <Icon path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" className="w-3 h-3" />
                                Email
                            </span>
                        )}
                    </div>
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
                            <Icon path="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                {onEdit && (
                                    <button
                                        onClick={handleEdit}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className="w-4 h-4" />
                                        Edit
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-4 h-4" />
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