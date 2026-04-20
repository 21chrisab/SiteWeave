import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import MessagesView from './MessagesView';
import ContactsView from './ContactsView';
import { ROUTE_PATHS } from '../config/routes';

function TeamHubView() {
  const { state, dispatch } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const isDirectoryMode = location.pathname === ROUTE_PATHS.teamDirectory;

  useEffect(() => {
    dispatch({ type: 'SET_VIEW', payload: isDirectoryMode ? 'Contacts' : 'Messages' });
  }, [isDirectoryMode, dispatch]);

  const activeChannel =
    (state.messageChannels || []).find((channel) => channel.id === state.selectedChannelId) || null;
  const activeProjectId = activeChannel?.project_id || null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">
            Project discussions and your directory in one place.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.team)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              !isDirectoryMode ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discussions
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.teamDirectory)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isDirectoryMode ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Directory
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {isDirectoryMode ? (
          <ContactsView embedded defaultProjectFilter={activeProjectId} />
        ) : (
          <MessagesView embedded onOpenDirectory={() => navigate(ROUTE_PATHS.teamDirectory)} />
        )}
      </div>
    </div>
  );
}

export default TeamHubView;
