import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  DashboardView, 
  ProjectDetailsView, 
  CalendarView, 
  ContactsView, 
  MessagesView, 
  SettingsView,
  LazyViewWrapper 
} from './components/LazyViews';
import NotificationBadge from './components/NotificationBadge';
import LoginForm from './components/LoginForm';
import OAuthErrorHandler from './components/OAuthErrorHandler';
import OnboardingWelcome from './components/OnboardingWelcome';
import OnboardingTour from './components/OnboardingTour';
import OnboardingProgress from './components/OnboardingProgress';
import GlobalSearch from './components/GlobalSearch';
import UpdateNotification from './components/UpdateNotification';
import AcceptInvitationView from './views/AcceptInvitationView';
import { useOnboarding } from './hooks/useOnboarding';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function MainContentArea() {
  const { state, dispatch } = useAppContext();

  // Handle project selection in useEffect to avoid setState during render
  useEffect(() => {
    if (state.activeView === 'Projects' && !state.selectedProjectId && state.projects.length > 0) {
      // Only auto-select if we're switching to Projects view and no project is selected
      dispatch({ type: 'SET_PROJECT', payload: state.projects[0].id });
    }
  }, [state.activeView, state.selectedProjectId, state.projects.length, dispatch]);

  if (state.activeView === 'Dashboard') {
    return (
      <LazyViewWrapper>
        <DashboardView />
      </LazyViewWrapper>
    );
  }
  if (state.activeView === 'Projects') {
    // If no projects exist, show empty state
    if (state.projects.length === 0) {
      return <div className="p-8 text-center text-gray-500">No projects found. Create your first project to get started!</div>;
    }
    return (
      <LazyViewWrapper>
        <ProjectDetailsView />
      </LazyViewWrapper>
    );
  }
  if (state.activeView === 'Calendar') {
    return (
      <LazyViewWrapper>
        <CalendarView />
      </LazyViewWrapper>
    );
  }
  if (state.activeView === 'Contacts') {
    return (
      <LazyViewWrapper>
        <ContactsView />
      </LazyViewWrapper>
    );
  }
  if (state.activeView === 'Messages') {
    return (
      <LazyViewWrapper>
        <MessagesView />
      </LazyViewWrapper>
    );
  }
  if (state.activeView === 'Settings') {
    return (
      <LazyViewWrapper>
        <SettingsView />
      </LazyViewWrapper>
    );
  }

  return (
    <LazyViewWrapper>
      <DashboardView />
    </LazyViewWrapper>
  ); // Fallback
}

function AppContent() {
  const context = useAppContext();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Add safety check
  if (!context) {
    return <LoadingSpinner size="lg" text="Initializing..." />;
  }
  
  const { state, dispatch } = context;
  
  // Global search keyboard shortcut
  useKeyboardShortcuts([
    {
      key: 'ctrl+f',
      action: () => setShowSearch(true),
      description: 'Open global search'
    }
  ]);
  
  // Initialize onboarding hook
  const {
    isOnboardingActive,
    currentStep,
    currentView,
    isNavigating,
    totalSteps,
    steps,
    initializeOnboarding,
    startOnboarding,
    completeStep,
    goToPreviousStep,
    skipOnboarding,
    completeOnboarding
  } = useOnboarding(dispatch, state);

  // Initialize onboarding when user logs in
  useEffect(() => {
    if (state.user) {
      // Initialize onboarding for the user
      initializeOnboarding(state.user.id);
    }
  }, [state.user]);

  // Check if user should see onboarding welcome
  useEffect(() => {
    if (state.user && !showWelcome && !showTour) {
      // Check localStorage directly for onboarding status
      const stored = localStorage.getItem(`onboarding_${state.user.id}`);
      
      if (!stored) {
        // No onboarding data found, show welcome
        setShowWelcome(true);
      } else {
        const preferences = JSON.parse(stored);
        if (!preferences.onboarding_completed && !isOnboardingActive) {
          setShowWelcome(true);
        }
      }
    }
  }, [state.user, isOnboardingActive, showWelcome, showTour]);

  // Listen for restart onboarding event
  useEffect(() => {
    const handleRestartOnboarding = () => {
      setShowWelcome(true);
      setShowTour(false);
      // Also clear any existing onboarding state
      if (state.user) {
        localStorage.removeItem(`onboarding_${state.user.id}`);
      }
    };

    window.addEventListener('restartOnboarding', handleRestartOnboarding);
    return () => window.removeEventListener('restartOnboarding', handleRestartOnboarding);
  }, [state.user]);

  // Handle onboarding actions
  const handleStartTour = async () => {
    setShowWelcome(false);
    setShowTour(true);
    await startOnboarding();
  };

  const handleSkipWelcome = async () => {
    setShowWelcome(false);
    await skipOnboarding();
  };

  const handleCompleteStep = async () => {
    // Check if this is the final step
    const currentStepInfo = steps[currentStep];

    if (currentStepInfo && currentStepInfo.action === 'complete') {
      // This is the final step, complete the onboarding
      await completeOnboarding();
      setShowTour(false);
    } else {
      // Regular step, move to next
      const isCompleted = await completeStep();
      if (isCompleted) {
        setShowTour(false);
      }
    }
  };

  const handleSkipTour = async () => {
    setShowTour(false);
    await skipOnboarding();
  };

  // Show loading while checking authentication
  if (state.authLoading) {
    return <LoadingSpinner size="lg" text="Loading Application..." />;
  }

  // Show login form if no user
  if (!state.user) {
    return (
      <ToastProvider>
        <OAuthErrorHandler />
        <LoginForm />
      </ToastProvider>
    );
  }

  // Show loading while fetching data for authenticated user
  if (state.isLoading) {
    return <LoadingSpinner size="lg" text="Loading your data..." />;
  }

  return (
    <>
      <div className="flex h-screen text-gray-800">
        <Sidebar />
        <main className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
          <div className="flex-1 p-6 lg:p-8">
            <MainContentArea />
          </div>
        </main>
        <NotificationBadge />
      </div>
      
      {/* Onboarding Components */}
      {showWelcome && (
        <OnboardingWelcome
          user={state.user}
          onStartTour={handleStartTour}
          onSkip={handleSkipWelcome}
        />
      )}
      
      {showTour && (
        <>
          <OnboardingProgress 
            currentStep={currentStep}
            totalSteps={totalSteps}
            currentView={currentView}
          />
          <OnboardingTour
            isActive={showTour}
            currentStep={currentStep}
            totalSteps={totalSteps}
            steps={steps}
            onNext={handleCompleteStep}
            onPrevious={goToPreviousStep}
            onSkip={handleSkipTour}
            isNavigating={isNavigating}
          />
        </>
      )}
      
      {/* Global Search */}
      <GlobalSearch 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
      />
      
      {/* Update Notification */}
      <UpdateNotification />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitationView />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
