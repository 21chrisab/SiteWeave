import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseClient } from '../context/AppContext';
import { acceptInvitation } from '../utils/invitationService';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';

function AcceptInvitationView() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [invitation, setInvitation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAccepting, setIsAccepting] = useState(false);
    
    // Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('invitations')
                .select(`
                    *,
                    projects:project_id (name, address),
                    project_issues:issue_id (title, description)
                `)
                .eq('invitation_token', token)
                .single();

            if (error || !data) {
                setError('Invalid invitation link');
                setIsLoading(false);
                return;
            }

            // Check if expired
            if (new Date(data.expires_at) < new Date()) {
                setError('This invitation has expired');
                setIsLoading(false);
                return;
            }

            // Check if already accepted
            if (data.status === 'accepted') {
                setError('This invitation has already been accepted');
                setIsLoading(false);
                return;
            }

            setInvitation(data);
            setEmail(data.email); // Pre-fill email
            setIsLoading(false);
        } catch (err) {
            console.error('Error loading invitation:', err);
            setError('Failed to load invitation');
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsAccepting(true);

        try {
            // Sign up the user
            const { data: authData, error: signUpError } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
                setIsAccepting(false);
                return;
            }

            // Accept the invitation
            const result = await acceptInvitation(token, authData.user.id);

            if (!result.success) {
                setError(result.error);
                setIsAccepting(false);
                return;
            }

            // Navigate to the project
            if (result.projectId) {
                navigate(`/projects/${result.projectId}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Error accepting invitation:', err);
            setError(err.message);
            setIsAccepting(false);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setIsAccepting(true);

        try {
            // Sign in the user
            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (signInError) {
                setError(signInError.message);
                setIsAccepting(false);
                return;
            }

            // Accept the invitation
            const result = await acceptInvitation(token, authData.user.id);

            if (!result.success) {
                setError(result.error);
                setIsAccepting(false);
                return;
            }

            // Navigate to the project
            if (result.projectId) {
                navigate(`/projects/${result.projectId}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Error accepting invitation:', err);
            setError(err.message);
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <LoadingSpinner size="lg" text="Loading invitation..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="alert-circle" className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 bg-white rounded-xl shadow-xl overflow-hidden">
                {/* Left Side - Invitation Details */}
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white flex flex-col justify-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4">
                            <Icon name="mail" className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
                        <p className="text-blue-100 text-lg">Join your team on SiteWeave</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                            <p className="text-sm text-blue-100 mb-1">Project</p>
                            <p className="font-semibold text-lg">{invitation?.projects?.name}</p>
                            {invitation?.projects?.address && (
                                <p className="text-sm text-blue-100 mt-1">{invitation.projects.address}</p>
                            )}
                        </div>

                        {invitation?.project_issues && (
                            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                                <p className="text-sm text-blue-100 mb-1">Task Assignment</p>
                                <p className="font-semibold">{invitation.project_issues.title}</p>
                                <p className="text-sm text-blue-100 mt-1">{invitation.project_issues.description}</p>
                            </div>
                        )}

                        <div className="flex items-start gap-3 pt-4">
                            <Icon name="check" className="w-5 h-5 text-green-300 mt-0.5" />
                            <div>
                                <p className="font-medium">Instant Collaboration</p>
                                <p className="text-sm text-blue-100">Access project files, tasks, and team communication</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Auth Form */}
                <div className="p-8 flex flex-col justify-center">
                    <div className="mb-6">
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setIsSignUp(true)}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    isSignUp 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => setIsSignUp(false)}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    !isSignUp 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Sign In
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-gray-600">
                            {isSignUp 
                                ? 'Get started with SiteWeave' 
                                : 'Sign in to accept your invitation'}
                        </p>
                    </div>

                    <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={isSignUp} // Email is pre-filled for invitations
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                minLength={6}
                                placeholder={isSignUp ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isAccepting}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isAccepting ? (
                                <>
                                    <LoadingSpinner size="sm" text="" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isSignUp ? 'Accept Invitation & Sign Up' : 'Accept Invitation & Sign In'}
                                    <Icon name="arrow-right" className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-xs text-gray-500 text-center mt-6">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AcceptInvitationView;






