import React from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAppContext } from './context/AppContext'
import { supabaseClient } from './context/AppContext'
import LoadingSpinner from './components/LoadingSpinner'
import Sidebar from './components/Sidebar'
import LoginForm from './components/LoginForm'
import InviteAcceptPage from './components/InviteAcceptPage'
import SetupWizard from './components/SetupWizard'
import TeamManagementModal from './components/TeamManagementModal'
import PermissionGuard from './components/PermissionGuard'
import { LazyViewWrapper, DashboardView, ProjectDetailsView, CalendarView, MessagesView, ContactsView, TeamView, SettingsView } from './components/LazyViews'

function App() {
  const { state, dispatch } = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [showSetupWizard, setShowSetupWizard] = React.useState(false)
  const [showTeamModal, setShowTeamModal] = React.useState(false)

  // Handle OAuth callback
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (session) {
        navigate('/')
      }
    }
    handleAuthCallback()
  }, [navigate])

  // Check if user needs to see setup wizard (first login for Org Admins)
  React.useEffect(() => {
    const checkSetupWizard = async () => {
      if (!state.user || !state.currentOrganization) return

      // Show setup wizard if user is an Org Admin and hasn't completed setup
      if (state.userRole?.name === 'Org Admin' || state.userRole?.permissions?.can_manage_team) {
        const setupComplete = localStorage.getItem(`setup_complete_${state.user.id}`)
        if (!setupComplete) {
          setShowSetupWizard(true)
        }
      }
    }

    if (state.user && state.userRole) {
      checkSetupWizard()
    }
  }, [state.user, state.userRole, state.currentOrganization])

  // Handle invite route
  React.useEffect(() => {
    if (location.pathname.startsWith('/invite/')) {
      const token = location.pathname.split('/invite/')[1]
      // InviteAcceptPage will handle the rest
    }
  }, [location.pathname])

  // Handle project selection from URL
  const { id: projectIdFromUrl } = useParams()
  React.useEffect(() => {
    if (projectIdFromUrl && state.projects.length > 0) {
      const project = state.projects.find(p => p.id === projectIdFromUrl)
      if (project) {
        dispatch({ type: 'SET_PROJECT', payload: projectIdFromUrl })
        dispatch({ type: 'SET_VIEW', payload: 'Projects' })
      }
    }
  }, [projectIdFromUrl, state.projects, dispatch])

  // Show loading while auth is being checked
  if (state.authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  // Show login if not authenticated
  if (!state.user) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="*" element={<LoginForm />} />
      </Routes>
    )
  }

  // Render main app with Sidebar
  const renderView = () => {
    // If a project is selected, show project details
    if (state.selectedProjectId) {
      return (
        <LazyViewWrapper>
          <ProjectDetailsView />
        </LazyViewWrapper>
      )
    }

    // Otherwise, render based on activeView
    switch (state.activeView) {
      case 'Dashboard':
        return (
          <LazyViewWrapper>
            <DashboardView />
          </LazyViewWrapper>
        )
      case 'Projects':
        return (
          <LazyViewWrapper>
            <DashboardView />
          </LazyViewWrapper>
        )
      case 'Calendar':
        return (
          <LazyViewWrapper>
            <CalendarView />
          </LazyViewWrapper>
        )
      case 'Messages':
        return (
          <LazyViewWrapper>
            <MessagesView />
          </LazyViewWrapper>
        )
      case 'Contacts':
        return (
          <LazyViewWrapper>
            <ContactsView />
          </LazyViewWrapper>
        )
      case 'Team':
        return (
          <LazyViewWrapper>
            <TeamView />
          </LazyViewWrapper>
        )
      case 'Settings':
        return (
          <LazyViewWrapper>
            <SettingsView />
          </LazyViewWrapper>
        )
      default:
        return (
          <LazyViewWrapper>
            <DashboardView />
          </LazyViewWrapper>
        )
    }
  }

  const handleSetupComplete = () => {
    if (state.user) {
      localStorage.setItem(`setup_complete_${state.user.id}`, 'true')
    }
    setShowSetupWizard(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>

      {/* Setup Wizard - Shows on first login for Org Admins */}
      {showSetupWizard && (
        <SetupWizard 
          show={showSetupWizard} 
          onComplete={handleSetupComplete}
        />
      )}

      {/* Team Management Modal */}
      <TeamManagementModal 
        show={showTeamModal} 
        onClose={() => setShowTeamModal(false)} 
      />
    </div>
  )
}

export default App
