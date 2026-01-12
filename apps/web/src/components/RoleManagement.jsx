import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { getRoles, createRole, updateRole, deleteRole } from '../utils/roleManagementService';
import { useToast } from '../context/ToastContext';
import PermissionGuard from './PermissionGuard';
import LoadingSpinner from './LoadingSpinner';
import RoleCreationModal from './RoleCreationModal';
import Icon from './Icon';

// Default permission structure
const DEFAULT_PERMISSIONS = {
  can_create_tasks: false,
  can_view_financials: false,
  can_manage_users: false,
  can_delete_projects: false,
  can_assign_tasks: false,
  can_view_reports: false,
  can_manage_contacts: false,
  can_create_projects: false,
  can_edit_projects: false
};

// Permission key to label mapping
const PERMISSION_LABELS = {
  can_create_projects: 'Create Projects',
  can_edit_projects: 'Edit Projects',
  can_delete_projects: 'Delete Projects',
  read_projects: 'View Projects',
  can_create_tasks: 'Create Tasks',
  can_edit_tasks: 'Edit Tasks',
  can_delete_tasks: 'Delete Tasks',
  can_assign_tasks: 'Assign Tasks',
  can_view_financials: 'View Financials',
  can_view_reports: 'View Reports',
  can_manage_team: 'Manage Organization Directory',
  can_manage_roles: 'Manage Roles',
  can_manage_contacts: 'Manage Contacts',
  can_manage_users: 'Manage Users',
  can_send_messages: 'Send Messages',
  // Backward compatibility for old permission name
  create_comments: 'Send Messages',
};

// Helper function to get permission label
const getPermissionLabel = (key) => {
  return PERMISSION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

function RoleManagement() {
  const { state } = useContext(AppContext);
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const organizationId = state.currentOrganization?.id;

  useEffect(() => {
    if (organizationId) {
      loadRoles();
    }
  }, [organizationId]);

  const loadRoles = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const rolesData = await getRoles(supabaseClient, organizationId);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      addToast('Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (roleData) => {
    if (!roleData.name || !organizationId) return;

    setIsSaving(true);
    try {
      if (editingRole) {
        // Update existing role
        const result = await updateRole(supabaseClient, editingRole.id, roleData);
        if (result.success) {
          addToast('Role updated successfully', 'success');
          setShowRoleModal(false);
          setEditingRole(null);
          loadRoles();
        } else {
          addToast(result.error || 'Failed to update role', 'error');
        }
      } else {
        // Create new role
        await createRole(supabaseClient, organizationId, roleData.name, roleData.permissions);
        addToast('Role created successfully', 'success');
        setShowRoleModal(false);
        loadRoles();
      }
    } catch (error) {
      console.error('Error saving role:', error);
      addToast(error.message || 'Failed to save role', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateRole = async (role) => {
    if (!organizationId) return;

    setIsSaving(true);
    try {
      const duplicatedName = `${role.name} (Copy)`;
      await createRole(supabaseClient, organizationId, duplicatedName, role.permissions);
      addToast('Role duplicated successfully', 'success');
      loadRoles();
    } catch (error) {
      console.error('Error duplicating role:', error);
      addToast('Failed to duplicate role', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role? Users with this role will lose their role assignment.')) {
      return;
    }

    try {
      await deleteRole(supabaseClient, roleId);
      addToast('Role deleted successfully', 'success');
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      addToast('Failed to delete role', 'error');
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
        <p className="text-gray-600 mt-1">Create and manage custom roles for your organization</p>
      </div>

      <PermissionGuard permission="can_manage_roles">
        <div className="mb-6">
          <button
            onClick={handleCreateRole}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Icon path="M12 4v16m8-8H4" className="w-5 h-5" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </PermissionGuard>

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Roles</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {roles.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No roles found</div>
          ) : (
            roles.map(role => (
              <div key={role.id} className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{role.name}</h4>
                    {role.is_system_role && (
                      <span className="text-xs text-gray-500">System Role (Cannot be modified)</span>
                    )}
                  </div>
                  <PermissionGuard permission="can_manage_roles">
                    {!role.is_system_role && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDuplicateRole(role)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                          title="Duplicate role"
                        >
                          <Icon path="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRole(role)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </PermissionGuard>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(role.permissions || {})
                      .filter(([_, value]) => value === true)
                      .map(([key, _]) => (
                        <span key={key} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {getPermissionLabel(key)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Role Creation Modal */}
      <RoleCreationModal
        show={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setEditingRole(null);
        }}
        onSave={handleSaveRole}
        existingRole={editingRole}
        isLoading={isSaving}
      />
    </div>
  );
}

export default RoleManagement;

