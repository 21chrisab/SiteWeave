import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { onboardingSteps, getTotalSteps } from '../utils/onboardingSteps';

export const useOnboarding = (dispatch, state) => {
  const { addToast } = useToast();
  const [userPreferences, setUserPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentView, setCurrentView] = useState('Dashboard');
  const [isNavigating, setIsNavigating] = useState(false);

  const steps = onboardingSteps;

  // Get user preferences from localStorage
  const getUserPreferences = (userId) => {
    try {
      const stored = localStorage.getItem(`onboarding_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading user preferences from localStorage:', error);
      return null;
    }
  };

  // Save user preferences to localStorage
  const saveUserPreferences = (userId, preferences) => {
    try {
      localStorage.setItem(`onboarding_${userId}`, JSON.stringify(preferences));
      setUserPreferences(preferences);
      return true;
    } catch (error) {
      console.error('Error saving user preferences to localStorage:', error);
      return false;
    }
  };

  // Initialize onboarding for a user
  const initializeOnboarding = async (userId) => {
    setIsLoading(true);
    
    try {
      let preferences = getUserPreferences(userId);
      
      if (!preferences) {
        // Create default preferences for new user
        preferences = {
          user_id: userId,
          onboarding_completed: false,
          onboarding_step: 0,
          created_at: new Date().toISOString()
        };
        saveUserPreferences(userId, preferences);
      }

      setUserPreferences(preferences);
      
      // Check if user needs onboarding
      const needsOnboarding = preferences && !preferences.onboarding_completed;
      
      if (needsOnboarding) {
        setIsOnboardingActive(true);
        setCurrentStep(preferences.onboarding_step || 0);
        const stepInfo = steps[preferences.onboarding_step || 0];
        if (stepInfo) {
          setCurrentView(stepInfo.view);
        }
      }
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      // If there's an error, assume onboarding is not needed
      setUserPreferences(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Start the onboarding tour
  const startOnboarding = async () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
    const stepInfo = steps[0];
    if (stepInfo) {
      setCurrentView(stepInfo.view);
      await navigateToView(stepInfo.view);
    }
    if (state.user) {
      saveUserPreferences(state.user.id, { ...userPreferences, onboarding_step: 0 });
    }
  };

  // Complete current step and move to next
  const completeStep = async () => {
    const nextStep = currentStep + 1;
    
    if (nextStep >= steps.length) {
      await completeOnboarding();
      return true; // Indicate completion
    } else {
      // First, check if we need to navigate to a different view
      const nextStepInfo = steps[nextStep];
      if (nextStepInfo && nextStepInfo.view !== currentView) {
        await navigateToView(nextStepInfo.view);
      }
      
      // Then update the step
      setCurrentStep(nextStep);
      if (state.user) {
        saveUserPreferences(state.user.id, { ...userPreferences, onboarding_step: nextStep });
      }
      
      return false; // Indicate not completed
    }
  };

  // Go to previous step
  const goToPreviousStep = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      
      // First, check if we need to navigate to a different view
      const prevStepInfo = steps[prevStep];
      if (prevStepInfo && prevStepInfo.view !== currentView) {
        await navigateToView(prevStepInfo.view);
      }
      
      // Then update the step
      setCurrentStep(prevStep);
      if (state.user) {
        saveUserPreferences(state.user.id, { ...userPreferences, onboarding_step: prevStep });
      }
    }
  };

  // Skip the entire onboarding
  const skipOnboarding = async () => {
    setIsOnboardingActive(false);
    if (state.user) {
      saveUserPreferences(state.user.id, { 
        ...userPreferences,
        onboarding_completed: true,
        onboarding_step: steps.length - 1
      });
    }
  };

  // Complete the entire onboarding
  const completeOnboarding = async () => {
    setIsOnboardingActive(false);
    if (state.user) {
      saveUserPreferences(state.user.id, { 
        ...userPreferences,
        onboarding_completed: true,
        onboarding_step: steps.length - 1
      });
    }
    addToast('Welcome to SiteWeave! You\'re all set.', 'success');
  };

  // Get current step info
  const getCurrentStepInfo = () => {
    return steps[currentStep] || null;
  };

    // Navigate to a specific view
  const navigateToView = async (viewName) => {
    if (!dispatch) return;
    
    setIsNavigating(true);
    dispatch({ type: 'SET_VIEW', payload: viewName });
    setCurrentView(viewName);
    
    // Special handling for Projects view - ensure there's a project selected
    if (viewName === 'Projects' && state) {
      // Check if we need to select a project
      if (state.projects && state.projects.length > 0 && !state.selectedProjectId) {
        dispatch({ type: 'SET_PROJECT', payload: state.projects[0].id });
      }
    }
    
    // Special handling for Contacts view - switch to Subcontractors tab for tour
    if (viewName === 'Contacts') {
      // Switch to Subcontractors tab by dispatching a custom event
      window.dispatchEvent(new CustomEvent('switchToSubcontractorsTab'));
    }
    
    // Wait for view to render
    await new Promise(resolve => setTimeout(resolve, 100)); // Minimal wait time
    setIsNavigating(false);
  };

  // Check if current step requires view navigation
  const checkViewNavigation = async () => {
    const currentStepInfo = steps[currentStep];
    if (!currentStepInfo || !dispatch) return;
    
    if (currentStepInfo.view !== currentView) {
      await navigateToView(currentStepInfo.view);
    }
  };

  // Check if onboarding should be shown
  const shouldShowOnboarding = () => {
    return userPreferences && !userPreferences.onboarding_completed && isOnboardingActive;
  };

  return {
    userPreferences,
    isLoading,
    isOnboardingActive,
    currentStep,
    currentView,
    isNavigating,
    totalSteps: getTotalSteps(),
    steps,
    getCurrentStepInfo,
    shouldShowOnboarding,
    initializeOnboarding,
    startOnboarding,
    completeStep,
    goToPreviousStep,
    skipOnboarding,
    completeOnboarding,
    navigateToView
  };
};
