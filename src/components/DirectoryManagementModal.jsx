import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getOrganizationUsers, inviteUser, createUser, removeUserFromOrganization } from '../utils/userManagementService';
import { getRoles } from '../utils/roleManagementService';
import PermissionGuard from './PermissionGuard';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import CredentialCard from './CredentialCard';
import Icon from './Icon';
import Avatar from './Avatar';

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState('invite'); // 'invite' or 'create'
  
  // Invite via Email
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: ''
  });
  const [isInviting, setIsInviting] = useState(false);
  
  // Create Managed Account
  const [createUserData, setCreateUserData] = useState({
    fullName: '',
    username: '',
    password: '',
    roleId: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  
  // Edit Role
  const [editingUser, setEditingUser] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');
  
  // Track failed image loads for avatars
  const [failedImages, setFailedImages] = useState(new Set());
  
  const handleImageError = (memberId) => {
    setFailedImages(prev => new Set(prev).add(memberId));
  };
  
  // Generate 6-digit PIN
  const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number (100000-999999)
  };

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

  // Set default role to "Member" when roles are loaded and generate PIN for managed accounts
  useEffect(() => {
    if (roles.length > 0) {
      const memberRole = roles.find(r => r.name === 'Member' || r.name === 'member');
      if (memberRole) {
        // Set default for invite form if not set
        setInviteData(prev => prev.roleId ? prev : { ...prev, roleId: memberRole.id });
        // Set default for create form if not set, and generate PIN if password is empty
        setCreateUserData(prev => {
          const updates = prev.roleId ? {} : { roleId: memberRole.id };
          if (!prev.password) {
            updates.password = generatePIN();
          }
          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);
  
  // Generate PIN when switching to create tab
  useEffect(() => {
    if (activeTab === 'create' && !createUserData.password) {
      setCreateUserData(prev => ({ ...prev, password: generatePIN() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Auto-generate username from full name
  useEffect(() => {
    if (activeTab === 'create' && createUserData.fullName) {
      const nameParts = createUserData.fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const suggestedUsername = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
        if (createUserData.username === '' || createUserData.username === createUserData.fullName.toLowerCase().replace(/[^a-z0-9.]/g, '')) {
          setCreateUserData(prev => ({ ...prev, username: suggestedUsername }));
        }
      }
    }
  }, [createUserData.fullName, activeTab]);

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Limit to 10 digits (US phone number)
    const phoneNumberDigits = phoneNumber.slice(0, 10);
    
    // Format: (XXX) XXX-XXXX
    if (phoneNumberDigits.length === 0) return '';
    if (phoneNumberDigits.length <= 3) return `(${phoneNumberDigits}`;
    if (phoneNumberDigits.length <= 6) return `(${phoneNumberDigits.slice(0, 3)}) ${phoneNumberDigits.slice(3)}`;
    return `(${phoneNumberDigits.slice(0, 3)}) ${phoneNumberDigits.slice(3, 6)}-${phoneNumberDigits.slice(6)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setInviteData({ ...inviteData, phone: formatted });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteData.email || !currentOrganization?.id) {
      addToast('Email is required', 'error');
      return;
    }
    if (!inviteData.firstName) {
      addToast('First name is required', 'error');
      return;
    }
    if (!inviteData.roleId) {
      addToast('Role is required', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const metadata = {};
      if (inviteData.firstName) metadata.first_name = inviteData.firstName;
      if (inviteData.lastName) metadata.last_name = inviteData.lastName;
      if (inviteData.phone) {
        // Store phone number without formatting (digits only)
        metadata.phone = inviteData.phone.replace(/\D/g, '');
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
            email: inviteData.email,
            organizationId: currentOrganization.id,
            roleId: inviteData.roleId || null,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to send invitation';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || `Server error: ${response.status}`;
        }
        addToast(errorMessage, 'error');
        setIsInviting(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        if (result.emailSent) {
          addToast('Personalized invitation sent successfully!', 'success');
        } else if (result.emailError) {
          addToast(`Invitation created but email failed: ${result.emailError}. Share this link: ${result.setupUrl}`, 'warning');
        } else {
          addToast('Invitation created successfully. Email service not configured.', 'warning');
        }
        // Reset form but keep default role (Member) if available
        const memberRole = roles.find(r => r.name === 'Member' || r.name === 'member');
        setInviteData({ 
          firstName: '', 
          lastName: '', 
          email: '', 
          phone: '', 
          roleId: memberRole?.id || '' 
        });
        loadData();
      } else {
        addToast(result.error || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      addToast(`Failed to send invitation: ${error.message || 'Network error'}`, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserData.fullName || !createUserData.username || !createUserData.password || !currentOrganization?.id) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    if (!createUserData.roleId) {
      addToast('Role is required', 'error');
      return;
    }

    // Validate PIN is 6 digits
    if (!/^\d{6}$/.test(createUserData.password)) {
      addToast('PIN must be exactly 6 digits', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      const selectedRole = roles.find(r => r.id === createUserData.roleId);

      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/team-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullName: createUserData.fullName,
            username: createUserData.username,
            password: createUserData.password,
            organizationId: currentOrganization.id,
            roleId: createUserData.roleId || null
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Show credential card
        setCreatedCredentials({
          fullName: createUserData.fullName,
          username: createUserData.username,
          password: createUserData.password,
          email: result.email || null,
          roleName: selectedRole?.name || 'No role assigned'
        });
        
        // Reset form but keep default role (Member) if available, and generate new PIN
        const memberRole = roles.find(r => r.name === 'Member' || r.name === 'member');
        setCreateUserData({ 
          fullName: '', 
          username: '', 
          password: generatePIN(), 
          roleId: memberRole?.id || '' 
        });
        loadData();
      } else {
        addToast(result.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      addToast('Failed to create user', 'error');
    } finally {
      setIsCreating(false);
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
        ) : createdCredentials ? (
          <CredentialCard
            fullName={createdCredentials.fullName}
            username={createdCredentials.username}
            password={createdCredentials.password}
            email={createdCredentials.email}
            roleName={createdCredentials.roleName}
            onClose={() => setCreatedCredentials(null)}
          />
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('invite')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invite'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Invite via Email
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create Managed Account (no email)
                </button>
              </nav>
            </div>

            {/* Invite via Email Tab */}
            {activeTab === 'invite' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-gray-900">Invite via Email</h3>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={inviteData.firstName}
                        onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={inviteData.lastName}
                        onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="john.doe@example.com"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={inviteData.phone}
                      onChange={handlePhoneChange}
                      maxLength={14}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Role
                    </label>
                    <select
                      value={inviteData.roleId}
                      onChange={(e) => setInviteData({ ...inviteData, roleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {isInviting ? 'Sending...' : 'Send Personalized Invite'}
                  </button>
                </form>
              </div>
            )}

            {/* Create Managed Account Tab */}
            {activeTab === 'create' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-gray-900">Create Managed Account (no email)</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={createUserData.fullName}
                      onChange={(e) => setCreateUserData({ ...createUserData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="john.doe"
                      value={createUserData.username}
                      onChange={(e) => setCreateUserData({ ...createUserData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-suggested from name. Only letters, numbers, dots, and underscores.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary PIN <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={createUserData.password}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-lg font-semibold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setCreateUserData(prev => ({ ...prev, password: generatePIN() }))}
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                        title="Generate new PIN"
                      >
                        <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-generated 6-digit PIN. User will be required to change this on first login.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Role
                    </label>
                    <select
                      value={createUserData.roleId}
                      onChange={(e) => setCreateUserData({ ...createUserData, roleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {isCreating ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              </div>
            )}

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
                        <div className="flex-shrink-0">
                          {member.contacts?.avatar_url && !failedImages.has(member.id) ? (
                            <img
                              src={member.contacts.avatar_url}
                              alt={member.contacts?.name || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={() => handleImageError(member.id)}
                            />
                          ) : (
                            <Avatar 
                              name={member.contacts?.name || 'User'} 
                              size="md"
                            />
                          )}
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
                            {/* Don't allow editing role for Org Admins */}
                            {member.roles?.name !== 'Org Admin' && (
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
                            )}
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
