import React from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAppContext } from './context/AppContext'
import { supabaseClient } from './context/AppContext'
import LoadingSpinner from './components/LoadingSpinner'
import Sidebar from './components/Sidebar'
import LoginForm from './components/LoginForm'
import InviteAcceptPage from './components/InviteAcceptPage'
import SetupWizardModal from './components/SetupWizardModal'
import DirectoryManagementModal from './components/DirectoryManagementModal'
import PermissionGuard from './components/PermissionGuard'
import ForcePasswordReset from './components/ForcePasswordReset'
import { LazyViewWrapper, DashboardView, ProjectDetailsView, CalendarView, MessagesView, ContactsView, TeamView, SettingsView } from './components/LazyViews'
import NoOrganizationView from './views/NoOrganizationView'

function App() {
  const { state, dispatch } = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [showSetupWizard, setShowSetupWizard] = React.useState(false)
  const [showTeamModal, setShowTeamModal] = React.useState(false)
  const [showPasswordReset, setShowPasswordReset] = React.useState(false)

  // Handle OAuth callback - check for auth code in URL or hash fragments
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for hash fragment tokens (implicit flow)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        console.log('OAuth callback detected (hash fragment), processing tokens...')
        try {
          // Parse hash fragment
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            // Set session from hash fragment tokens
            const { data, error: setSessionError } = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (setSessionError) {
              console.error('Error setting session from hash fragment:', setSessionError)
              return
            }
            
            if (data.session) {
              console.log('OAuth login successful (hash fragment), redirecting to home...')
              // Clear the hash from URL
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
              navigate('/')
              return
            }
          }
        } catch (error) {
          console.error('Error processing hash fragment:', error)
          return
        }
      }
      
      // Check for query parameters (PKCE flow)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      
      if (error) {
        console.error('OAuth error:', error)
        return
      }
      
      if (code) {
        console.log('OAuth callback detected (PKCE), exchanging code for session...')
        try {
          // Exchange code for session (PKCE flow)
          const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError)
            // Try to get session as fallback (in case Supabase processed it automatically)
            const { data: { session } } = await supabaseClient.auth.getSession()
            if (session) {
              console.log('Session found after exchange error, proceeding...')
              window.history.replaceState({}, document.title, window.location.pathname)
              navigate('/')
              return
            }
            return
          }
          
          if (data.session) {
            console.log('OAuth login successful (PKCE), redirecting to home...')
            // Clear the OAuth code from URL
            window.history.replaceState({}, document.title, window.location.pathname)
            navigate('/')
            return
          } else {
            console.warn('Code exchange succeeded but no session returned')
          }
        } catch (error) {
          console.error('Error during code exchange:', error)
          return
        }
      } else {
        // No OAuth callback, just check for existing session
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session) {
          navigate('/')
        }
      }
    }
    handleAuthCallback()
  }, [navigate])

  // Check if user must change password (managed accounts)
  React.useEffect(() => {
    if (state.user && state.mustChangePassword) {
      setShowPasswordReset(true)
    }
  }, [state.user, state.mustChangePassword])

  // Check if user needs to see setup wizard (first login for Org Admins ONLY)
  React.useEffect(() => {
    const checkSetupWizard = async () => {
      if (!state.user || !state.currentOrganization || state.mustChangePassword) return // Don't show setup wizard if password reset is needed

      // ONLY show setup wizard if user has the exact "Org Admin" role name
      // This prevents regular members from seeing the setup wizard
      const isOrgAdmin = state.userRole?.name === 'Org Admin';
      
      if (isOrgAdmin) {
        const setupComplete = localStorage.getItem(`setup_complete_${state.user.id}`)
        if (!setupComplete) {
          setShowSetupWizard(true)
        }
      }
    }

    if (state.user && state.userRole && !state.mustChangePassword) {
      checkSetupWizard()
    }
  }, [state.user, state.userRole, state.currentOrganization, state.mustChangePassword])

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

  // Show no organization screen if user is logged in but has no organization
  // UNLESS they are a project collaborator
  if (!state.organizationLoading && state.user && !state.currentOrganization && state.organizationError && !state.isProjectCollaborator) {
    return <NoOrganizationView />
  }

  // Render main app with Sidebar
  const renderView = () => {
    // If a project is selected AND we're on Projects view, show project details
    if (state.selectedProjectId && state.activeView === 'Projects') {
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
      case 'Organization':
      case 'Team': // Support both for backwards compatibility
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

  const handlePasswordResetComplete = () => {
    setShowPasswordReset(false)
    dispatch({ type: 'SET_MUST_CHANGE_PASSWORD', payload: false })
    // Refresh profile to get updated must_change_password flag
    if (state.user) {
      supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', state.user.id)
        .single()
        .then(({ data }) => {
          if (data && !data.must_change_password) {
            dispatch({ type: 'SET_MUST_CHANGE_PASSWORD', payload: false })
          }
        })
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {renderView()}
      </main>

      {/* Setup Wizard - Shows on first login for Org Admins */}
      {showSetupWizard && (
        <SetupWizardModal 
          show={showSetupWizard} 
          onComplete={handleSetupComplete}
        />
      )}

      {/* Directory Management Modal */}
      <DirectoryManagementModal 
        show={showTeamModal} 
        onClose={() => setShowTeamModal(false)} 
      />

      {/* Force Password Reset - Shows when must_change_password is true */}
      {showPasswordReset && (
        <ForcePasswordReset
          show={showPasswordReset}
          onComplete={handlePasswordResetComplete}
        />
      )}
    </div>
  )
}

export default App
