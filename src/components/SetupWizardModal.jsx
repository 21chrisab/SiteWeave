import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getRoles, createRole, updateRole } from '../utils/roleManagementService';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';

/**
 * SetupWizardModal - Split-view setup wizard for new Organization Admins
 * Left: Role Configuration (Permissions)
 * Right: Member Assignment (Invite/Create Users)
 */

// Standard roles to configure
const STANDARD_ROLES = [
  {
    name: 'Org Admin',
    description: 'Full access to all features and team management',
    defaultPermissions: {
      can_manage_team: true,
      can_manage_roles: true,
      can_create_projects: true,
      can_edit_projects: true,
      can_delete_projects: true,
      can_view_financials: true,
      can_assign_tasks: true,
      can_view_reports: true,
      can_manage_contacts: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: true
    }
  },
  {
    name: 'Project Manager',
    description: 'Manage projects, tasks, and team assignments',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_roles: false,
      can_create_projects: true,
      can_edit_projects: true,
      can_delete_projects: false,
      can_view_financials: true,
      can_assign_tasks: true,
      can_view_reports: true,
      can_manage_contacts: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: true
    }
  },
  {
    name: 'Field Worker',
    description: 'View projects, complete tasks, and update progress',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_roles: false,
      can_create_projects: false,
      can_edit_projects: false,
      can_delete_projects: false,
      can_view_financials: false,
      can_assign_tasks: false,
      can_view_reports: true,
      can_manage_contacts: false,
      can_create_tasks: false,
      can_edit_tasks: true,
      can_delete_tasks: false
    }
  }
];

// All available permissions
const ALL_PERMISSIONS = [
  { key: 'can_manage_team', label: 'Manage Team', description: 'Invite and manage team members' },
  { key: 'can_manage_roles', label: 'Manage Roles', description: 'Create and edit custom roles' },
  { key: 'can_create_projects', label: 'Create Projects', description: 'Create new projects' },
  { key: 'can_edit_projects', label: 'Edit Projects', description: 'Modify existing projects' },
  { key: 'can_delete_projects', label: 'Delete Projects', description: 'Remove projects' },
  { key: 'can_view_financials', label: 'View Financials', description: 'Access financial data' },
  { key: 'can_assign_tasks', label: 'Assign Tasks', description: 'Assign tasks to team members' },
  { key: 'can_view_reports', label: 'View Reports', description: 'Access reports and analytics' },
  { key: 'can_manage_contacts', label: 'Manage Contacts', description: 'Add and edit contacts' },
  { key: 'can_create_tasks', label: 'Create Tasks', description: 'Create new tasks' },
  { key: 'can_edit_tasks', label: 'Edit Tasks', description: 'Modify existing tasks' },
  { key: 'can_delete_tasks', label: 'Delete Tasks', description: 'Remove tasks' }
];

function SetupWizardModal({ show, onComplete }) {
  const { state } = useAppContext();
  const { addToast } = useToast();
  const currentOrganization = state.currentOrganization;
  const user = state.user;

  // Wizard state
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [roles, setRoles] = useState([]); // Array of {roleName, permissions, members}
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Current role configuration
  const currentRoleTemplate = STANDARD_ROLES[currentRoleIndex];
  const currentRoleConfig = roles[currentRoleIndex] || {
    roleName: currentRoleTemplate.name,
    permissions: { ...currentRoleTemplate.defaultPermissions },
    members: []
  };

  // UI state
  const [showPermissions, setShowPermissions] = useState(false);
  const [inputMode, setInputMode] = useState('email'); // 'email' or 'managed'
  const [emailInput, setEmailInput] = useState('');
  const [managedInput, setManagedInput] = useState({
    fullName: '',
    username: '',
    password: ''
  });

  // Initialize roles from templates
  useEffect(() => {
    if (show && currentOrganization?.id) {
      const initialRoles = STANDARD_ROLES.map(template => ({
        roleName: template.name,
        permissions: { ...template.defaultPermissions },
        members: []
      }));
      setRoles(initialRoles);
    }
  }, [show, currentOrganization?.id]);

  // Update current role config when switching roles
  useEffect(() => {
    if (roles.length > 0 && !roles[currentRoleIndex]) {
      const template = STANDARD_ROLES[currentRoleIndex];
      const newRole = {
        roleName: template.name,
        permissions: { ...template.defaultPermissions },
        members: []
      };
      const updatedRoles = [...roles];
      updatedRoles[currentRoleIndex] = newRole;
      setRoles(updatedRoles);
    }
  }, [currentRoleIndex, roles]);

  const handlePermissionChange = (permissionKey, value) => {
    const updatedRoles = [...roles];
    if (!updatedRoles[currentRoleIndex]) {
      updatedRoles[currentRoleIndex] = {
        roleName: currentRoleTemplate.name,
        permissions: { ...currentRoleTemplate.defaultPermissions },
        members: []
      };
    }
    updatedRoles[currentRoleIndex].permissions[permissionKey] = value;
    setRoles(updatedRoles);
  };

  const handleAddMember = () => {
    if (inputMode === 'email') {
      if (!emailInput || !emailInput.includes('@')) {
        addToast('Please enter a valid email address', 'error');
        return;
      }
      
      const newMember = {
        id: `temp-${Date.now()}`,
        type: 'invite',
        email: emailInput.toLowerCase().trim(),
        fullName: '',
        username: '',
        password: ''
      };

      const updatedRoles = [...roles];
      if (!updatedRoles[currentRoleIndex]) {
        updatedRoles[currentRoleIndex] = {
          roleName: currentRoleTemplate.name,
          permissions: { ...currentRoleTemplate.defaultPermissions },
          members: []
        };
      }
      updatedRoles[currentRoleIndex].members.push(newMember);
      setRoles(updatedRoles);
      setEmailInput('');
      addToast('Member added to list', 'success');
    } else {
      // Managed account
      if (!managedInput.fullName || !managedInput.username || !managedInput.password) {
        addToast('Please fill in all fields', 'error');
        return;
      }

      // Generate a simple PIN (4-6 digits) if password is empty
      const pin = managedInput.password || Math.floor(1000 + Math.random() * 9000).toString();

      const newMember = {
        id: `temp-${Date.now()}`,
        type: 'managed',
        email: '',
        fullName: managedInput.fullName.trim(),
        username: managedInput.username.trim().toLowerCase(),
        password: pin,
        pin: pin
      };

      const updatedRoles = [...roles];
      if (!updatedRoles[currentRoleIndex]) {
        updatedRoles[currentRoleIndex] = {
          roleName: currentRoleTemplate.name,
          permissions: { ...currentRoleTemplate.defaultPermissions },
          members: []
        };
      }
      updatedRoles[currentRoleIndex].members.push(newMember);
      setRoles(updatedRoles);
      setManagedInput({ fullName: '', username: '', password: '' });
      addToast('Managed account added to list', 'success');
    }
  };

  const handleRemoveMember = (memberId) => {
    const updatedRoles = [...roles];
    if (updatedRoles[currentRoleIndex]) {
      updatedRoles[currentRoleIndex].members = updatedRoles[currentRoleIndex].members.filter(
        m => m.id !== memberId
      );
      setRoles(updatedRoles);
    }
  };

  const handleNext = () => {
    if (currentRoleIndex < STANDARD_ROLES.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setShowPermissions(false);
    }
  };

  const handleBack = () => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(currentRoleIndex - 1);
      setShowPermissions(false);
    }
  };

  const handleFinish = async () => {
    if (!currentOrganization?.id || !user?.id) {
      addToast('Organization or user context missing', 'error');
      return;
    }

    setIsFinishing(true);
    try {
      // Batch create all roles and members
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        addToast('Not authenticated', 'error');
        return;
      }

      // Create roles first
      const createdRoles = {};
      for (const roleConfig of roles) {
        const response = await fetch(
          `${supabaseClient.supabaseUrl}/functions/v1/team-create-role`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              organizationId: currentOrganization.id,
              roleName: roleConfig.roleName,
              permissions: roleConfig.permissions
            })
          }
        );

        const result = await response.json();
        if (result.success && result.roleId) {
          createdRoles[roleConfig.roleName] = result.roleId;
        }
      }

      // Then create/invite members
      for (const roleConfig of roles) {
        const roleId = createdRoles[roleConfig.roleName];
        if (!roleId) continue;

        for (const member of roleConfig.members) {
          if (member.type === 'invite') {
            // Invite via email
            const response = await fetch(
              `${supabaseClient.supabaseUrl}/functions/v1/team-invite`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  email: member.email,
                  organizationId: currentOrganization.id,
                  roleId: roleId
                })
              }
            );
            await response.json(); // Don't block on errors
          } else {
            // Create managed account
            const response = await fetch(
              `${supabaseClient.supabaseUrl}/functions/v1/team-create-user`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  email: member.username + '@' + currentOrganization.slug + '.siteweave.app', // Generate email
                  password: member.password,
                  fullName: member.fullName,
                  organizationId: currentOrganization.id,
                  roleId: roleId,
                  username: member.username
                })
              }
            );
            await response.json();
          }
        }
      }

      addToast('Setup complete! All roles and members have been created.', 'success');
      
      // Mark setup as complete
      if (user.id) {
        localStorage.setItem(`setup_complete_${user.id}`, 'true');
      }
      
      onComplete();
    } catch (error) {
      console.error('Error finishing setup:', error);
      addToast('Error completing setup: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsFinishing(false);
    }
  };

  const handlePrintCards = async () => {
    // Collect all managed accounts
    const managedAccounts = [];
    roles.forEach(roleConfig => {
      roleConfig.members.forEach(member => {
        if (member.type === 'managed') {
          managedAccounts.push({
            ...member,
            roleName: roleConfig.roleName,
            organizationName: currentOrganization?.name || 'Organization'
          });
        }
      });
    });

    if (managedAccounts.length === 0) {
      addToast('No managed accounts to print', 'error');
      return;
    }

    // Dynamically import PDF generator
    try {
      const { generateCredentialCards } = await import('../utils/pdfGenerator');
      await generateCredentialCards(managedAccounts, currentOrganization);
      addToast('Credential cards generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast('Error generating PDF. Please check console for credentials.', 'error');
    }
  };

  if (!show) return null;

  const canGoNext = currentRoleIndex < STANDARD_ROLES.length - 1;
  const canGoBack = currentRoleIndex > 0;
  const isLastRole = currentRoleIndex === STANDARD_ROLES.length - 1;

  return (
    <Modal show={show} onClose={() => {}} title="Welcome! Set Up Your Organization" size="xlarge">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6 pb-4 border-b">
          {STANDARD_ROLES.map((role, idx) => (
            <React.Fragment key={role.name}>
              <div className={`flex items-center ${idx <= currentRoleIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx < currentRoleIndex ? 'bg-blue-600 text-white' :
                  idx === currentRoleIndex ? 'bg-blue-100 text-blue-700 border-2 border-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {idx < currentRoleIndex ? '✓' : idx + 1}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:inline">{role.name}</span>
              </div>
              {idx < STANDARD_ROLES.length - 1 && (
                <div className={`w-8 h-0.5 ${idx < currentRoleIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column: Role Configuration */}
          <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{currentRoleConfig.roleName}</h3>
              <p className="text-sm text-gray-600">{currentRoleTemplate.description}</p>
            </div>

            {/* Permissions Accordion */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Customize Permissions</span>
                <Icon 
                  path={showPermissions ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                  className="w-5 h-5 text-gray-500"
                />
              </button>

              {showPermissions && (
                <div className="p-4 border-t border-gray-200 space-y-3 max-h-96 overflow-y-auto">
                  {ALL_PERMISSIONS.map(perm => (
                    <label
                      key={perm.key}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={currentRoleConfig.permissions[perm.key] || false}
                        onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{perm.label}</div>
                        <div className="text-xs text-gray-500">{perm.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Member Assignment */}
          <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Who belongs in this role?
              </h3>
              <p className="text-sm text-gray-500">
                Add team members by email invitation or create managed accounts
              </p>
            </div>

            {/* Input Mode Switch */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInputMode('email')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'email'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Invite via Email
              </button>
              <button
                onClick={() => setInputMode('managed')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'managed'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Create Managed Account
              </button>
            </div>

            {/* Input Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              {inputMode === 'email' ? (
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddMember}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={managedInput.fullName}
                    onChange={(e) => setManagedInput({ ...managedInput, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Username (e.g., josh.millerco)"
                    value={managedInput.username}
                    onChange={(e) => setManagedInput({ ...managedInput, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="PIN/Password (optional, auto-generated if empty)"
                      value={managedInput.password}
                      onChange={(e) => setManagedInput({ ...managedInput, password: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">
                  Members ({currentRoleConfig.members.length})
                </h4>
              </div>
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {currentRoleConfig.members.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No members added yet
                  </div>
                ) : (
                  currentRoleConfig.members.map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        {member.type === 'email' ? (
                          <div>
                            <div className="font-medium text-gray-900">{member.email}</div>
                            <div className="text-xs text-gray-500">Email invitation</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">{member.fullName}</div>
                            <div className="text-xs text-gray-500">
                              {member.username} • PIN: {member.password || member.pin}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="ml-4 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {isLastRole && (
              <button
                onClick={handlePrintCards}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Print Cards
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            {isLastRole ? (
              <button
                onClick={handleFinish}
                disabled={isFinishing}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFinishing ? 'Finishing...' : 'Finish'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}


export default SetupWizardModal;
