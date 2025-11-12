import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import DropboxSettings from '../components/DropboxSettings';
import packageJson from '../../package.json';

function SettingsView() {
  const { state, dispatch } = useAppContext();
  const { addToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [appVersion, setAppVersion] = useState(packageJson.version);
  
  // Form states
  const [fullName, setFullName] = useState(state.user?.user_metadata?.full_name || '');
  const [title, setTitle] = useState(state.user?.user_metadata?.title || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Get app version dynamically
  useEffect(() => {
    const fetchVersion = async () => {
      // Try to get version from Electron API if available
      if (window.electronAPI?.getAppVersion) {
        try {
          const version = await window.electronAPI.getAppVersion();
          if (version) {
            setAppVersion(version);
            return;
          }
        } catch (error) {
          console.log('Could not get version from Electron API, using package.json version');
        }
      }
      // Fallback to package.json version
      setAppVersion(packageJson.version);
    };

    fetchVersion();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        data: {
          full_name: fullName,
          title: title
        }
      });

      if (error) {
        addToast('Error updating profile: ' + error.message, 'error');
      } else {
        addToast('Profile updated successfully!', 'success');
        // Update the user in context
        dispatch({ 
          type: 'SET_USER', 
          payload: {
            ...state.user,
            user_metadata: {
              ...state.user.user_metadata,
              full_name: fullName,
              title: title
            }
          }
        });
      }
    } catch (error) {
      addToast('Error updating profile: ' + error.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        addToast('Error changing password: ' + error.message, 'error');
      } else {
        addToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      addToast('Error changing password: ' + error.message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      addToast('Error signing out: ' + error.message, 'error');
    } else {
      addToast('Signed out successfully', 'success');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div 
          data-onboarding="profile-section"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <Avatar 
              name={state.user?.user_metadata?.full_name || state.user?.email} 
              size="xl"
            />
            <div>
              <h3 className="font-semibold text-gray-900">
                {state.user?.user_metadata?.full_name || state.user?.email}
              </h3>
              <p className="text-sm text-gray-500">{state.user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Project Manager"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <LoadingSpinner size="sm" text="" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Security</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <LoadingSpinner size="sm" text="" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Account Actions</h3>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DropboxSettings />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">More Integrations</h3>
              <p className="text-sm text-gray-500">Additional storage and service integrations</p>
            </div>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">More integrations coming soon!</p>
            <p className="text-sm text-gray-400">Google Drive, OneDrive, and other cloud storage providers will be available in future updates.</p>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">About SiteWeave</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Version:</span> {appVersion}
          </div>
          <div>
            <span className="font-medium">User ID:</span> {state.user?.id?.slice(0, 8)}...
          </div>
          <div>
            <span className="font-medium">Account Created:</span> {new Date(state.user?.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
