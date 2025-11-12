import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import MessageItem from '../components/MessageItem';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import dropboxStorage from '../utils/dropboxStorage';

function MessagesView() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const activeChannel = state.messageChannels.find(ch => ch.id === state.selectedChannelId);
    const channelMessages = state.messages.filter(msg => msg.channel_id === state.selectedChannelId);

    const getProjectForChannel = (channelId) => state.projects.find(p => p.id === state.messageChannels.find(c => c.id === channelId)?.project_id);
    const getTeamCount = (projectId) => state.contacts.filter(c => c.project_contacts.some(pc => pc.project_id === projectId)).length;
    
    // Get team members for the active channel's project
    const project = getProjectForChannel(activeChannel?.id);
    const teamMembers = state.contacts.filter(contact => 
        contact.project_contacts && contact.project_contacts.some(pc => pc.project_id === project?.id) && contact.type === 'Team'
    );

    // Filter contacts for mentions
    const filteredContacts = state.contacts.filter(contact => 
        contact.name.toLowerCase().includes(mentionQuery.toLowerCase()) &&
        contact.project_contacts.some(pc => pc.project_id === activeChannel?.project_id)
    );

    useEffect(() => {
        if (!state.selectedChannelId && state.messageChannels.length > 0) {
            dispatch({ type: 'SET_CHANNEL', payload: state.messageChannels[0].id });
        }
    }, [state.messageChannels, state.selectedChannelId, dispatch]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        const project = getProjectForChannel(state.selectedChannelId);
        if (project && project.notification_count > 0) {
            supabaseClient.from('projects').update({ notification_count: 0 }).eq('id', project.id).then(() => {});
        }
    }, [channelMessages, state.selectedChannelId]);

    const handleSendMessage = async (file = null) => {
        const content = newMessage.trim();
        if (!activeChannel || (!content && !file)) return;

        let messageData = { 
            channel_id: activeChannel.id, 
            user_id: state.user.id, 
            content, 
            type: 'text' 
        };

        if (file) {
            // Check if Dropbox is connected
            if (!state.dropboxConnected) {
                addToast('Please connect to Dropbox in Settings to upload files', 'error');
                return;
            }

            setIsUploading(true);
            try {
                const fileName = `${Date.now()}_${file.name}`;
                const uploadResult = await dropboxStorage.uploadFile(file, `/messages/${activeChannel.id}`, fileName);
                
                messageData.file_url = uploadResult.sharedUrl;
                messageData.file_name = file.name;
                messageData.type = file.type.startsWith('image') ? 'image' : 'file';
            } catch (error) {
                addToast('Upload error: ' + error.message, 'error');
                setIsUploading(false);
                return;
            }
        }

        const { error } = await supabaseClient.from('messages').insert(messageData);
        if (error) {
            addToast('Error sending message: ' + error.message, 'error');
        } else {
            addToast('Message sent successfully!', 'success');
        }
        setNewMessage('');
        setIsUploading(false);
    };

    const handleFileChange = e => e.target.files[0] && handleSendMessage(e.target.files[0]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        setNewMessage(value);
        
        // Check for @mentions
        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (mentionMatch) {
            setShowMentions(true);
            setMentionQuery(mentionMatch[1]);
            setMentionPosition(cursorPosition);
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (contact) => {
        const textBeforeMention = newMessage.substring(0, mentionPosition - mentionQuery.length - 1);
        const textAfterMention = newMessage.substring(mentionPosition);
        const newText = `${textBeforeMention}@${contact.name} ${textAfterMention}`;
        
        setNewMessage(newText);
        setShowMentions(false);
        
        // Focus back to input
        setTimeout(() => {
            messageInputRef.current?.focus();
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
        
        if (showMentions && e.key === 'Escape') {
            setShowMentions(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            <aside 
                data-onboarding="message-channels"
                className="w-80 bg-white rounded-l-xl shadow-sm border border-gray-200 flex flex-col p-4"
            >
                <h2 className="text-xl font-bold mb-4 px-2">Projects</h2>
                <ul className="space-y-1">
                    {state.messageChannels.map(channel => {
                        const project = getProjectForChannel(channel.id);
                        return (
                            <li key={channel.id} onClick={() => dispatch({ type: 'SET_CHANNEL', payload: channel.id })}
                                className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer ${state.selectedChannelId === channel.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}>
                                <span className="font-semibold"># {project?.name || channel.name}</span>
                                {project?.notification_count > 0 && <span className="bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">{project.notification_count}</span>}
                            </li>
                        );
                    })}
                </ul>
            </aside>
            <main className="flex-1 bg-white rounded-r-xl shadow-sm border-t border-r border-b border-gray-200 flex flex-col">
                {activeChannel ? (
                    <>
                        <header className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg"># {getProjectForChannel(activeChannel.id)?.name}</h3>
                                <p className="text-sm text-gray-500">{getTeamCount(activeChannel.project_id)} members</p>
                            </div>
                            {teamMembers.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {teamMembers.slice(0, 5).map(member => (
                                            member.avatar_url ? (
                                                <img 
                                                    key={member.id} 
                                                    src={member.avatar_url} 
                                                    title={member.name} 
                                                    alt={member.name}
                                                    className="w-8 h-8 rounded-full border-2 border-white" 
                                                />
                                            ) : (
                                                <Avatar key={member.id} name={member.name} size="md" className="border-2 border-white" />
                                            )
                                        ))}
                                    </div>
                                    {teamMembers.length > 5 && (
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 -ml-2 border-2 border-white">
                                            +{teamMembers.length - 5}
                                        </div>
                                    )}
                                </div>
                            )}
                        </header>
                        <div 
                            data-onboarding="chat-area"
                            className="flex-1 p-6 overflow-y-auto"
                        >
                            {channelMessages.map(msg => <MessageItem key={msg.id} message={msg} />)}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t bg-gray-50 relative">
                            <div className="flex items-center gap-4">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                <button 
                                    onClick={() => fileInputRef.current.click()} 
                                    disabled={isUploading} 
                                    className="text-gray-500 hover:text-blue-600 disabled:opacity-50"
                                    title="Attach file"
                                >
                                    <Icon path="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" className="w-6 h-6" />
                                </button>
                                
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={messageInputRef}
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message... (use @ to mention team members)"
                                        data-onboarding="message-input"
                                        className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows="1"
                                        disabled={isUploading}
                                        style={{ minHeight: '44px', maxHeight: '120px' }}
                                    />
                                    
                                    {/* Mentions Dropdown */}
                                    {showMentions && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                                            {filteredContacts.length > 0 ? (
                                                filteredContacts.map(contact => (
                                                    <button
                                                        key={contact.id}
                                                        onClick={() => handleMentionSelect(contact)}
                                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                                                    >
                                                        <img 
                                                            src={contact.avatar_url} 
                                                            alt={contact.name} 
                                                            className="w-6 h-6 rounded-full" 
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm">{contact.name}</div>
                                                            <div className="text-xs text-gray-500">{contact.role}</div>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-gray-500 text-sm">
                                                    No team members found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => handleSendMessage()} 
                                    disabled={!newMessage.trim() || isUploading} 
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isUploading ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                            
                            {/* Message Threading Indicator */}
                            <div className="mt-2 text-xs text-gray-500">
                                Press Enter to send, Shift+Enter for new line
                            </div>
                        </div>
                    </>
                ) : <div className="flex-1 flex items-center justify-center text-gray-500">Select a channel to start messaging.</div>}
            </main>
        </div>
    );
}

export default MessagesView;