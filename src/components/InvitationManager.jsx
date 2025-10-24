import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getProjectInvitations, cancelInvitation, resendInvitation } from '../utils/invitationService';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

function InvitationManager({ projectId }) {
    const { addToast } = useToast();
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        loadInvitations();
    }, [projectId]);

    const loadInvitations = async () => {
        setIsLoading(true);
        const result = await getProjectInvitations(projectId);
        
        if (result.success) {
            setInvitations(result.invitations);
        } else {
            addToast('Failed to load invitations', 'error');
        }
        setIsLoading(false);
    };

    const handleResend = async (invitationId) => {
        setActionLoading({ ...actionLoading, [invitationId]: 'resend' });
        const result = await resendInvitation(invitationId);
        
        if (result.success) {
            addToast('Invitation resent successfully', 'success');
        } else {
            addToast(result.error || 'Failed to resend invitation', 'error');
        }
        
        setActionLoading({ ...actionLoading, [invitationId]: null });
    };

    const handleCancel = async (invitationId) => {
        setActionLoading({ ...actionLoading, [invitationId]: 'cancel' });
        const result = await cancelInvitation(invitationId);
        
        if (result.success) {
            addToast('Invitation cancelled', 'success');
            loadInvitations(); // Reload list
        } else {
            addToast(result.error || 'Failed to cancel invitation', 'error');
        }
        
        setActionLoading({ ...actionLoading, [invitationId]: null });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            accepted: 'bg-green-100 text-green-800',
            expired: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        return badges[status] || badges.pending;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const isExpired = (expiresAt) => {
        return new Date(expiresAt) < new Date();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner />
            </div>
        );
    }

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending' && !isExpired(inv.expires_at));
    const otherInvitations = invitations.filter(inv => inv.status !== 'pending' || isExpired(inv.expires_at));

    return (
        <div className="space-y-6">
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Pending Invitations</h3>
                    <div className="space-y-3">
                        {pendingInvitations.map(invitation => (
                            <div 
                                key={invitation.id} 
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon name="mail" className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-gray-900">{invitation.email}</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(invitation.status)}`}>
                                            {invitation.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Sent {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleResend(invitation.id)}
                                        disabled={actionLoading[invitation.id] === 'resend'}
                                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Resend invitation"
                                    >
                                        {actionLoading[invitation.id] === 'resend' ? (
                                            <LoadingSpinner size="sm" text="" />
                                        ) : (
                                            <>
                                                <Icon name="refresh-cw" className="w-4 h-4 inline mr-1" />
                                                Resend
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleCancel(invitation.id)}
                                        disabled={actionLoading[invitation.id] === 'cancel'}
                                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel invitation"
                                    >
                                        {actionLoading[invitation.id] === 'cancel' ? (
                                            <LoadingSpinner size="sm" text="" />
                                        ) : (
                                            <>
                                                <Icon name="x" className="w-4 h-4 inline mr-1" />
                                                Cancel
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Invitations */}
            {otherInvitations.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Past Invitations</h3>
                    <div className="space-y-2">
                        {otherInvitations.map(invitation => (
                            <div 
                                key={invitation.id} 
                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon name="mail" className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-700">{invitation.email}</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(
                                            isExpired(invitation.expires_at) ? 'expired' : invitation.status
                                        )}`}>
                                            {isExpired(invitation.expires_at) && invitation.status === 'pending' ? 'expired' : invitation.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {invitation.status === 'accepted' && invitation.accepted_at ? (
                                            `Accepted ${formatDate(invitation.accepted_at)}`
                                        ) : (
                                            `Sent ${formatDate(invitation.created_at)}`
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {invitations.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Icon name="mail" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No invitations yet</p>
                    <p className="text-sm text-gray-500 mt-1">Invite team members by assigning tasks to their email addresses</p>
                </div>
            )}
        </div>
    );
}

export default InvitationManager;





