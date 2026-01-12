import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

/**
 * Update Password Screen
 * Handles password setup for new users who clicked invitation magic links
 * 
 * Features:
 * - Protected route (requires active session from magic link)
 * - Password setup form with validation
 * - Updates user profile metadata
 * - Handles edge case: already registered users are redirected immediately
 * - Last updated: 2026-01-09
 */
function UpdatePasswordScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSessionAndUserStatus();
  }, []);

  const checkSessionAndUserStatus = async () => {
    setCheckingSession(true);
    try {
      // Check if user has active session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        navigate('/login?error=' + encodeURIComponent('Please sign in to continue'));
        return;
      }

      if (!currentSession) {
        // No session, redirect to login
        navigate('/login?error=' + encodeURIComponent('Please sign in to complete your account setup'));
        return;
      }

      setSession(currentSession);

      // Check if user is already fully registered
      // Check profile status to determine if user needs password setup
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine for new users
        console.error('Error checking profile:', profileError);
      }

      // If user has active status or profile exists, they're already registered
      // Redirect them to dashboard immediately (edge case: existing user clicking invite)
      if (profile && profile.status === 'active') {
        console.log('User already registered, redirecting to dashboard');
        navigate('/');
        return;
      }

      // Check if user already has a password set
      // If user can sign in with password, they don't need to set it again
      // For magic link users, we'll allow them to set password
      // The fact they're here means they came from a magic link, so proceed with password setup

      setLoading(false);
    } catch (error) {
      console.error('Error checking session:', error);
      navigate('/login?error=' + encodeURIComponent('Failed to verify authentication'));
    } finally {
      setCheckingSession(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!session) {
      setError('Session expired. Please try again.');
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Step 2: Profile update removed - profiles table doesn't have a status column
      // The profile is automatically created/updated via database triggers

      // Step 3: Show success message and redirect
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Setup Complete!</h2>
          <p className="text-gray-600 mb-6">Your account has been set up successfully. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Welcome to SiteWeave.</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Please set your account password to complete your registration.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
              minLength={8}
              disabled={submitting}
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
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 text-sm sm:text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={submitting}
          >
            {submitting ? 'Setting up your account...' : 'Complete Setup & Join Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UpdatePasswordScreen;
