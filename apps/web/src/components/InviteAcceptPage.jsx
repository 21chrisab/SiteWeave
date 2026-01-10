import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

/**
 * Invitation Acceptance Page
 * Handles the "One-Time Setup Link" flow where new users set their password
 */
function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Always render something - never return null
  console.log('InviteAcceptPage render:', { token, loading, hasInvitation: !!invitation, error, message });

  useEffect(() => {
    console.log('InviteAcceptPage mounted, token:', token);
    if (!token) {
      console.error('No token found in URL params');
      setError('Invalid invitation link: missing token');
      setLoading(false);
      return;
    }
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      loadInvitation();
    }, 100);
    return () => clearTimeout(timer);
  }, [token]);

  const loadInvitation = async () => {
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
          roles!fk_invitations_role_id (name)
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
        setLoading(false);
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error('Error loading invitation:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(`Failed to load invitation: ${error.message || 'An unexpected error occurred. Please try again or contact support.'}`);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setAccepting(true);
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
        // If user already exists, they should sign in instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in to claim this invitation.');
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('User account creation failed');
      }

      // For invitation flows, auto-confirm the user so they can sign in immediately
      // This bypasses email confirmation requirements
      try {
        const { data: confirmResult, error: confirmError } = await supabase.functions.invoke('auto-confirm-user', {
          body: { userId: authData.user.id }
        });

        if (confirmError) {
          console.warn('Failed to auto-confirm user (may require email confirmation):', confirmError);
          // Continue anyway - user might need to confirm email
        } else if (confirmResult?.success) {
          console.log('User auto-confirmed successfully');
        }
      } catch (confirmErr) {
        console.warn('Error calling auto-confirm-user:', confirmErr);
        // Continue anyway
      }

      // Wait a moment for profile to be created by Supabase trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Ensure contact exists and is linked to profile
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
          // Create new contact using edge function to bypass RLS
          // This is needed because the user might not have a session yet
          const { data: contactResult, error: contactError } = await supabase.functions.invoke('create-contact-for-invitation', {
            body: {
              userId: authData.user.id,
              email: invitation.email,
              name: authData.user.user_metadata?.full_name || invitation.email.split('@')[0] || 'User',
              organizationId: invitation.organization_id
            }
          });

          if (contactError) {
            console.error('Error calling create-contact-for-invitation:', contactError);
            // Try to get more details from the error
            const errorMessage = contactError.message || 'Failed to create contact';
            const errorDetails = contactError.context || contactError;
            console.error('Error details:', errorDetails);
            throw new Error(`${errorMessage}. Check Supabase function logs for details.`);
          }

          if (!contactResult) {
            throw new Error('Failed to create contact: No response from server');
          }

          if (!contactResult.success) {
            const errorMsg = contactResult.error || 'Unknown error';
            console.error('Function returned error:', contactResult);
            throw new Error(`Failed to create contact: ${errorMsg}`);
          }

          if (!contactResult.contactId) {
            throw new Error('Failed to create contact: Invalid response from server (no contactId)');
          }

          contactId = contactResult.contactId;
        }

        // Link contact to profile - use edge function if no session, otherwise direct update
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          await supabase
            .from('profiles')
            .update({ contact_id: contactId })
            .eq('id', authData.user.id);
        } else {
          // If no session, the profile update will happen when user signs in
          // The contact is already created, so we can proceed
          console.log('No session available, contact created via edge function. Profile will be updated on first login.');
        }
      }

      // Step 3: Try to sign in the user to establish a session
      // This ensures we have a session for subsequent operations
      let session = authData.session;
      if (!session) {
        // Try to sign in with the password they just created
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: password
        });

        if (signInError) {
          // If sign-in fails, user might need email confirmation
          console.warn('Failed to sign in after signup:', signInError);
          setMessage('Account created! Please check your email to confirm your account, then sign in to complete the invitation.');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        session = signInData?.session;
      }

      // Step 4: Update the invitation status and profile (now that we have a session)
      if (session) {
        // Update invitation status
        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        // Update the user's profile with organization and role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: invitation.organization_id,
            role_id: invitation.role_id,
            status: 'active',
            contact_id: contactId
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      } else {
        // No session - this shouldn't happen if auto-confirm worked
        throw new Error('Failed to establish session. Please try signing in manually.');
      }

      setMessage(`Welcome to ${invitation.organizations?.name || 'the organization'}!`);
      
      // Step 5: Navigate to the main app
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    console.log('InviteAcceptPage: Loading state', { loading, hasToken: !!token });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading invitation..." />
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

  if (error && !invitation) {
    console.error('InviteAcceptPage: Error state without invitation', { error, token });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Final fallback - if we still don't have an invitation and no error is set, show error
  if (!invitation && !loading) {
    console.error('InviteAcceptPage: No invitation loaded and no error state', { token, error, loading });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Unable to Load Invitation</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || 'Unable to load invitation. Please check the link and try again.'}</p>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
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
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={accepting}
          >
            {accepting ? 'Setting up your account...' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InviteAcceptPage;
