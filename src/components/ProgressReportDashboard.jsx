import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ProgressReportBuilder from './ProgressReportBuilder';
import LoadingSpinner from './LoadingSpinner';
import {
  getOrganizationProgressReportSchedules,
  getProgressReportHistory,
  sendManualReport,
  formatFrequencyLabel,
} from '@siteweave/core-logic';

/**
 * Progress Report Dashboard Component
 * Organization-wide report management
 */
function ProgressReportDashboard() {
  const { i18n } = useTranslation();
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [historyScheduleId, setHistoryScheduleId] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (state.currentOrganization?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentOrganization?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const orgId = state.currentOrganization.id;
      const orgSchedules = await getOrganizationProgressReportSchedules(supabaseClient, orgId);
      setSchedules(orgSchedules);

      // Load recent history
      if (orgSchedules.length > 0) {
        const recentHistory = [];
        for (const schedule of orgSchedules.slice(0, 5)) {
          const scheduleHistory = await getProgressReportHistory(supabaseClient, schedule.id, 2);
          recentHistory.push(...scheduleHistory);
        }
        setHistory(recentHistory.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at)).slice(0, 10));
      }
    } catch (error) {
      addToast('Error loading data: ' + error.message, 'error');
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

  const handleSendNow = async (scheduleId) => {
    try {
      await sendManualReport(supabaseClient, scheduleId);
      addToast('Report sent successfully!', 'success');
      loadData();
    } catch (error) {
      addToast('Error sending report: ' + error.message, 'error');
    }
  };

  const reportsThisMonth = history.filter(h => {
    const sentDate = new Date(h.sent_at);
    const now = new Date();
    return sentDate.getMonth() === now.getMonth() && sentDate.getFullYear() === now.getFullYear();
  }).length;

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingScheduleId ? 'Edit Progress Report' : 'Create Organization Progress Report'}
          </h2>
          <button
            onClick={() => {
              setShowBuilder(false);
              setEditingScheduleId(null);
              loadData();
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </button>
        </div>
        <ProgressReportBuilder
          scheduleId={editingScheduleId}
          organizationId={state.currentOrganization?.id}
          onSave={() => {
            setShowBuilder(false);
            setEditingScheduleId(null);
            loadData();
          }}
          onCancel={() => {
            setShowBuilder(false);
            setEditingScheduleId(null);
          }}
        />
      </div>
    );
  }

  const openViewHistory = async (scheduleId) => {
    setHistoryScheduleId(scheduleId);
    setHistoryLoading(true);
    try {
      const records = await getProgressReportHistory(supabaseClient, scheduleId, 50);
      setHistoryRecords(records);
    } catch (e) {
      addToast('Error loading history: ' + e.message, 'error');
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading progress reports..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progress Reports</h2>
          <p className="text-gray-600 mt-1">Manage organization-wide progress reports</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Schedules</p>
          <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Reports Sent This Month</p>
          <p className="text-2xl font-bold text-gray-900">{reportsThisMonth}</p>
        </div>
      </div>

      {/* Reports list: Report Name, Frequency, Next Send Date, Status; actions: Edit, Send Now, View History */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
        </div>
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reports yet. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Send Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatFrequencyLabel(schedule.frequency, schedule.frequency_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {schedule.next_send_at
                        ? new Date(schedule.next_send_at).toLocaleDateString(i18n.language)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {schedule.is_active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleEdit(schedule.id)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSendNow(schedule.id)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        Send Now
                      </button>
                      <button
                        onClick={() => openViewHistory(schedule.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View History modal/panel */}
      {historyScheduleId && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setHistoryScheduleId(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Send History</h3>
                <button
                  type="button"
                  onClick={() => setHistoryScheduleId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {historyLoading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : historyRecords.length === 0 ? (
                  <p className="text-gray-500">No reports sent yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {historyRecords.map((record) => (
                      <li
                        key={record.id}
                        className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(record.sent_at).toLocaleString(i18n.language)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Array.isArray(record.recipient_emails) ? record.recipient_emails.length : 0} recipient(s)
                            {record.was_manual_send && ' • Manual send'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleSendNow(record.schedule_id);
                            setHistoryScheduleId(null);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Re-send
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reports sent yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {report.report_type === 'organization' ? 'Organization Report' : 'Project Report'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Sent {new Date(report.sent_at).toLocaleString(i18n.language)} • {report.recipient_emails.length} recipient(s)
                  </p>
                </div>
                <button
                  onClick={() => handleSendNow(report.schedule_id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  Re-send
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressReportDashboard;
