import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PRIMARY_NAV_ITEMS } from '../config/routes'
import { supabase } from '../supabaseClient'
import NotificationCenterBell from '../components/NotificationCenterBell'
import { useAppContext } from '../context/AppContext'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

export default function AppShell({ session }) {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()

  const displayName = session?.user?.user_metadata?.full_name || session?.user?.email || 'User'
  const roleLabel =
    state.userRole?.name ||
    (state.isProjectCollaborator ? 'Guest collaborator' : 'User')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
    navigate('/login', { replace: true })
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
          <nav className="px-3 py-3 space-y-1 flex-1">
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

          <div className="p-4 border-t border-slate-200 mt-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar name={displayName} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-col min-h-screen">
          <header className="h-14 bg-white/95 border-b border-slate-200 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-end gap-3">
            <nav className="lg:hidden flex items-center gap-1 flex-wrap justify-end mr-auto">
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
