import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ProgressReportPreview from './ProgressReportPreview';
import LoadingSpinner from './LoadingSpinner';
import {
  getProgressReportSchedules,
  approveReport,
  rejectReport
} from '@siteweave/core-logic';

/**
 * Progress Report Approval Component
 * Review and approve client-facing reports
 */
function ProgressReportApproval({ onBack, onApprove }) {
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [pendingReports, setPendingReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (state.currentOrganization?.id) {
      loadPendingReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentOrganization?.id]);

  const loadPendingReports = async () => {
    setIsLoading(true);
    try {
      const orgId = state.currentOrganization?.id;
      if (!orgId) return;

      const allSchedules = await getProgressReportSchedules(supabaseClient, orgId, null);
      const pending = allSchedules.filter(s => 
        s.requires_approval && s.approval_status === 'pending_review'
      );
      setPendingReports(pending);
      
      if (pending.length > 0 && !selectedReport) {
        setSelectedReport(pending[0]);
      }
    } catch (error) {
      addToast('Error loading pending reports: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (scheduleId) => {
    if (!confirm('Approve this report for sending?')) return;

    setIsProcessing(true);
    try {
      await approveReport(supabaseClient, scheduleId, state.user.id);
      addToast('Report approved', 'success');
      loadPendingReports();
      if (onApprove) onApprove();
    } catch (error) {
      addToast('Error approving report: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (scheduleId) => {
    if (!rejectionReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
      return;
    }

    if (!confirm('Reject this report? It will need to be edited and resubmitted.')) return;

    setIsProcessing(true);
    try {
      await rejectReport(supabaseClient, scheduleId, rejectionReason);
      addToast('Report rejected', 'success');
      setRejectionReason('');
      loadPendingReports();
    } catch (error) {
      addToast('Error rejecting report: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading pending reports..." />;
  }

  if (pendingReports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No reports pending approval</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  const currentReport = selectedReport || pendingReports[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approve Reports</h2>
          <p className="text-gray-600 mt-1">
            {pendingReports.length} report(s) pending approval
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pending Reports</h3>
            <div className="space-y-2">
              {pendingReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedReport?.id === report.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {report.report_audience_type} • {report.progress_report_recipients?.length || 0} recipients
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{currentReport.name}</h3>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Recipients:</strong> {currentReport.progress_report_recipients?.map(r => r.email).join(', ') || 'None'}
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                <strong>Audience:</strong> {currentReport.report_audience_type}
              </p>
            </div>

            <ProgressReportPreview
              formData={currentReport}
              recipients={currentReport.progress_report_recipients || []}
              scheduleId={currentReport.id}
            />

            {/* Approval Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide feedback for the report creator..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(currentReport.id)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleReject(currentReport.id)}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : '✗ Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressReportApproval;
