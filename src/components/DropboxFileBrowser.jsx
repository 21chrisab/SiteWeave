import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import dropboxStorage from '../utils/dropboxStorage';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';

// Icon name helper for missing icon
const getIconByName = (name) => {
    const icons = {
        'cloud-off': 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
        'folder-open': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
        'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
        'file': 'M9 2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-6-6z'
    };
    return icons[name] || icons['file'];
};

function DropboxFileBrowser({ folderPath = '/SiteWeave', projectId = null }) {
  const { addToast } = useToast();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(folderPath);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  useEffect(() => {
    if (dropboxStorage.isDropboxConnected()) {
      loadFiles();
    }
  }, [currentPath]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const fileList = await dropboxStorage.listFiles(currentPath);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      addToast(`Failed to load files: ${error.message}`, 'error');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (file) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      await dropboxStorage.deleteFile(fileToDelete.path);
      addToast(`File "${fileToDelete.name}" deleted successfully`, 'success');
      setShowDeleteConfirm(false);
      setFileToDelete(null);
      // Reload files
      await loadFiles();
    } catch (error) {
      addToast(`Failed to delete file: ${error.message}`, 'error');
    }
  };

  const handleNavigate = (path) => {
    setCurrentPath(path);
  };

  const handleOpenInDropbox = (file) => {
    // Convert Dropbox path to web URL
    const dropboxUrl = `https://www.dropbox.com/home${file.path.replace(/ /g, '%20')}`;
    window.open(dropboxUrl, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Build breadcrumb path
  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: '/' + pathParts.slice(0, index + 1).join('/')
  }));

    if (!dropboxStorage.isDropboxConnected()) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Icon path={getIconByName('cloud-off')} className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Connect to Dropbox to browse files</p>
            </div>
        );
    }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Dropbox Files</h3>
          <button
            onClick={loadFiles}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Breadcrumbs */}
        {pathParts.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button
              onClick={() => handleNavigate('/SiteWeave')}
              className="text-blue-600 hover:text-blue-700"
            >
              SiteWeave
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <span className="text-gray-400">/</span>
                {index < breadcrumbs.length - 1 ? (
                  <button
                    onClick={() => handleNavigate(crumb.path)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.name}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : files.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Icon path={getIconByName('folder-open')} className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No files found</p>
                <p className="text-sm text-gray-500 mt-1">This folder is empty</p>
            </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.isFolder ? (
                    <button
                      onClick={() => handleNavigate(file.path)}
                      className="flex items-center gap-2 flex-1 text-left hover:text-blue-600"
                    >
                      <Icon path={getIconByName('folder')} className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="font-medium truncate">{file.name}</span>
                    </button>
                  ) : (
                    <>
                      <Icon path={getIconByName('file')} className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.modified)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!file.isFolder && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleOpenInDropbox(file)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50"
                      title="Open in Dropbox"
                    >
                      <Icon path="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50"
                      title="Delete file"
                    >
                      <Icon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && fileToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setFileToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete File"
          message={`Are you sure you want to delete "${fileToDelete.name}"? This action cannot be undone and will remove the file from your Dropbox account.`}
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </>
  );
}

export default DropboxFileBrowser;

