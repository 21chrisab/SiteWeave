import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ProgressReportBuilder from './ProgressReportBuilder';
import LoadingSpinner from './LoadingSpinner';
import {
  getProjectProgressReportSchedules,
  getOrganizationProgressReportSchedules,
  sendManualReport,
  exportReportToPDF,
} from '@siteweave/core-logic';

/**
 * Progress Report Modal Component
 * Project-level report management modal
 */
function ProgressReportModal({ projectId, onClose }) {
  const { i18n } = useTranslation();
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  useEffect(() => {
    if (state.currentOrganization?.id) {
      loadSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, state.currentOrganization?.id]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const orgId = state.currentOrganization?.id;
      if (!orgId) return;

      const schedules = projectId
        ? await getProjectProgressReportSchedules(supabaseClient, orgId, projectId)
        : await getOrganizationProgressReportSchedules(supabaseClient, orgId);
      setSchedules(schedules);
    } catch (error) {
      addToast('Error loading schedules: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingScheduleId(null);
    setShowBuilder(true);
  };

  const handleEdit = (scheduleId) => {
    setEditingScheduleId(scheduleId);
    setShowBuilder(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabaseClient
        .from('progress_report_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      addToast('Schedule deleted', 'success');
      loadSchedules();
    } catch (error) {
      addToast('Error deleting schedule: ' + error.message, 'error');
    }
  };

  const handleSendNow = async (scheduleId) => {
    try {
      await sendManualReport(supabaseClient, scheduleId);
      addToast('Report sent successfully!', 'success');
      loadSchedules();
    } catch (error) {
      addToast('Error sending report: ' + error.message, 'error');
    }
  };

  const handleExportPDF = async (scheduleId) => {
    try {
      const result = await exportReportToPDF(supabaseClient, scheduleId);
      addToast('PDF export ready', 'success');
      // In a real implementation, would open PDF in new window or download
      console.log('PDF result:', result);
    } catch (error) {
      addToast('Error exporting PDF: ' + error.message, 'error');
    }
  };

  if (showBuilder) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingScheduleId
                ? 'Edit Progress Report'
                : projectId
                  ? 'Create Project Progress Report'
                  : 'Create Organization Progress Report'}
            </h2>
            <button
              onClick={() => {
                setShowBuilder(false);
                setEditingScheduleId(null);
                loadSchedules();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <ProgressReportBuilder
              scheduleId={editingScheduleId}
              projectId={projectId}
              organizationId={state.currentOrganization?.id}
              onSave={() => {
                setShowBuilder(false);
                setEditingScheduleId(null);
                loadSchedules();
              }}
              onCancel={() => {
                setShowBuilder(false);
                setEditingScheduleId(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {projectId ? 'Project Progress Reports' : 'Organization Progress Reports'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {projectId
                ? 'Reports for this project only. Data includes only this project\'s tasks, status, and phases.'
                : 'Manage organization-wide reports. Data can include all projects or be scoped per report.'}
            </p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Create New Report
            </button>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading schedules..." />
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No progress reports configured yet</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Report
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {schedule.report_audience_type} • {schedule.frequency}
                        {schedule.next_send_at && (
                          <span className="ml-2">
                            • Next: {new Date(schedule.next_send_at).toLocaleDateString(i18n.language)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {schedule.progress_report_recipients?.length || 0} recipient(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {schedule.is_active && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Active
                        </span>
                      )}
                      <button
                        onClick={() => handleSendNow(schedule.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="Send Now"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => handleExportPDF(schedule.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        title="Export PDF"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleEdit(schedule.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgressReportModal;
