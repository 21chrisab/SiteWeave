import React, { useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

function MessageItem({ message, onEdit, onDelete }) {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || '');
    const [showReactions, setShowReactions] = useState(false);
    const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);
    
    const isCurrentUser = message.user_id === state.user.id;
    const user = message.user || message.user_id;

    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const formatDate = (isoString) => new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const handleEditMessage = async () => {
        if (!editContent.trim()) return;
        
        setIsUpdatingMessage(true);
        const { error } = await supabaseClient
            .from('messages')
            .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
            .eq('id', message.id);
        
        if (error) {
            addToast('Error updating message: ' + error.message, 'error');
        } else {
            addToast('Message updated successfully!', 'success');
            setIsEditing(false);
        }
        setIsUpdatingMessage(false);
    };

    const handleDeleteMessage = async () => {
        setIsDeletingMessage(true);
        const { error } = await supabaseClient
            .from('messages')
            .delete()
            .eq('id', message.id);
        
        if (error) {
            addToast('Error deleting message: ' + error.message, 'error');
        } else {
            addToast('Message deleted successfully!', 'success');
        }
        setIsDeletingMessage(false);
    };

    const handleAddReaction = async (emoji) => {
        const { error } = await supabaseClient
            .from('message_reactions')
            .insert({
                message_id: message.id,
                user_id: state.user.id,
                emoji: emoji
            });
        
        if (error) {
            addToast('Error adding reaction: ' + error.message, 'error');
        }
        setShowReactions(false);
    };

    const handleMention = (content) => {
        // Extract @mentions from content
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }
        
        return mentions;
    };

    const renderContentWithMentions = (content) => {
        if (!content) return null;
        
        const mentionRegex = /@(\w+)/g;
        const parts = content.split(mentionRegex);
        
        return parts.map((part, index) => {
            if (index % 2 === 1) {
                // This is a mention
                const contact = state.contacts.find(c => c.name.toLowerCase().includes(part.toLowerCase()));
                return (
                    <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
                        @{part}
                    </span>
                );
            }
            return part;
        });
    };

    // Handle special "Imported from Outlook" message
    if (message.content.startsWith('RE:')) {
        return (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg my-2 max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-blue-800">Imported from Outlook <span className="font-normal text-gray-500 text-xs ml-2">{formatTime(message.created_at)}</span></p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{message.content}</p>
            </div>
        );
    }
    
    return (
        <div className={`flex items-start gap-3 my-4 group ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
            <img src={user?.avatar_url || 'https://i.pravatar.cc/150?u=anonymous'} alt={user?.name} className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-1 max-w-lg">
                <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'self-end' : ''}`}>
                    {!isCurrentUser && <span className="font-bold text-sm">{user?.name}</span>}
                    <span className="text-xs text-gray-400">
                        {formatTime(message.created_at)}
                        {message.edited_at && (
                            <span className="ml-1 text-gray-300">(edited)</span>
                        )}
                    </span>
                </div>
                
                <div className={`p-3 rounded-lg relative ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full p-2 border rounded-lg text-gray-900 resize-none"
                                rows="3"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEditMessage}
                                    disabled={isUpdatingMessage || !editContent.trim()}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isUpdatingMessage ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(message.content || '');
                                    }}
                                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {message.content && (
                                <p className="text-sm whitespace-pre-wrap">
                                    {renderContentWithMentions(message.content)}
                                </p>
                            )}
                            
                            {message.type === 'image' && message.file_url && (
                                <img 
                                    src={message.file_url} 
                                    alt={message.file_name || 'Attached image'} 
                                    className="mt-2 rounded-lg max-w-xs cursor-pointer" 
                                    onClick={() => window.open(message.file_url, '_blank')} 
                                />
                            )}
                            
                            {message.type === 'file' && message.file_url && (
                                <a href={message.file_url} target="_blank" rel="noopener noreferrer" 
                                   className={`flex items-center gap-2 mt-2 p-2 rounded-md ${isCurrentUser ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                    <Icon name="paperclip" className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate">{message.file_name}</span>
                                </a>
                            )}

                            {/* Message Actions */}
                            {isCurrentUser && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1 bg-black bg-opacity-20 rounded-lg p-1">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                                            title="Edit message"
                                        >
                                            <Icon name="edit" className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleDeleteMessage}
                                            disabled={isDeletingMessage}
                                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded text-red-300 hover:text-red-200"
                                            title="Delete message"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-2 mt-1">
                    <button
                        onClick={() => setShowReactions(!showReactions)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                        <Icon name="smile" className="w-4 h-4" />
                    </button>
                    
                    {showReactions && (
                        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                            {EMOJI_REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleAddReaction(emoji)}
                                    className="text-lg hover:scale-125 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessageItem;