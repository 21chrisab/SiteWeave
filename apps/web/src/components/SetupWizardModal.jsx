import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getRoles, createRole, updateRole } from '../utils/roleManagementService';
import { getAllRolePresets } from '../utils/rolePresets';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';
import RoleCreationModal from './RoleCreationModal';

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

// Critical permissions (shown on role card)
const CRITICAL_PERMISSIONS = [
  { key: 'can_view_financials', label: 'View Financials', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'can_delete_projects', label: 'Delete Projects', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
  { key: 'can_manage_team', label: 'Manage Organization Directory', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
];

// All available permissions
const ALL_PERMISSIONS = [
  { key: 'can_manage_team', label: 'Manage Organization Directory', description: 'Add or remove employees from your company account' },
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
  const [roles, setRoles] = useState([]); // Array of {roleName, permissions, members, isCustom, description}
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showAddRoleDropdown, setShowAddRoleDropdown] = useState(false);
  const [showRolePresetDropdown, setShowRolePresetDropdown] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState(false);
  const [tempRoleName, setTempRoleName] = useState('');
  const addRoleButtonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showCreateCustomRoleModal, setShowCreateCustomRoleModal] = useState(false);
  const [isCreatingCustomRole, setIsCreatingCustomRole] = useState(false);

  // Get all roles (standard + custom)
  const allRoles = roles.length > 0 ? roles : STANDARD_ROLES.map(t => ({
    roleName: t.name,
    permissions: { ...t.defaultPermissions },
    members: [],
    isCustom: false,
    description: t.description
  }));

  // Current role configuration
  const currentRoleConfig = allRoles[currentRoleIndex] || {
    roleName: 'New Role',
    permissions: {},
    members: [],
    isCustom: true,
    description: ''
  };

  // UI state
  const [showPermissions, setShowPermissions] = useState(false);
  const [inputMode, setInputMode] = useState('email'); // 'email' or 'managed'
  const [emailInput, setEmailInput] = useState('');
  const [managedInput, setManagedInput] = useState({
    fullName: '',
    username: '' // Username is optional, will be auto-generated if blank
  });
  const [previewCredentials, setPreviewCredentials] = useState(null);

  // Initialize roles from templates
  useEffect(() => {
    if (show && currentOrganization?.id) {
      const initialRoles = STANDARD_ROLES.map(template => ({
        roleName: template.name,
        permissions: { ...template.defaultPermissions },
        members: [],
        isCustom: false,
        description: template.description
      }));
      setRoles(initialRoles);
    }
  }, [show, currentOrganization?.id]);

  // Initialize temp role name when editing
  useEffect(() => {
    if (editingRoleName) {
      setTempRoleName(currentRoleConfig.roleName);
    }
  }, [editingRoleName, currentRoleConfig.roleName]);

  // Handle adding role from preset
  const handleAddRoleFromPreset = (preset) => {
    const newRole = {
      roleName: preset.defaultName,
      permissions: { ...preset.defaultPermissions },
      members: [],
      isCustom: true,
      description: preset.description
    };
    const updatedRoles = [...roles];
    updatedRoles.push(newRole);
    setRoles(updatedRoles);
    setCurrentRoleIndex(updatedRoles.length - 1);
    setShowRolePresetDropdown(false);
    setShowAddRoleDropdown(false);
    setShowPermissions(false);
    addToast(`Added "${preset.defaultName}" role`, 'success');
  };

  // Handle opening role library
  const handleBrowseRoleLibrary = () => {
    setShowAddRoleDropdown(false);
    setShowRolePresetDropdown(true);
  };

  // Handle creating custom role from dropdown
  const handleCreateCustomRoleFromDropdown = () => {
    setShowAddRoleDropdown(false);
    setShowCreateCustomRoleModal(true);
  };

  // Handle creating custom role
  const handleCreateCustomRole = async (roleData) => {
    if (!currentOrganization?.id) {
      addToast('Organization not found', 'error');
      return;
    }

    setIsCreatingCustomRole(true);
    try {
      // Create role in database
      const createdRole = await createRole(
        supabaseClient,
        currentOrganization.id,
        roleData.name,
        roleData.permissions
      );

      // Add to local state for wizard
      const newRole = {
        roleName: roleData.name,
        permissions: { ...roleData.permissions },
        members: [],
        isCustom: true,
        description: 'Custom role',
        id: createdRole.id // Store the database ID
      };
      const updatedRoles = [...roles];
      updatedRoles.push(newRole);
      setRoles(updatedRoles);
      setCurrentRoleIndex(updatedRoles.length - 1);
      setShowCreateCustomRoleModal(false);
      setShowPermissions(false);
      addToast(`Created "${roleData.name}" role`, 'success');
    } catch (error) {
      console.error('Error creating custom role:', error);
      addToast('Failed to create custom role', 'error');
    } finally {
      setIsCreatingCustomRole(false);
    }
  };

  // Handle duplicating a role
  const handleDuplicateRole = (roleIndex) => {
    const roleToDuplicate = roles[roleIndex];
    const duplicatedRole = {
      roleName: `${roleToDuplicate.roleName} (Copy)`,
      permissions: { ...roleToDuplicate.permissions },
      members: [],
      isCustom: true,
      description: roleToDuplicate.description || ''
    };
    const updatedRoles = [...roles];
    updatedRoles.push(duplicatedRole);
    setRoles(updatedRoles);
    setCurrentRoleIndex(updatedRoles.length - 1);
    setShowPermissions(false);
    addToast(`Duplicated "${roleToDuplicate.roleName}" role`, 'success');
  };

  // Handle renaming a role
  const handleRenameRole = () => {
    if (!tempRoleName.trim()) {
      addToast('Role name cannot be empty', 'error');
      return;
    }
    const updatedRoles = [...roles];
    updatedRoles[currentRoleIndex] = {
      ...updatedRoles[currentRoleIndex],
      roleName: tempRoleName.trim()
    };
    setRoles(updatedRoles);
    setEditingRoleName(false);
    addToast('Role renamed successfully', 'success');
  };

  const handlePermissionChange = (permissionKey, value) => {
    const updatedRoles = [...roles];
    if (!updatedRoles[currentRoleIndex]) {
      const template = STANDARD_ROLES[currentRoleIndex] || {
        name: 'New Role',
        defaultPermissions: {},
        description: ''
      };
      updatedRoles[currentRoleIndex] = {
        roleName: template.name,
        permissions: { ...template.defaultPermissions },
        members: [],
        isCustom: false,
        description: template.description
      };
    }
    updatedRoles[currentRoleIndex].permissions[permissionKey] = value;
    setRoles(updatedRoles);
  };

  // Update preview credentials when name changes (use ref to avoid regenerating PIN)
  const previewPinRef = useRef(null);

  // Generate username from full name
  const generateUsername = (fullName, orgSlug) => {
    if (!fullName) return '';
    const slug = fullName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(Boolean)
      .join('.');
    return slug || 'user';
  };

  // Generate 5-digit PIN
  const generatePIN = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };
  
  // Generate PIN immediately when switching to managed mode
  useEffect(() => {
    if (inputMode === 'managed') {
      // Generate PIN immediately when switching to managed mode
      if (!previewPinRef.current) {
        previewPinRef.current = generatePIN();
      }
    } else {
      previewPinRef.current = null; // Reset when switching modes
    }
  }, [inputMode]);
  
  useEffect(() => {
    if (inputMode === 'managed' && managedInput.fullName) {
      const orgSlug = currentOrganization?.slug || '';
      const username = managedInput.username || generateUsername(managedInput.fullName, orgSlug);
      // Use the pre-generated PIN
      const pin = previewPinRef.current || generatePIN();
      if (!previewPinRef.current) {
        previewPinRef.current = pin;
      }
      setPreviewCredentials({
        fullName: managedInput.fullName,
        username: username,
        pin: pin
      });
    } else if (inputMode === 'managed') {
      // Show PIN even without a name (for immediate display)
      const pin = previewPinRef.current || generatePIN();
      if (!previewPinRef.current) {
        previewPinRef.current = pin;
      }
      setPreviewCredentials({
        fullName: '',
        username: '',
        pin: pin
      });
    } else {
      setPreviewCredentials(null);
    }
  }, [managedInput.fullName, managedInput.username, inputMode, currentOrganization?.slug || '']);

  const handleBulkEmailAdd = (emailText) => {
    const emails = emailText
      .split(',')
      .map(e => e.trim())
      .filter(e => e.includes('@'));
    
    if (emails.length === 0) {
      addToast('No valid email addresses found', 'error');
      return;
    }

    const updatedRoles = [...roles];
    if (!updatedRoles[currentRoleIndex]) {
      updatedRoles[currentRoleIndex] = {
        roleName: currentRoleTemplate.name,
        permissions: { ...currentRoleTemplate.defaultPermissions },
        members: []
      };
    }

    const newMembers = emails.map(email => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      type: 'invite',
      email: email.toLowerCase(),
      fullName: '',
      username: '',
      password: ''
    }));

    updatedRoles[currentRoleIndex].members.push(...newMembers);
    setRoles(updatedRoles);
    setEmailInput('');
    addToast(`${emails.length} email${emails.length > 1 ? 's' : ''} added to list`, 'success');
  };

  const handleAddMember = () => {
    if (inputMode === 'email') {
      if (!emailInput) {
        addToast('Please enter an email address', 'error');
        return;
      }

      // Check if it's a bulk entry (contains commas)
      if (emailInput.includes(',')) {
        handleBulkEmailAdd(emailInput);
        return;
      }

      if (!emailInput.includes('@')) {
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
        const template = STANDARD_ROLES[currentRoleIndex] || {
          name: 'New Role',
          defaultPermissions: {},
          description: ''
        };
        updatedRoles[currentRoleIndex] = {
          roleName: template.name,
          permissions: { ...template.defaultPermissions },
          members: [],
          isCustom: false,
          description: template.description
        };
      }
      updatedRoles[currentRoleIndex].members.push(newMember);
      setRoles(updatedRoles);
      setEmailInput('');
      addToast('Member added to list', 'success');
    } else {
      // Managed account
      if (!managedInput.fullName) {
        addToast('Please enter a full name', 'error');
        return;
      }

      // Always auto-generate 5-digit PIN
      const pin = previewPinRef.current || generatePIN();
      if (!previewPinRef.current) {
        previewPinRef.current = pin;
      }
      
      // Auto-generate username if blank
      const username = managedInput.username.trim() || generateUsername(managedInput.fullName, currentOrganization?.slug);

      const newMember = {
        id: `temp-${Date.now()}`,
        type: 'managed',
        email: '',
        fullName: managedInput.fullName.trim(),
        username: username.trim().toLowerCase(),
        password: pin,
        pin: pin
      };

      const updatedRoles = [...roles];
      if (!updatedRoles[currentRoleIndex]) {
        const template = STANDARD_ROLES[currentRoleIndex] || {
          name: 'New Role',
          defaultPermissions: {},
          description: ''
        };
        updatedRoles[currentRoleIndex] = {
          roleName: template.name,
          permissions: { ...template.defaultPermissions },
          members: [],
          isCustom: false,
          description: template.description
        };
      }
      updatedRoles[currentRoleIndex].members.push(newMember);
      setRoles(updatedRoles);
      // Reset form and generate new PIN for next entry
      setManagedInput({ fullName: '', username: '' });
      previewPinRef.current = null; // Reset PIN so a new one is generated for next entry
      setPreviewCredentials(null);
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
    if (currentRoleIndex < allRoles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setShowPermissions(false);
      setEditingRoleName(false);
    }
  };

  const handleBack = () => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(currentRoleIndex - 1);
      setShowPermissions(false);
      setEditingRoleName(false);
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

      // Create roles first using direct Supabase client (bypasses edge function CORS issues)
      // First, get existing roles to avoid duplicates
      const existingRoles = await getRoles(supabaseClient, currentOrganization.id);
      const existingRolesMap = new Map(existingRoles.map(r => [r.name.toLowerCase(), r.id]));
      
      const createdRoles = {};
      for (const roleConfig of roles) {
        try {
          // Check if role already exists
          const roleNameLower = roleConfig.roleName.toLowerCase();
          if (existingRolesMap.has(roleNameLower)) {
            // Role already exists, use existing role ID
            createdRoles[roleConfig.roleName] = existingRolesMap.get(roleNameLower);
            console.log(`Role "${roleConfig.roleName}" already exists, using existing role`);
          } else {
            // Create new role
            const createdRole = await createRole(
              supabaseClient,
              currentOrganization.id,
              roleConfig.roleName,
              roleConfig.permissions
            );
            if (createdRole && createdRole.id) {
              createdRoles[roleConfig.roleName] = createdRole.id;
              // Add to map to avoid duplicates in same batch
              existingRolesMap.set(roleNameLower, createdRole.id);
            }
          }
        } catch (error) {
          console.error(`Error creating role ${roleConfig.roleName}:`, error);
          // If it's a duplicate error, try to find the existing role
          if (error.code === '23505' || error.message?.includes('duplicate key')) {
            try {
              const existingRolesRetry = await getRoles(supabaseClient, currentOrganization.id);
              const existingRole = existingRolesRetry.find(r => r.name.toLowerCase() === roleConfig.roleName.toLowerCase());
              if (existingRole) {
                createdRoles[roleConfig.roleName] = existingRole.id;
                console.log(`Found existing role "${roleConfig.roleName}" after duplicate error`);
              } else {
                addToast(`Role "${roleConfig.roleName}" already exists but could not be found`, 'error');
              }
            } catch (retryError) {
              addToast(`Failed to create role "${roleConfig.roleName}": ${error.message}`, 'error');
            }
          } else {
            addToast(`Failed to create role "${roleConfig.roleName}": ${error.message}`, 'error');
          }
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

  // Update dropdown position when button position changes
  useEffect(() => {
    if ((showAddRoleDropdown || showRolePresetDropdown) && addRoleButtonRef.current) {
      const updatePosition = () => {
        if (addRoleButtonRef.current) {
          const rect = addRoleButtonRef.current.getBoundingClientRect();
          // Use fixed positioning relative to viewport (getBoundingClientRect already gives viewport coords)
          setDropdownPosition({
            top: rect.bottom + 8, // 8px margin below button
            left: rect.left
          });
        }
      };
      // Update position immediately
      updatePosition();
      // Update on scroll and resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      // Reset position when dropdowns close
      setDropdownPosition({ top: 0, left: 0 });
    }
  }, [showAddRoleDropdown, showRolePresetDropdown]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (showAddRoleDropdown || showRolePresetDropdown) {
      const handleClickOutside = (e) => {
        if (
          addRoleButtonRef.current &&
          !addRoleButtonRef.current.contains(e.target) &&
          !e.target.closest('.add-role-dropdown-portal') &&
          !e.target.closest('.role-preset-dropdown-portal')
        ) {
          setShowAddRoleDropdown(false);
          setShowRolePresetDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddRoleDropdown, showRolePresetDropdown]);

  if (!show) return null;

  const canGoNext = currentRoleIndex < allRoles.length - 1;
  const canGoBack = currentRoleIndex > 0;
  const isLastRole = currentRoleIndex === allRoles.length - 1;

  return (
    <Modal show={show} onClose={() => {}} title="Welcome! Set Up Your Organization" size="xlarge">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Progress Indicator - Refactored with pinned button */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          {/* Left: Scrollable Role Tabs */}
          <div className="flex-1 flex items-center space-x-2 overflow-x-auto pr-4">
            {allRoles.map((role, idx) => (
              <React.Fragment key={`${role.roleName}-${idx}`}>
                <div className={`flex items-center flex-shrink-0 ${idx <= currentRoleIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    idx < currentRoleIndex ? 'bg-blue-600 text-white' :
                    idx === currentRoleIndex ? 'bg-blue-100 text-blue-700 border-2 border-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {idx < currentRoleIndex ? '✓' : idx + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">{role.roleName}</span>
                </div>
                {idx < allRoles.length - 1 && (
                  <div className={`w-8 h-0.5 flex-shrink-0 ${idx < currentRoleIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Right: Pinned Add Role Button */}
          <div className="flex-shrink-0" ref={addRoleButtonRef}>
            <button
              onClick={() => {
                // If role preset dropdown is open, close both dropdowns
                if (showRolePresetDropdown) {
                  setShowRolePresetDropdown(false);
                  setShowAddRoleDropdown(false);
                } else {
                  // Otherwise, toggle the main dropdown
                  setShowAddRoleDropdown(!showAddRoleDropdown);
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-1"
              title="Add Role"
            >
              <Icon path="M12 4v16m8-8H4" className="w-4 h-4" />
              <span>Add Role</span>
            </button>
          </div>
        </div>

        {/* Add Role Dropdown Menu - Rendered via Portal */}
        {showAddRoleDropdown && typeof document !== 'undefined' && createPortal(
          <div
            className="add-role-dropdown-portal fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] w-56"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="p-1">
              <button
                onClick={handleBrowseRoleLibrary}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Icon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Browse Role Library</span>
              </button>
              <button
                onClick={handleCreateCustomRoleFromDropdown}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Icon path="M12 4v16m8-8H4" className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Create Custom Role</span>
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Role Preset Dropdown - Rendered via Portal */}
        {showRolePresetDropdown && typeof document !== 'undefined' && createPortal(
          <div
            className="role-preset-dropdown-portal fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] w-64 max-h-[300px] overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <h4 className="text-sm font-semibold text-gray-900">Role Library</h4>
              <p className="text-xs text-gray-500 mt-1">Select a preset to add</p>
            </div>
            <div className="p-2">
              {getAllRolePresets().map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleAddRoleFromPreset(preset)}
                  className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors mb-1"
                >
                  <div className="font-medium text-sm text-gray-900">{preset.defaultName}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

        {/* Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column: Role Configuration */}
          <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-start justify-between mb-2">
                {editingRoleName ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="text"
                      value={tempRoleName}
                      onChange={(e) => setTempRoleName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameRole();
                        } else if (e.key === 'Escape') {
                          setEditingRoleName(false);
                        }
                      }}
                      className="flex-1 text-xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleRenameRole}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Save"
                    >
                      <Icon path="M5 13l4 4L19 7" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingRoleName(false)}
                      className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                      title="Cancel"
                    >
                      <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{currentRoleConfig.roleName}</h3>
                      {currentRoleConfig.isCustom && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          Custom Role
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {/* Duplicate button in header */}
                      <button
                        onClick={() => handleDuplicateRole(currentRoleIndex)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Duplicate this role"
                      >
                        <Icon path="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" className="w-4 h-4" />
                      </button>
                      {/* Edit name button */}
                      <button
                        onClick={() => setEditingRoleName(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Rename role"
                      >
                        <Icon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{currentRoleConfig.description || 'Configure permissions for this role'}</p>
              
              {/* Critical Permissions - Always Visible */}
              <div className="space-y-2 mt-4 pt-4 border-t border-blue-200">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Critical Permissions
                </div>
                {CRITICAL_PERMISSIONS.map(perm => {
                  const isAllowed = currentRoleConfig.permissions[perm.key] || false;
                  return (
                    <div key={perm.key} className="flex items-center space-x-2 text-sm">
                      <Icon path={perm.icon} className={`w-4 h-4 ${isAllowed ? 'text-green-600' : 'text-red-500'}`} />
                      <span className={`flex-1 ${isAllowed ? 'text-green-600 font-medium' : 'text-gray-700'}`}>
                        {perm.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advanced Permissions Accordion */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Advanced Permissions</span>
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
                <div className="space-y-2">
                  <textarea
                    placeholder="email@example.com or paste multiple emails (comma-separated)"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {emailInput.includes(',') ? 'Bulk entry detected' : 'Single or bulk entry supported'}
                    </span>
                    <button
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Add {emailInput.includes(',') ? 'All' : 'Member'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name (e.g., John Smith)"
                    value={managedInput.fullName}
                    onChange={(e) => setManagedInput({ ...managedInput, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Username (optional - auto-generated if empty)"
                    value={managedInput.username}
                    onChange={(e) => setManagedInput({ ...managedInput, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 flex items-center">
                        <span className="text-sm">
                          Access Code: <span className="font-mono font-bold text-gray-900">{previewCredentials?.pin || previewPinRef.current || 'Generating...'}</span>
                        </span>
                      </div>
                      <button
                        onClick={handleAddMember}
                        disabled={!managedInput.fullName}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      A 5-digit access code is automatically generated. User will be forced to change this on first login.
                    </p>
                  </div>

                  {/* Credential Card Preview */}
                  {previewCredentials && managedInput.fullName && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {previewCredentials.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{previewCredentials.fullName}</div>
                            <div className="text-xs text-gray-500">Digital ID Badge</div>
                          </div>
                        </div>
                        <div className="w-12 h-12 bg-white rounded border-2 border-gray-300 flex items-center justify-center">
                          <Icon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-gray-300">
                          <span className="text-gray-600">Username:</span>
                          <span className="font-mono font-semibold text-gray-900">{previewCredentials.username}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-600">PIN:</span>
                          <span className="font-mono font-bold text-lg text-gray-900">{previewCredentials.pin}</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* Status Icon */}
                        {member.type === 'invite' ? (
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Icon path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Icon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {member.type === 'invite' ? (
                            <div>
                              <div className="font-medium text-gray-900">{member.email}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>Email invitation</span>
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-gray-900">{member.fullName}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span className="font-mono">{member.username}</span>
                                <span>•</span>
                                <span className="font-mono font-semibold">PIN: {member.password || member.pin}</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">Active</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Download/Print button for managed accounts */}
                        {member.type === 'managed' && (
                          <button
                            onClick={async () => {
                              try {
                                const { generateCredentialCards } = await import('../utils/pdfGenerator');
                                await generateCredentialCards([{
                                  ...member,
                                  roleName: currentRoleConfig.roleName,
                                  organizationName: currentOrganization?.name || 'Organization'
                                }], currentOrganization);
                                addToast('Credential card generated!', 'success');
                              } catch (error) {
                                console.error('Error generating card:', error);
                                addToast('Error generating card', 'error');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Download/Print Credentials"
                          >
                            <Icon path="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
                        </button>
                      </div>
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

      {/* Create Custom Role Modal */}
      <RoleCreationModal
        show={showCreateCustomRoleModal}
        onClose={() => setShowCreateCustomRoleModal(false)}
        onSave={handleCreateCustomRole}
        isLoading={isCreatingCustomRole}
      />
    </Modal>
  );
}


export default SetupWizardModal;
