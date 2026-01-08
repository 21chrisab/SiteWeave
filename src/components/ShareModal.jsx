import React, { useState, useMemo } from 'react';
import { supabaseClient, useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const DEFAULT_ROLE = 'Team';
const ROLE_OPTIONS = ['PM', 'Team', 'Subcontractor', 'Client'];

function ShareModal({ projectId, onClose }) {
  const { state, dispatch } = useAppContext();
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState([]); // [{ email, role }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [showContactPicker, setShowContactPicker] = useState(true);
  const [warning, setWarning] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const projectMembers = useMemo(() => {
    return state.contacts.filter(contact => {
      if (!contact.email) return false;
      return contact.project_contacts?.some(pc => String(pc.project_id) === String(projectId));
    });
  }, [state.contacts, projectId]);

  const projectMemberEmails = useMemo(() => {
    return new Set(
      projectMembers
        .map(member => member.email?.toLowerCase())
        .filter(Boolean)
    );
  }, [projectMembers]);

  // Get contacts not already in the project
  const availableContacts = useMemo(() => {
    // Get all contacts with email addresses
    const contactsWithEmail = state.contacts.filter(c => c.email);
    
    // Filter out contacts already assigned to this project
    const notInProject = contactsWithEmail.filter(contact => {
      const hasProjectAccess = contact.project_contacts?.some(pc => 
        String(pc.project_id) === String(projectId)
      );
      return !hasProjectAccess;
    });
    
    // Filter out contacts already in entries list
    return notInProject.filter(contact => 
      !entries.some(entry => entry.email.toLowerCase() === contact.email.toLowerCase())
    );
  }, [state.contacts, projectId, entries]);

  const addContact = (contact) => {
    if (!contact.email) return;
    const newEntry = { email: contact.email.toLowerCase(), role: DEFAULT_ROLE };
    setEntries(prev => [...prev, newEntry]);
  };

  const handleRemoveMember = async (member) => {
    if (!projectId || !member?.id || removingMemberId) return;
    
    const confirmed = window.confirm(`Remove ${member.name || member.email} from this project?`);
    if (!confirmed) return;

    setRemovingMemberId(member.id);
    try {
      const { error } = await supabaseClient
        .from('project_contacts')
        .delete()
        .eq('project_id', projectId)
        .eq('contact_id', member.id);

      if (error) {
        throw error;
      }

      dispatch({
        type: 'REMOVE_PROJECT_CONTACT',
        payload: { project_id: projectId, contact_id: member.id }
      });

      addToast(`${member.name || member.email} removed from project`, 'success');
    } catch (err) {
      console.error('Error removing member:', err);
      addToast(err?.message || 'Failed to remove member', 'error');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const addEmails = () => {
    const parts = input
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const deduped = Array.from(new Set(parts));

    const alreadyInProject = deduped.filter(email => projectMemberEmails.has(email));
    const alreadyQueued = deduped.filter(email => entries.some(en => en.email === email));

    const newEntries = deduped
      .filter(e => !projectMemberEmails.has(e))
      .filter(e => !entries.some(en => en.email === e))
      .map(e => ({ email: e, role: DEFAULT_ROLE }));

    if (newEntries.length) {
      setEntries(prev => [...prev, ...newEntries]);
    }

    if (alreadyInProject.length || alreadyQueued.length) {
      const messages = [];
      if (alreadyInProject.length) {
        messages.push(`Already on this project: ${alreadyInProject.join(', ')}`);
      }
      if (alreadyQueued.length) {
        messages.push(`Already selected: ${alreadyQueued.join(', ')}`);
      }
      setWarning(messages.join(' • '));
    } else {
      setWarning(null);
    }

    setInput('');
  };

  const updateRole = (idx, role) => {
    setEntries(prev => prev.map((en, i) => i === idx ? { ...en, role } : en));
  };

  const removeEntry = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResults(null);
    try {
      const payload = { projectId, entries, addedByUserId: state.user?.id };
      console.log('Invoking invite_or_add_member with:', JSON.stringify(payload, null, 2));
      console.log('ProjectId type:', typeof projectId, 'Value:', projectId);
      console.log('Entries:', JSON.stringify(entries, null, 2));
      
      const { data, error: fnError } = await supabaseClient.functions.invoke('invite_or_add_member', {
        body: payload
      });
      console.log('Edge function response:', JSON.stringify({ data, error: fnError }, null, 2));
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Edge function failed');
      }
      
      setResults(data?.results || []);
    } catch (err) {
      console.error('Full error:', err);
      setError(err?.message || 'Failed to add members. Please check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-white/20">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Manage Project Crew</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Current Crew Section */}
          {projectMembers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Current Crew ({projectMembers.length})
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {projectMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                      {member.name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{member.name || member.email}</div>
                      <div className="text-xs text-gray-500 truncate">{member.email}</div>
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                      {member.project_contacts?.find(pc => String(pc.project_id) === String(projectId))?.role || member.type || 'Member'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removingMemberId === member.id}
                      className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-gray-400"
                    >
                      {removingMemberId === member.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assign from Directory Section */}
          {availableContacts.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Assign from Directory</label>
                <button 
                  type="button"
                  onClick={() => setShowContactPicker(!showContactPicker)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showContactPicker ? 'Hide' : 'Show'} ({availableContacts.length})
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">Select existing organization members to add to this project</p>
              
              {showContactPicker && (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="divide-y divide-gray-100">
                    {availableContacts.map(contact => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => addContact(contact)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.email}</div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {contact.type}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invite Guest/Sub Section */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Invite Guest/Sub
            </label>
            <p className="text-xs text-gray-500 mb-2">Invite external users (subcontractors, guests) to this project only</p>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. user@example.com"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              <button type="button" onClick={addEmails} className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Add</button>
            </div>
            {warning && (
              <div className="mt-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                {warning}
              </div>
            )}
          </div>

          {entries.length > 0 && (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Selected to Add ({entries.length})
              </label>
              <div className="space-y-2">
                {entries.map((en, idx) => (
                  <div key={en.email} className="flex items-center gap-3 rounded-md border border-gray-200 p-3 bg-blue-50">
                    <span className="flex-1 text-sm text-gray-800 font-medium">{en.email}</span>
                    <select
                      value={en.role}
                      onChange={e => updateRole(idx, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 bg-white"
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeEntry(idx)} className="text-sm text-gray-500 hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          {results && (
            <div className="mt-4 rounded-md border border-gray-200 p-3">
              <div className="mb-2 text-sm font-semibold text-gray-700">Results</div>
              <ul className="space-y-2 text-sm">
                {results.map((r) => {
                  let statusText = '';
                  let statusColor = 'text-gray-500';
                  let statusIcon = '';
                  
                  if (r.action === 'added') {
                    if (r.reason === 'email_failed') {
                      statusText = 'Added (email failed)';
                      statusColor = 'text-yellow-600';
                      statusIcon = '⚠️';
                    } else {
                      statusText = 'Added & Emailed';
                      statusColor = 'text-green-600';
                      statusIcon = '✅';
                    }
                  } else if (r.action === 'invited') {
                    statusText = 'Invitation sent';
                    statusColor = 'text-blue-600';
                    statusIcon = '📧';
                  } else {
                    statusText = `Failed: ${r.reason || 'unknown'}`;
                    statusColor = 'text-red-600';
                    statusIcon = '❌';
                  }
                  
                  return (
                    <li key={r.email} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800 font-medium">{r.email}</span>
                        <span className={statusColor + ' font-semibold flex items-center gap-1'}>
                          {statusIcon} {statusText}
                        </span>
                      </div>
                      {r.reason && (r.action === 'skipped' || r.reason === 'email_failed') && (
                        <div className="text-xs text-yellow-600 pl-2 border-l-2 border-yellow-200">
                          {r.action === 'added' && r.reason === 'email_failed' 
                            ? 'Added to project successfully, but email notification could not be sent.' 
                            : r.reason}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
            <button
              type="submit"
              disabled={submitting || entries.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Adding…' : `Add ${entries.length} to Crew`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShareModal;


