import React from 'react';
import Avatar from './Avatar';

function ContactRow({ contact }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      {contact.avatar_url ? (
        <img
          src={contact.avatar_url}
          alt={contact.name}
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <Avatar name={contact.name} size="md" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
        <p className="truncate text-xs text-gray-500">
          {contact.role || contact.trade || contact.company || 'Project member'}
        </p>
      </div>
      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
        {contact.status || 'Available'}
      </span>
    </div>
  );
}

function ProjectTeamPanel({ project, contacts, onOpenDirectory }) {
  const projectContacts = (contacts || []).filter(
    (contact) =>
      Array.isArray(contact.project_contacts) &&
      contact.project_contacts.some((pc) => String(pc.project_id) === String(project?.id)),
  );

  const teamMembers = projectContacts.filter((contact) => contact.type === 'Team');
  const subcontractors = projectContacts.filter((contact) => contact.type === 'Subcontractor');

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-gray-50">
      <div className="w-full shrink-0 border-b border-gray-200 px-5 py-4">
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900">People on this project</h3>
            <p className="mt-1 truncate text-sm text-gray-500">
              {project ? project.name : 'Select a channel to see project members'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDirectory}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Directory
          </button>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {projectContacts.length === 0 ? (
          <div className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No one is assigned to this project yet.
          </div>
        ) : (
          <>
            <section className="w-full min-w-0">
              <div className="mb-3 flex w-full items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Team
                </h4>
                <span className="text-xs text-gray-400">{teamMembers.length}</span>
              </div>
              <div className="w-full space-y-2">
                {teamMembers.length > 0 ? (
                  teamMembers.map((contact) => <ContactRow key={contact.id} contact={contact} />)
                ) : (
                  <p className="text-sm text-gray-500">No internal team members assigned.</p>
                )}
              </div>
            </section>

            <section className="w-full min-w-0">
              <div className="mb-3 flex w-full items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Subcontractors
                </h4>
                <span className="text-xs text-gray-400">{subcontractors.length}</span>
              </div>
              <div className="w-full space-y-2">
                {subcontractors.length > 0 ? (
                  subcontractors.map((contact) => <ContactRow key={contact.id} contact={contact} />)
                ) : (
                  <p className="text-sm text-gray-500">No subcontractors assigned.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectTeamPanel;
