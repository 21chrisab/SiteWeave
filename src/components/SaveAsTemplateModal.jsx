import React, { useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { saveProjectAsTemplate } from '../utils/projectTemplateService';

export default function SaveAsTemplateModal({ projectId, projectName, onClose, onSaved }) {
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [name, setName] = useState(`${projectName || 'Project'} template`);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const orgId = state.currentOrganization?.id;
  const userId = state.user?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter a template name', 'error');
      return;
    }
    if (!orgId || !userId) {
      addToast('Missing organization or user context', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await saveProjectAsTemplate(supabaseClient, projectId, orgId, userId, name.trim(), description.trim());
      if (result.success) {
        addToast('Template saved successfully', 'success');
        onSaved?.();
        onClose();
      } else {
        addToast(result.error || 'Failed to save template', 'error');
      }
    } catch (err) {
      addToast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-[2px] bg-white/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Save as template</h2>
        <p className="text-sm text-gray-600 mb-4">Save this project&apos;s structure (phases, tasks, dependencies) as a reusable template.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1 text-gray-600">Template name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg" required placeholder="e.g. Standard build" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1 text-gray-600">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg" rows={2} placeholder="Brief description" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={saving}>Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={saving}>{saving ? 'Saving...' : 'Save template'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
