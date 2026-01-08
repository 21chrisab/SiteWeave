import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { getRoles, createRole, updateRole, deleteRole } from '../utils/roleManagementService';
import { useToast } from '../context/ToastContext';
import PermissionGuard from './PermissionGuard';
import LoadingSpinner from './LoadingSpinner';

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

function RoleManagement() {
  const { state } = useContext(AppContext);
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    permissions: { ...DEFAULT_PERMISSIONS }
  });

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

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name || !organizationId) return;

    try {
      await createRole(supabaseClient, organizationId, roleForm.name, roleForm.permissions);
      addToast('Role created successfully', 'success');
      setRoleForm({ name: '', permissions: { ...DEFAULT_PERMISSIONS } });
      setShowCreateForm(false);
      loadRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      addToast('Failed to create role', 'error');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editingRole || !roleForm.name) return;

    try {
      const result = await updateRole(supabaseClient, editingRole.id, {
        name: roleForm.name,
        permissions: roleForm.permissions
      });
      
      if (result.success) {
        addToast('Role updated successfully', 'success');
        setEditingRole(null);
        setRoleForm({ name: '', permissions: { ...DEFAULT_PERMISSIONS } });
        loadRoles();
      } else {
        addToast(result.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      addToast(error.message || 'Failed to update role', 'error');
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

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      permissions: role.permissions || { ...DEFAULT_PERMISSIONS }
    });
    setShowCreateForm(true);
  };

  const togglePermission = (permission) => {
    setRoleForm({
      ...roleForm,
      permissions: {
        ...roleForm.permissions,
        [permission]: !roleForm.permissions[permission]
      }
    });
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

      <PermissionGuard permission="can_manage_users">
        <div className="mb-6">
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setEditingRole(null);
              setRoleForm({ name: '', permissions: { ...DEFAULT_PERMISSIONS } });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : 'Create New Role'}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingRole ? 'Edit Role' : 'Create Role'}
            </h3>
            <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole} className="space-y-4">
              <input
                type="text"
                placeholder="Role Name (e.g., Site Supervisor, Project Manager)"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(DEFAULT_PERMISSIONS).map(permission => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={roleForm.permissions[permission] || false}
                        onChange={() => togglePermission(permission)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </form>
          </div>
        )}
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
                  <PermissionGuard permission="can_manage_users">
                    {!role.is_system_role && (
                      <div className="space-x-2">
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
                          {key.replace(/_/g, ' ')}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleManagement;

