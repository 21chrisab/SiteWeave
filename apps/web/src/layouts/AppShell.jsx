import React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PRIMARY_NAV_ITEMS } from '../config/routes'
import { supabase } from '../supabaseClient'
import NotificationCenterBell from '../components/NotificationCenterBell'
import { useAppContext } from '../context/AppContext'

export default function AppShell({ session }) {
  const { state, dispatch } = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  const selectedProjectId = state.selectedProjectId

  const activePrimaryItem = React.useMemo(() => {
    return PRIMARY_NAV_ITEMS.find((item) => {
      if (item.to === '/') return location.pathname === '/'
      return location.pathname.startsWith(item.to)
    })?.label || 'Dashboard'
  }, [location.pathname])

  const projectList = React.useMemo(() => {
    return [...(state.projects || [])]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 12)
  }, [state.projects])

  const handleProjectOpen = (projectId) => {
    dispatch({ type: 'SET_PROJECT', payload: projectId })
    dispatch({ type: 'SET_VIEW', payload: 'Projects' })
    navigate(`/projects/${projectId}/tasks`)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xs">
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">SiteWeave</Link>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
              WEB
            </span>
          </div>
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Organization</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
              {state.currentOrganization?.name || 'Workspace'}
            </p>
          </div>
          <nav className="px-3 py-3 space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 pt-2 pb-3 border-t border-slate-200 mt-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Projects</p>
              <Link to="/projects" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {projectList.length === 0 ? (
                <p className="text-xs text-slate-500 px-2 py-1">No projects yet</p>
              ) : (
                projectList.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectOpen(project.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs truncate ${
                      String(selectedProjectId) === String(project.id)
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={project.name}
                  >
                    {project.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="flex flex-col min-h-screen">
          <header className="h-16 bg-white/95 border-b border-slate-200 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Current area</p>
              <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">{activePrimaryItem}</p>
            </div>
            <div className="flex items-center gap-3">
              <nav className="lg:hidden flex items-center gap-1">
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `px-2.5 py-1.5 rounded-md text-xs font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <NotificationCenterBell />
              <span className="hidden md:block text-xs text-slate-500 max-w-56 truncate">{session?.user?.email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-100"
              >
                Sign Out
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
