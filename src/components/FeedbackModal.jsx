import React, { useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';

function FeedbackModal({ isOpen, onClose }) {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const [feedbackType, setFeedbackType] = useState('bug');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!subject.trim() || !message.trim()) {
            addToast('Please fill in both subject and message', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Save feedback to database
            const { error: dbError } = await supabaseClient
                .from('user_feedback')
                .insert({
                    user_id: state.user?.id,
                    user_email: state.user?.email,
                    user_name: state.user?.user_metadata?.full_name || state.user?.email,
                    feedback_type: feedbackType,
                    subject: subject.trim(),
                    message: message.trim(),
                    app_version: window.electronAPI?.getAppVersion ? await window.electronAPI.getAppVersion() : 'web',
                    status: 'new'
                });

            if (dbError) {
                throw dbError;
            }

            // Optionally send email notification (using existing send-email function)
            try {
                const feedbackTypeLabel = feedbackType === 'bug' ? 'Bug Report' : feedbackType === 'feature' ? 'Feature Request' : 'General Feedback';
                const appVersionValue = window.electronAPI?.getAppVersion ? await window.electronAPI.getAppVersion() : 'web';
                const emailHtml = `
                    <h2>New ${feedbackTypeLabel} from SiteWeave</h2>
                    <p><strong>From:</strong> ${state.user?.user_metadata?.full_name || state.user?.email} (${state.user?.email})</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${message}</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        App Version: ${appVersionValue}<br>
                        User ID: ${state.user?.id?.slice(0, 8)}...
                    </p>
                `;

                await supabaseClient.functions.invoke('send-email', {
                    body: {
                        to: ['abadie1221@gmail.com', 'brockcopeland2007@gmail.com'],
                        subject: `[SiteWeave ${feedbackTypeLabel}] ${subject}`,
                        html: emailHtml,
                        text: `${feedbackTypeLabel}\n\nFrom: ${state.user?.user_metadata?.full_name || state.user?.email}\nSubject: ${subject}\n\n${message}`
                    }
                });
            } catch (emailError) {
                // Email sending is optional, don't fail if it errors
                console.warn('Could not send feedback email:', emailError);
            }

            addToast('Thank you for your feedback! We\'ll review it soon.', 'success');
            
            // Reset form
            setSubject('');
            setMessage('');
            setFeedbackType('bug');
            onClose();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            addToast('Error submitting feedback: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setSubject('');
            setMessage('');
            setFeedbackType('bug');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Send Feedback</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Feedback Type
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="bug"
                                    checked={feedbackType === 'bug'}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                    className="mr-2"
                                    disabled={isSubmitting}
                                />
                                <span className="text-sm text-gray-700">Bug Report</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="feature"
                                    checked={feedbackType === 'feature'}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                    className="mr-2"
                                    disabled={isSubmitting}
                                />
                                <span className="text-sm text-gray-700">Feature Request</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="general"
                                    checked={feedbackType === 'general'}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                    className="mr-2"
                                    disabled={isSubmitting}
                                />
                                <span className="text-sm text-gray-700">General Feedback</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Brief summary of your feedback"
                            required
                            disabled={isSubmitting}
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Please provide details about the bug, feature idea, or general feedback..."
                            rows={8}
                            required
                            disabled={isSubmitting}
                            maxLength={2000}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {message.length}/2000 characters
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !subject.trim() || !message.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Icon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" className="w-4 h-4" />
                                    Send Feedback
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FeedbackModal;

