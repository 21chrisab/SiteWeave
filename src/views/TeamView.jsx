import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import TeamDirectory from '../components/TeamDirectory';
import TeamManagementModal from '../components/TeamManagementModal';
import PermissionGuard from '../components/PermissionGuard';

function TeamView() {
  const { state } = useAppContext();
  const [showTeamModal, setShowTeamModal] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">Manage your organization members</p>
        </div>
        <PermissionGuard permission="can_manage_team">
          <button
            onClick={() => setShowTeamModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Team
          </button>
        </PermissionGuard>
      </div>

      <TeamDirectory />

      <TeamManagementModal 
        show={showTeamModal} 
        onClose={() => setShowTeamModal(false)} 
      />
    </div>
  );
}

export default TeamView;
