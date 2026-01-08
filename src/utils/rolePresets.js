/**
 * Role Presets Library
 * Pre-configured roles for common construction industry positions
 * These can be used as templates when creating custom roles
 */

export const ROLE_PRESETS = [
  {
    id: 'estimator',
    defaultName: 'Estimator',
    description: 'Creates project estimates and manages budgets',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_create_projects: true,
      can_edit_projects: true,
      can_delete_projects: false,
      can_view_financials: true,
      can_assign_tasks: false,
      can_view_reports: true,
      can_manage_contacts: true,
      can_create_tasks: false,
      can_edit_tasks: false,
      can_delete_tasks: false,
      read_projects: true,
      create_comments: true
    }
  },
  {
    id: 'safety-officer',
    defaultName: 'Safety Officer',
    description: 'Manages safety protocols and compliance',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_create_projects: false,
      can_edit_projects: true,
      can_delete_projects: false,
      can_view_financials: false,
      can_assign_tasks: true,
      can_view_reports: true,
      can_manage_contacts: false,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: false,
      read_projects: true,
      create_comments: true
    }
  },
  {
    id: 'foreman',
    defaultName: 'Foreman',
    description: 'Supervises field work and manages daily operations',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_create_projects: false,
      can_edit_projects: true,
      can_delete_projects: false,
      can_view_financials: false,
      can_assign_tasks: true,
      can_view_reports: true,
      can_manage_contacts: false,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: false,
      read_projects: true,
      create_comments: true
    }
  },
  {
    id: 'superintendent',
    defaultName: 'Superintendent',
    description: 'Oversees project execution and coordinates teams',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
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
      can_delete_tasks: true,
      read_projects: true,
      create_comments: true
    }
  },
  {
    id: 'accountant',
    defaultName: 'Accountant',
    description: 'Manages financial records and reporting',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_create_projects: false,
      can_edit_projects: false,
      can_delete_projects: false,
      can_view_financials: true,
      can_assign_tasks: false,
      can_view_reports: true,
      can_manage_contacts: false,
      can_create_tasks: false,
      can_edit_tasks: false,
      can_delete_tasks: false,
      read_projects: true,
      create_comments: false
    }
  },
  {
    id: 'general',
    defaultName: 'General Worker',
    description: 'Basic access for general team members',
    defaultPermissions: {
      can_manage_team: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_create_projects: false,
      can_edit_projects: false,
      can_delete_projects: false,
      can_view_financials: false,
      can_assign_tasks: false,
      can_view_reports: false,
      can_manage_contacts: false,
      can_create_tasks: false,
      can_edit_tasks: true,
      can_delete_tasks: false,
      read_projects: true,
      create_comments: true
    }
  }
];

/**
 * Get a role preset by ID
 * @param {string} presetId - The preset ID
 * @returns {Object|null} The preset object or null if not found
 */
export function getRolePreset(presetId) {
  return ROLE_PRESETS.find(preset => preset.id === presetId) || null;
}

/**
 * Get all role presets
 * @returns {Array} Array of preset objects
 */
export function getAllRolePresets() {
  return ROLE_PRESETS;
}
