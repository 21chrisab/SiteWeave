import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import TeamDirectory from '../components/TeamDirectory';
import DirectoryManagementModal from '../components/DirectoryManagementModal';
import RoleSummaryCard from '../components/RoleSummaryCard';
import RoleCreationModal from '../components/RoleCreationModal';
import PermissionGuard from '../components/PermissionGuard';
import { getRoles } from '../utils/roleManagementService';
import LoadingSpinner from '../components/LoadingSpinner';

function TeamView() {
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [roleMemberCounts, setRoleMemberCounts] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Load roles and calculate member counts
  useEffect(() => {
    if (state.currentOrganization?.id) {
      loadRolesAndCounts();
    }
  }, [state.currentOrganization?.id]);

  const loadRolesAndCounts = async () => {
    if (!state.currentOrganization?.id) return;

    setLoadingRoles(true);
    try {
      const rolesData = await getRoles(supabaseClient, state.currentOrganization.id);
      setRoles(rolesData);

      // Count members per role by querying profiles
      const counts = {};
      for (const role of rolesData) {
        const { count, error } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', state.currentOrganization.id)
          .eq('role_id', role.id);
        
        if (error) {
          console.error(`Error counting members for role ${role.id}:`, error);
          counts[role.id] = 0;
        } else {
          counts[role.id] = count || 0;
        }
      }
      setRoleMemberCounts(counts);
    } catch (error) {
      console.error('Error loading roles:', error);
      addToast('Failed to load roles', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleEditRole = (role) => {
    // Prevent editing Org Admin role
    if (role && role.name === 'Org Admin') {
      addToast('Organization Admin role cannot be edited. This role has all permissions by default.', 'warning');
      return;
    }
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (roleData) => {
    if (!roleData.name || !state.currentOrganization?.id) return;

    // Prevent saving changes to Org Admin
    if (editingRole && editingRole.name === 'Org Admin') {
      addToast('Organization Admin role cannot be modified.', 'error');
      return;
    }

    setIsSavingRole(true);
    try {
      if (editingRole) {
        // Update existing role
        const { updateRole } = await import('../utils/roleManagementService');
        const result = await updateRole(supabaseClient, editingRole.id, roleData);
        if (result.success) {
          addToast('Role updated successfully', 'success');
          setShowRoleModal(false);
          setEditingRole(null);
          loadRolesAndCounts();
        } else {
          addToast(result.error || 'Failed to update role', 'error');
        }
      } else {
        // Create new role
        const { createRole } = await import('../utils/roleManagementService');
        await createRole(supabaseClient, state.currentOrganization.id, roleData.name, roleData.permissions);
        addToast('Role created successfully', 'success');
        setShowRoleModal(false);
        loadRolesAndCounts();
      }
    } catch (error) {
      console.error('Error saving role:', error);
      addToast(error.message || 'Failed to save role', 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Organization Directory</h1>
          <p className="text-gray-500 text-sm">Manage your organization members</p>
        </div>
        <PermissionGuard permission="can_manage_team">
          <button
            onClick={() => setShowDirectoryModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
            title="Add or remove employees from your company account"
          >
            Manage Members
          </button>
        </PermissionGuard>
      </div>

      <TeamDirectory />

      {/* Roles & Permissions Section */}
      <PermissionGuard permission="can_manage_roles">
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
              <p className="text-gray-500 text-sm mt-1">Manage role permissions and see member assignments</p>
            </div>
          </div>

          {loadingRoles ? (
            <LoadingSpinner />
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {roles
                  .filter(role => role.name !== 'Org Admin')
                  .map(role => (
                    <RoleSummaryCard
                      key={role.id}
                      role={role}
                      memberCount={roleMemberCounts[role.id] || 0}
                      onEdit={() => handleEditRole(role)}
                    />
                  ))}
                <RoleSummaryCard
                  isCreateCard={true}
                  onEdit={handleCreateRole}
                />
              </div>
            </div>
          )}
        </div>
      </PermissionGuard>

      <DirectoryManagementModal 
        show={showDirectoryModal} 
        onClose={() => setShowDirectoryModal(false)} 
      />

      <RoleCreationModal
        show={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setEditingRole(null);
        }}
        onSave={handleSaveRole}
        existingRole={editingRole}
        isLoading={isSavingRole}
      />
    </div>
  );
}

export default TeamView;
