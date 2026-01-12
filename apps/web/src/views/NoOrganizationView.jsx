import React from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';

function NoOrganizationView() {
  const { state, dispatch } = useAppContext();
  const { addToast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        addToast('Error signing out: ' + error.message, 'error');
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        addToast('Signed out successfully', 'success');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      addToast('Error signing out', 'error');
    }
  };

  // If user is a project collaborator, show different message
  if (state.isProjectCollaborator && state.collaborationProjects.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Icon 
                path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" 
                className="w-8 h-8 text-purple-600"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Guest Access</h1>
            <p className="text-gray-600">
              You have access to {state.collaborationProjects.length} project{state.collaborationProjects.length !== 1 ? 's' : ''} as a collaborator.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              You can access your assigned projects from the dashboard. If you need to join an organization, please contact your administrator.
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'Dashboard' })}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User has no organization and no project access
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Icon 
              path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
              className="w-8 h-8 text-red-600"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Organization Found</h1>
          <p className="text-gray-600">
            Your account is not associated with an organization or any projects.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            To access SiteWeave, you need to be:
          </p>
          <ul className="text-sm text-gray-600 text-left space-y-2 mb-6">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Invited to join an organization by an Organization Admin</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Added as a project collaborator on a specific project</span>
            </li>
          </ul>
          <p className="text-sm text-gray-500 mb-6">
            Please contact your administrator to be added to an organization or invited to a project.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoOrganizationView;
