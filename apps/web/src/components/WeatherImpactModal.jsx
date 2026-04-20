import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { createWeatherImpact, listWeatherImpactsForProject } from '@siteweave/core-logic';
import LoadingSpinner from './LoadingSpinner';

function WeatherImpactModal({ project, onClose }) {
  const { state } = useAppContext();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impacts, setImpacts] = useState([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysLost, setDaysLost] = useState(1);

  const loadImpacts = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const rows = await listWeatherImpactsForProject(supabaseClient, project.id);
      setImpacts(rows || []);
    } catch (error) {
      addToast(error.message || 'Failed to load weather impacts', 'error');
    } finally {
      setLoading(false);
    }
  }, [project?.id, addToast]);

  useEffect(() => {
    loadImpacts();
  }, [loadImpacts]);

  const handleSave = async () => {
    if (!project?.id || !state.currentOrganization?.id) return;
    if (!title.trim() || !startDate || !endDate) {
      addToast('Title, start date, and end date are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createWeatherImpact(supabaseClient, {
        organization_id: state.currentOrganization.id,
        project_id: project.id,
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        days_lost: Number(daysLost) || 1,
        reported_by_user_id: state.user?.id || null,
      });
      addToast('Weather impact recorded.', 'success');
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setDaysLost(1);
      loadImpacts();
    } catch (error) {
      addToast(error.message || 'Failed to record weather impact', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Weather Impact Log</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Record new impact</h3>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Rain delay - concrete pour"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what happened"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <label className="block text-sm text-gray-700">
              Days lost
              <input
                type="number"
                min="1"
                value={daysLost}
                onChange={(e) => setDaysLost(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save impact'}
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Recent impacts</h3>
            {loading ? (
              <LoadingSpinner size="sm" text="Loading impacts..." />
            ) : impacts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">No weather impacts recorded yet.</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {impacts.map((impact) => (
                  <li key={impact.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">{impact.title}</p>
                    <p className="text-xs text-gray-600">
                      {impact.start_date} to {impact.end_date} · {impact.days_lost} day(s)
                    </p>
                    {impact.description ? <p className="mt-1 text-sm text-gray-700">{impact.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherImpactModal;
