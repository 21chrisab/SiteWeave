import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getOrganizationUsers, inviteUser, createUser, removeUserFromOrganization } from '../utils/userManagementService';
import { getRoles } from '../utils/roleManagementService';
import PermissionGuard from './PermissionGuard';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

/**
 * Directory Management Modal
 * Secure frontend component for managing organization's member directory
 * Requires can_manage_team permission
 */
function DirectoryManagementModal({ show, onClose }) {
  const { state } = useAppContext();
  const currentOrganization = state.currentOrganization;
  const user = state.user;
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invite via Email
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Create Managed Account
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    roleId: ''
  });
  
  // Edit Role
  const [editingUser, setEditingUser] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');

  useEffect(() => {
    if (show && currentOrganization?.id) {
      loadData();
    }
  }, [show, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        getOrganizationUsers(supabaseClient, currentOrganization.id),
        getRoles(supabaseClient, currentOrganization.id)
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading directory data:', error);
      addToast('Failed to load organization members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !currentOrganization?.id) return;

    setIsInviting(true);
    try {
      // Call edge function to verify permission
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/team-invite`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: inviteEmail,
            organizationId: currentOrganization.id,
            roleId: inviteRoleId || null
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast('Invitation sent successfully', 'success');
        setInviteEmail('');
        setInviteRoleId('');
        loadData();
      } else {
        addToast(result.error || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      addToast('Failed to send invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserData.email || !createUserData.password || !createUserData.fullName || !currentOrganization?.id) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/team-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: createUserData.email,
            password: createUserData.password,
            fullName: createUserData.fullName,
            organizationId: currentOrganization.id,
            roleId: createUserData.roleId || null
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast('User created successfully', 'success');
        setCreateUserData({ email: '', password: '', fullName: '', roleId: '' });
        setShowCreateForm(false);
        loadData();
      } else {
        addToast(result.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      addToast('Failed to create user', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId) => {
    if (!newRoleId || !currentOrganization?.id) {
      addToast('Please select a role', 'error');
      return;
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/team-update-role`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            organizationId: currentOrganization.id,
            roleId: newRoleId
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast('Role updated successfully', 'success');
        setEditingUser(null);
        setNewRoleId('');
        loadData();
      } else {
        addToast(result.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      addToast('Failed to update role', 'error');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/team-remove-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            organizationId: currentOrganization.id
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast('User removed successfully', 'success');
        loadData();
      } else {
        addToast(result.error || 'Failed to remove user', 'error');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      addToast('Failed to remove user', 'error');
    }
  };

  if (!show) return null;

  return (
    <PermissionGuard permission="can_manage_team">
      <Modal show={show} onClose={onClose} title="Manage Organization Directory" size="large">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Organization Directory:</strong> Add or remove employees from your company account.
          </p>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            {/* Invite via Email */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Invite via Email</h3>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Role (Optional)</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>

            {/* Create Managed Account */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Create Managed Account</h3>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showCreateForm ? 'Cancel' : 'Show Form'}
                </button>
              </div>
              {showCreateForm && (
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={createUserData.fullName}
                    onChange={(e) => setCreateUserData({ ...createUserData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={createUserData.password}
                    onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={8}
                  />
                  <select
                    value={createUserData.roleId}
                    onChange={(e) => setCreateUserData({ ...createUserData, roleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Role (Optional)</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isInviting ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              )}
            </div>

            {/* Organization Members List */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold">Organization Members ({users.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No organization members yet</div>
                ) : (
                  users.map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold">
                            {member.contacts?.name?.charAt(0) || member.id.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {member.contacts?.name || 'Unknown User'}
                            {member.id === user.id && (
                              <span className="ml-2 text-xs text-gray-500">(You)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{member.contacts?.email || 'No email'}</div>
                          <div className="text-xs text-gray-400">
                            Role: {member.roles?.name || 'No role assigned'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Edit Role */}
                        {editingUser === member.id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={newRoleId}
                              onChange={(e) => setNewRoleId(e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="">Select Role</option>
                              {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUpdateRole(member.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setNewRoleId('');
                              }}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(member.id);
                                setNewRoleId(member.role_id || '');
                              }}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                              disabled={member.id === user.id}
                            >
                              Edit Role
                            </button>
                            {member.id !== user.id && (
                              <button
                                onClick={() => handleRemoveUser(member.id)}
                                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PermissionGuard>
  );
}

export default DirectoryManagementModal;
