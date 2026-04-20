import React from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LoadingSpinner from './components/LoadingSpinner'
import InviteAcceptPage from './components/InviteAcceptPage'
import ForcePasswordReset from './components/ForcePasswordReset'
import AppShell from './layouts/AppShell'
import LoginView from './views/LoginView'
import ProjectWorkspaceView from './views/ProjectWorkspaceView'
import DashboardView from './views/DashboardView'
import CalendarView from './views/CalendarView'
import TeamView from './views/TeamView'
import TeamHubView from './views/TeamHubView'
import SettingsView from './views/SettingsView'
import NoOrganizationView from './views/NoOrganizationView'
import { ROUTE_PATHS } from './config/routes'
import { parseLegacyProjectQuery } from './utils/deepLinking'
import { useSession } from './hooks/useSession'
import { trackRouteChange } from './utils/webTelemetry'
import { AppProvider, useAppContext } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'

function RouteStateSync({ view, children }) {
  const { state, dispatch } = useAppContext()

  React.useEffect(() => {
    if (state.activeView !== view) {
      dispatch({ type: 'SET_VIEW', payload: view })
    }
  }, [view, state.activeView, dispatch])

  return children
}

function WorkspaceLayout({ session }) {
  const { state, dispatch } = useAppContext()

  if (state.authLoading || state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading workspace..." />
      </div>
    )
  }

  if (state.organizationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Checking organization access..." />
      </div>
    )
  }

  if (state.organizationError && !state.isProjectCollaborator) {
    return <NoOrganizationView />
  }

  return (
    <>
      <AppShell session={session} />
      <ForcePasswordReset
        show={Boolean(state.mustChangePassword)}
        onComplete={() => dispatch({ type: 'SET_MUST_CHANGE_PASSWORD', payload: false })}
      />
    </>
  )
}

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to={ROUTE_PATHS.login} replace />
  return children
}

function ProjectWorkspaceRoute({ routeTab }) {
  return (
    <RouteStateSync view="Projects">
      <ProjectWorkspaceView routeTab={routeTab} />
    </RouteStateSync>
  )
}

function DashboardRoute() {
  const { dispatch } = useAppContext()

  React.useEffect(() => {
    dispatch({ type: 'SET_PROJECT', payload: null })
  }, [dispatch])

  return (
    <RouteStateSync view="Dashboard">
      <DashboardView />
    </RouteStateSync>
  )
}

function ProjectsRoute() {
  return (
    <RouteStateSync view="Projects">
      <DashboardView />
    </RouteStateSync>
  )
}

export default function AppStandalone() {
  const { session, loading } = useSession()
  const location = useLocation()
  const navigate = useNavigate()

  React.useEffect(() => {
    trackRouteChange(location.pathname)
  }, [location.pathname])

  React.useEffect(() => {
    const legacy = parseLegacyProjectQuery(window.location.search)
    if (legacy) {
      navigate(legacy.redirectPath, { replace: true })
      return
    }

    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (!code) return
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        window.history.replaceState({}, document.title, window.location.pathname)
        navigate('/')
      }
    }
    handleAuthCallback()
  }, [navigate, location.search])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  return (
    <ToastProvider>
    <Routes>
      <Route path={ROUTE_PATHS.invite} element={<InviteAcceptPage />} />
      <Route path={ROUTE_PATHS.login} element={<LoginView />} />
      <Route
        element={(
          <ProtectedRoute session={session}>
            <AppProvider>
                <WorkspaceLayout session={session} />
            </AppProvider>
          </ProtectedRoute>
        )}
      >
        <Route path={ROUTE_PATHS.home} element={<DashboardRoute />} />
        <Route path={ROUTE_PATHS.projects} element={<ProjectsRoute />} />
        <Route path={ROUTE_PATHS.project} element={<Navigate to="tasks" replace />} />
        <Route path={ROUTE_PATHS.projectTasks} element={<ProjectWorkspaceRoute routeTab="tasks" />} />
        <Route path={ROUTE_PATHS.projectGantt} element={<ProjectWorkspaceRoute routeTab="gantt" />} />
        <Route path={ROUTE_PATHS.projectFieldIssues} element={<ProjectWorkspaceRoute routeTab="field-issues" />} />
        <Route path={ROUTE_PATHS.projectActivity} element={<ProjectWorkspaceRoute routeTab="activity" />} />
        <Route path={ROUTE_PATHS.messages} element={<Navigate to={ROUTE_PATHS.team} replace />} />
        <Route path={ROUTE_PATHS.calendar} element={<RouteStateSync view="Calendar"><CalendarView /></RouteStateSync>} />
        <Route path={ROUTE_PATHS.team} element={<TeamHubView />} />
        <Route path={ROUTE_PATHS.teamDirectory} element={<TeamHubView />} />
        <Route path={ROUTE_PATHS.organization} element={<RouteStateSync view="Organization"><TeamView /></RouteStateSync>} />
        <Route path={ROUTE_PATHS.settings} element={<RouteStateSync view="Settings"><SettingsView /></RouteStateSync>} />
        <Route path={ROUTE_PATHS.notifications} element={<RouteStateSync view="Settings"><SettingsView /></RouteStateSync>} />
      </Route>
    </Routes>
    </ToastProvider>
  )
}
