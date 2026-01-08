import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';
import { supabaseClient } from '../context/AppContext';

/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 * 
 * Usage:
 * <PermissionGuard permission="can_delete_projects">
 *   <button>Delete</button>
 * </PermissionGuard>
 */
function PermissionGuard({ permission, children, fallback = null }) {
  const context = useAppContext();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Handle case where context might not be available yet
  if (!context || !context.state) {
    return fallback;
  }

  const { state } = context;

  useEffect(() => {
    async function checkPermission() {
      if (!state.user || !state.currentOrganization?.id) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const access = await hasPermission(
          supabaseClient,
          state.user.id,
          permission,
          state.currentOrganization.id
        );
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [permission, state.user, state.currentOrganization]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!hasAccess) {
    return fallback;
  }

  return children;
}

export default PermissionGuard;

/**
 * Can Component (Alias for PermissionGuard with cleaner API)
 * 
 * Usage:
 * <Can permission="can_delete_projects">
 *   <button>Delete</button>
 * </Can>
 */
export function Can({ permission, children, fallback = null }) {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

