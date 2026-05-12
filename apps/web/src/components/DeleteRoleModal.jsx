import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

function DeleteRoleModal({ show, onClose, organizationId, roleToDelete, allRoles = [], onDeleted }) {
  const { addToast } = useToast();
  const [memberCount, setMemberCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [targetRoleId, setTargetRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const replaceOptions = useMemo(() => {
    if (!roleToDelete?.id) return [];
    return [...allRoles]
      .filter((r) => r.id !== roleToDelete.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roleToDelete?.id, allRoles]);

  useEffect(() => {
    if (!show || !roleToDelete?.id || !organizationId) {
      setMemberCount(null);
      setTargetRoleId('');
      setLoadingCount(false);
      return undefined;
    }

    const opts = [...allRoles]
      .filter((r) => r.id !== roleToDelete.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    const defaultId = opts.find((r) => r.is_system_role)?.id || opts[0]?.id || '';
    setTargetRoleId(defaultId);

    let cancelled = false;
    setLoadingCount(true);
    supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role_id', roleToDelete.id)
      .then(({ count, error }) => {
        if (cancelled) return;
        setMemberCount(error ? 0 : (count ?? 0));
      })
      .finally(() => {
        if (!cancelled) setLoadingCount(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, roleToDelete?.id, organizationId, allRoles]);

  if (!show || !roleToDelete) return null;

  const needsReassign = (memberCount ?? 0) > 0;
  const cannotReassign = needsReassign && replaceOptions.length === 0;
  const deleteDisabled =
    submitting ||
    loadingCount ||
    cannotReassign ||
    (needsReassign && !targetRoleId);

  const handleSubmit = async () => {
    if (!roleToDelete?.id || !organizationId || deleteDisabled) return;
    setSubmitting(true);
    try {
      const { reassignOrganizationMembersAndDeleteRole } = await import('../utils/roleManagementService');
      await reassignOrganizationMembersAndDeleteRole(
        supabaseClient,
        organizationId,
        roleToDelete.id,
        needsReassign ? targetRoleId : null,
      );
      addToast('Role deleted successfully', 'success');
      onClose();
      onDeleted?.();
    } catch (e) {
      console.error('Delete role:', e);
      addToast(e.message || 'Failed to delete role', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      title={`Delete role “${roleToDelete.name}”?`}
    >
      <div className="space-y-4">
        {loadingCount ? (
          <p className="text-sm text-gray-600">Checking members…</p>
        ) : needsReassign ? (
          <>
            <p className="text-sm text-gray-700">
              {memberCount === 1
                ? '1 user is assigned to this role. Choose which role they should have next, then delete this role.'
                : `${memberCount} users are assigned to this role. Choose which role they should have next, then delete this role.`}
            </p>
            {cannotReassign ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                There is no other role to move members into. Create or restore another role first.
              </p>
            ) : (
              <div>
                <label htmlFor="delete-role-target" className="block text-sm font-medium text-gray-700 mb-1">
                  Move members to
                </label>
                <select
                  id="delete-role-target"
                  value={targetRoleId}
                  onChange={(e) => setTargetRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={submitting}
                >
                  {replaceOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.is_system_role ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Includes built-in and custom roles for this organization.</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-700">Nobody is assigned to this role. It will be removed from your organization.</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            disabled={deleteDisabled}
          >
            {submitting ? 'Deleting…' : 'Delete role'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteRoleModal;
