import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

/**
 * Invitation Acceptance Landing Page
 * Handles invitation acceptance with support for both new and existing users
 * Redirects to org page after successful acceptance
 * 
 * Features:
 * - Auto-accepts if user is already authenticated with matching email
 * - Creates/links contact record when accepting invitations
 * - Supports new user signup and existing user login
 * - Last updated: 2026-01-09
 */
function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    console.log('InviteAcceptPage mounted, token:', token);
    
    if (!token) {
      console.error('No token found in URL params');
      setError('Invalid invitation link: missing token');
      setLoading(false);
      setCheckingAuth(false);
      return;
    }
    
    checkAuthAndLoadInvitation();
  }, [token]);

  // Check if user is already authenticated
  const checkAuthAndLoadInvitation = async () => {
    setCheckingAuth(true);
    try {
      console.log('Checking authentication...');
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      console.log('Session check result:', { hasSession: !!session, hasUser: !!session?.user });
      
      if (session?.user) {
        // User is authenticated, check if they can auto-accept
        console.log('User is authenticated, loading invitation for auto-accept');
        await loadInvitation(true, session.user);
      } else {
        // User is not authenticated, load invitation normally
        console.log('User not authenticated, loading invitation normally');
        await loadInvitation(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setError(`Failed to check authentication: ${error.message}`);
      setLoading(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadInvitation = async (isAuthenticated = false, currentUser = null) => {
    if (!token) {
      console.error('loadInvitation called without token');
      setError('Invalid invitation link: missing token');
      setLoading(false);
      return;
    }
    
    console.log('Loading invitation with token:', token);
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          organizations (name),
          roles (name)
        `)
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();
      
      console.log('Invitation query result:', { data: !!data, error: error?.message });

      if (error) {
        console.error('Error loading invitation:', error);
        setError(`Failed to load invitation: ${error.message || 'Invalid or expired invitation link. Please ask your admin for a new one.'}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Invalid or expired invitation link. Please ask your admin for a new one.');
        setLoading(false);
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired. Please ask your admin for a new one.');
        return;
      }

      setInvitation(data);

      // If user is authenticated and email matches, auto-accept
      if (isAuthenticated && currentUser) {
        if (currentUser.email?.toLowerCase() === data.email.toLowerCase()) {
          // Email matches, auto-accept the invitation
          await autoAcceptInvitation(data, currentUser);
          return;
        } else {
          // User is authenticated but email doesn't match
          setError(`This invitation was sent to ${data.email}, but you're signed in as ${currentUser.email}. Please sign out and sign in with the correct email, or ask for a new invitation.`);
          return;
        }
      }

      // Check if user exists by attempting to find their profile
      // Note: We can't reliably check if a user exists from the client
      // Default to new user form. If signup fails with "User already registered",
      // we'll handle it in the error handler
      setUserExists(false);
    } catch (error) {
      console.error('Error loading invitation:', error);
      
      if (!invitation) {
        setError('Failed to load invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-accept invitation for already authenticated users
  const autoAcceptInvitation = async (invitationData, user) => {
    setAccepting(true);
    try {
      // Step 1: Ensure contact exists and is linked to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('contact_id')
        .eq('id', user.id)
        .single();

      let contactId = profile?.contact_id;

      if (!contactId) {
        // Check if contact exists with this email in the organization
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .ilike('email', invitationData.email)
          .eq('organization_id', invitationData.organization_id)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: user.user_metadata?.full_name || invitationData.email.split('@')[0] || 'User',
              email: invitationData.email,
              role: 'Team Member',
              type: 'Team',
              organization_id: invitationData.organization_id,
              status: 'Available',
              created_by_user_id: user.id
            })
            .select('id')
            .single();

          if (contactError) throw contactError;
          contactId = newContact.id;
        }

        // Link contact to profile
        await supabase
          .from('profiles')
          .update({ contact_id: contactId })
          .eq('id', user.id);
      }

      // Step 2: Update the invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationData.id);

      if (updateError) throw updateError;

      // Step 3: Update the user's profile with organization and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: invitationData.organization_id,
          role_id: invitationData.role_id
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Step 4: Redirect to dashboard/org page
      setMessage('Invitation accepted! Welcome to the organization.');
      // Reload the page to refresh app context with new organization
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error auto-accepting invitation:', error);
      setError(`Failed to accept invitation: ${error.message}`);
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptInvitation = async (e) => {
    e.preventDefault();
    
    if (userExists) {
      // Existing user: login to claim invite
      if (!loginPassword) {
        setError('Please enter your password');
        return;
      }

      setAccepting(true);
      setError(null);
      try {
        // Step 1: Sign in the existing user
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: loginPassword
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Incorrect password. Please try again.');
          } else {
            throw signInError;
          }
          return;
        }

        // Step 2: Ensure contact exists and is linked
        const { data: profile } = await supabase
          .from('profiles')
          .select('contact_id')
          .eq('id', authData.user.id)
          .single();

        let contactId = profile?.contact_id;

        if (!contactId) {
          // Check if contact exists with this email in the organization
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', invitation.email)
            .eq('organization_id', invitation.organization_id)
            .maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;
          } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: authData.user.user_metadata?.full_name || invitation.email.split('@')[0] || 'User',
                email: invitation.email,
                role: 'Team Member',
                type: 'Team',
                organization_id: invitation.organization_id,
                status: 'Available',
                created_by_user_id: authData.user.id
              })
              .select('id')
              .single();

            if (contactError) throw contactError;
            contactId = newContact.id;
          }

          // Link contact to profile
          await supabase
            .from('profiles')
            .update({ contact_id: contactId })
            .eq('id', authData.user.id);
        }

        // Step 3: Update the invitation status
        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        // Step 4: Update the user's profile with organization and role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: invitation.organization_id,
            role_id: invitation.role_id
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // Redirect to dashboard/org page
        setMessage('Invitation accepted! Welcome to the organization.');
        // Reload the page to refresh app context with new organization
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (error) {
        console.error('Error accepting invitation:', error);
        setError(`Failed to accept invitation: ${error.message}`);
      } finally {
        setAccepting(false);
      }
    } else {
      // New user: create account with password
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      setAccepting(true);
      setError(null);
      try {
        // Step 1: Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: invitation.email,
          password: password,
          options: {
            data: {
              invitation_token: token,
              organization_id: invitation.organization_id,
              role_id: invitation.role_id
            }
          }
        });

        if (signUpError) {
          // If user already exists, switch to login mode
          if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
            setUserExists(true);
            setError('An account with this email already exists. Please sign in to claim this invitation.');
            return;
          }
          throw signUpError;
        }

        // Step 2: Ensure contact exists and is linked
        // Wait a moment for profile to be created by Supabase trigger
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('contact_id')
          .eq('id', authData.user.id)
          .maybeSingle();

        let contactId = profile?.contact_id;

        if (!contactId) {
          // Check if contact exists with this email in the organization
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', invitation.email)
            .eq('organization_id', invitation.organization_id)
            .maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;
          } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: authData.user.user_metadata?.full_name || invitation.email.split('@')[0] || 'User',
                email: invitation.email,
                role: 'Team Member',
                type: 'Team',
                organization_id: invitation.organization_id,
                status: 'Available',
                created_by_user_id: authData.user.id
              })
              .select('id')
              .single();

            if (contactError) throw contactError;
            contactId = newContact.id;
          }

          // Link contact to profile
          await supabase
            .from('profiles')
            .update({ contact_id: contactId })
            .eq('id', authData.user.id);
        }

        // Step 3: Update the invitation status
        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        // Step 4: Update the user's profile with organization and role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: invitation.organization_id,
            role_id: invitation.role_id
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // Redirect to dashboard/org page
        setMessage('Account created and invitation accepted! Welcome to SiteWeave.');
        // Reload the page to refresh app context with new organization
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (error) {
        console.error('Error accepting invitation:', error);
        setError(`Failed to accept invitation: ${error.message}`);
      } finally {
        setAccepting(false);
      }
    }
  };

  // Early return if no token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid Invitation Link</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">The invitation link is missing a token. Please check the link and try again.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading invitation..." />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Don't render form if invitation is not loaded
  if (!invitation && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading invitation..." />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || 'Unable to load invitation'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Welcome to SiteWeave</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Join <strong>{invitation.organizations?.name || 'the organization'}</strong>
            {invitation.roles?.name && (
              <> as a <strong>{invitation.roles.name}</strong></>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!userExists && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6">
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              <strong>Create your account:</strong> Set a password to get started. You'll be automatically added to the organization.
            </p>
          </div>
        )}

        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {userExists ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                disabled={accepting}
              />
              <p className="mt-1 text-xs text-gray-500">
                You already have an account. Sign in to claim this invitation.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Create Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  minLength={8}
                  disabled={accepting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  minLength={8}
                  disabled={accepting}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={accepting}
          >
            {accepting 
              ? (userExists ? 'Claiming invitation...' : 'Setting up your account...') 
              : (userExists ? 'Claim Invitation' : 'Accept Invitation')
            }
          </button>
        </form>
      </div>
    </div>
  );
}

export default InviteAcceptPage;
