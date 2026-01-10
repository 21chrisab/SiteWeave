import React, { createContext, useContext, useEffect, useReducer, useState, useRef } from 'react';
import { createSupabaseClient } from '@siteweave/core-logic';
import supabaseElectronAuth from '../utils/supabaseElectronAuth';

// --- SUPABASE CLIENT ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');

// Use shared Supabase client creation
const supabaseClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabaseClient };

export const AppContext = createContext();

// Helper functions for sessionStorage persistence
const STORAGE_KEY = 'siteweave_app_state';
const STORAGE_USER_KEY = 'siteweave_user_id';

const saveStateToStorage = (state) => {
  try {
    // Only save data arrays, not user/auth state
    const dataToSave = {
      projects: state.projects,
      contacts: state.contacts,
      tasks: state.tasks,
      files: state.files,
      calendarEvents: state.calendarEvents,
      messageChannels: state.messageChannels,
      messages: state.messages,
      activityLog: state.activityLog,
      selectedProjectId: state.selectedProjectId,
      activeView: state.activeView,
      timestamp: Date.now()
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    if (state.user?.id) {
      sessionStorage.setItem(STORAGE_USER_KEY, state.user.id);
    }
  } catch (error) {
    console.warn('Failed to save state to sessionStorage:', error);
  }
};

const loadStateFromStorage = (currentUserId) => {
  try {
    const savedUserId = sessionStorage.getItem(STORAGE_USER_KEY);
    // Only restore if it's the same user
    if (!currentUserId || savedUserId !== currentUserId) {
      return null;
    }
    
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    // Only use cached data if it's less than 5 minutes old
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - parsed.timestamp > maxAge) {
      return null;
    }
    
    return {
      projects: parsed.projects || [],
      contacts: parsed.contacts || [],
      tasks: parsed.tasks || [],
      files: parsed.files || [],
      calendarEvents: parsed.calendarEvents || [],
      messageChannels: parsed.messageChannels || [],
      messages: parsed.messages || [],
      activityLog: parsed.activityLog || [],
      selectedProjectId: parsed.selectedProjectId || null,
      activeView: parsed.activeView || 'Dashboard'
    };
  } catch (error) {
    console.warn('Failed to load state from sessionStorage:', error);
    return null;
  }
};

const getInitialState = () => {
  const baseState = {
    isLoading: true, 
    authLoading: true, // Add separate auth loading state
    activeView: 'Dashboard', 
    selectedProjectId: null, 
    selectedChannelId: null,
    projects: [], contacts: [], tasks: [], files: [], calendarEvents: [], messageChannels: [], messages: [], activityLog: [],
    user: null, // Changed from hardcoded user to null for proper auth
    userPreferences: null, // Add user preferences for onboarding
    currentOrganization: null, // Current organization context
    userRole: null, // User's role with permissions
    mustChangePassword: false, // Flag to force password reset for managed accounts
    organizationError: null, // Error message if user has no organization
    organizationLoading: false, // Loading state for organization check
    isProjectCollaborator: false, // User is a guest collaborator
    collaborationProjects: [], // Projects user can access as collaborator
  };
  
  // Try to restore from sessionStorage (will be null if no user or different user)
  const restored = loadStateFromStorage(null); // We'll restore after user is known
  if (restored) {
    return { ...baseState, ...restored };
  }
  
  return baseState;
};

const initialState = getInitialState();

function appReducer(state, action) {
  let newState;
  switch (action.type) {
    case 'SET_DATA': 
      // Preserve current activeView if not provided in payload (to prevent resetting on data refresh)
      newState = { 
        ...state, 
        ...action.payload, 
        activeView: action.payload.activeView !== undefined ? action.payload.activeView : state.activeView,
        isLoading: false 
      };
      // Save to sessionStorage for quick restore on refresh
      saveStateToStorage(newState);
      return newState;
    case 'SET_VIEW': 
      newState = { ...state, activeView: action.payload };
      saveStateToStorage(newState);
      return newState;
    case 'SET_PROJECT': return { ...state, selectedProjectId: action.payload };
    case 'SET_CHANNEL': return { ...state, selectedChannelId: action.payload, activeView: 'Messages' };
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_AUTH_LOADING': return { ...state, authLoading: action.payload };
    case 'ADD_PROJECT': 
      newState = { ...state, projects: [...state.projects, action.payload] };
      saveStateToStorage(newState);
      return newState;
    case 'UPDATE_PROJECT': 
      newState = { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
      saveStateToStorage(newState);
      return newState;
    case 'DELETE_PROJECT': 
      newState = { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
      saveStateToStorage(newState);
      return newState;
    case 'ADD_TASK': return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK': return { ...state, tasks: state.tasks.map(task => task.id === action.payload.id ? action.payload : task) };
    case 'DELETE_TASK': return { ...state, tasks: state.tasks.filter(task => task.id !== action.payload) };
    case 'REORDER_TASKS': return { ...state, tasks: action.payload };
    case 'ADD_FILE': return { ...state, files: [...state.files, action.payload] };
    case 'ADD_EVENT': return { ...state, calendarEvents: [...state.calendarEvents, action.payload] };
    case 'UPDATE_EVENT': return { 
      ...state, 
      calendarEvents: state.calendarEvents.map(event => 
        event.id === action.payload.id ? action.payload : event
      ) 
    };
    case 'DELETE_EVENT': return { 
      ...state, 
      calendarEvents: state.calendarEvents.filter(event => event.id !== action.payload) 
    };
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE': return { ...state, messages: state.messages.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'ADD_CHANNEL': return { ...state, messageChannels: [...state.messageChannels, action.payload] };
    case 'ADD_ACTIVITY': return { ...state, activityLog: [action.payload, ...state.activityLog].slice(0, 50) }; // Keep latest 50
    case 'ADD_CONTACT': {
      // Ensure project_contacts is always an array and prevent duplicates
      const newContact = { ...action.payload, project_contacts: Array.isArray(action.payload.project_contacts) ? action.payload.project_contacts : [] };
      
      // Check if contact already exists (to prevent duplicates from real-time subscription)
      const exists = state.contacts.some(c => c.id === newContact.id);
      if (exists) {
        // Update existing contact instead of adding duplicate
        return {
          ...state,
          contacts: state.contacts.map(c => c.id === newContact.id ? newContact : c)
        };
      }
      
      return { ...state, contacts: [...state.contacts, newContact] };
    }
    case 'UPDATE_CONTACT': return { 
      ...state, 
      contacts: state.contacts.map(contact => 
        contact.id === action.payload.id ? action.payload : contact
      ) 
    };
    case 'DELETE_CONTACT': return { 
      ...state, 
      contacts: state.contacts.filter(contact => contact.id !== action.payload) 
    };
    case 'ADD_PROJECT_CONTACT': return { 
      ...state, 
      contacts: state.contacts.map(c => c.id === action.payload.contact_id 
        ? { ...c, project_contacts: [...(Array.isArray(c.project_contacts) ? c.project_contacts : []), { project_id: action.payload.project_id }] } 
        : c
      ) 
    };
    case 'REMOVE_PROJECT_CONTACT': return { 
      ...state, 
      contacts: state.contacts.map(c => c.id === action.payload.contact_id 
        ? { ...c, project_contacts: (Array.isArray(c.project_contacts) ? c.project_contacts : []).filter(pc => pc.project_id !== action.payload.project_id) } 
        : c
      ) 
    };
    case 'SET_USER_PREFERENCES': return { ...state, userPreferences: action.payload };
    case 'UPDATE_USER_PREFERENCES': return { ...state, userPreferences: { ...state.userPreferences, ...action.payload } };
    case 'SET_ORGANIZATION': return { ...state, currentOrganization: action.payload };
    case 'SET_USER_ROLE': return { ...state, userRole: action.payload };
    case 'SET_MUST_CHANGE_PASSWORD': return { ...state, mustChangePassword: action.payload };
    case 'SET_ORGANIZATION_ERROR': return { ...state, organizationError: action.payload };
    case 'SET_ORGANIZATION_LOADING': return { ...state, organizationLoading: action.payload };
    case 'SET_COLLABORATOR_STATUS': return { 
      ...state, 
      isProjectCollaborator: action.payload.isCollaborator,
      collaborationProjects: action.payload.projects || []
    };
    default: return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const currentActiveViewRef = useRef(state.activeView);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentActiveViewRef.current = state.activeView;
  }, [state.activeView]);

  // Expose debug helpers to window for console access (development only)
  useEffect(() => {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__SITEWEAVE_DEBUG__ = {
        getState: () => state,
        getSupabase: () => supabaseClient,
        clearSetupWizard: (userId) => {
          if (userId) {
            localStorage.removeItem(`setup_complete_${userId}`);
            console.log('Setup wizard flag cleared for user:', userId);
          } else if (state.user?.id) {
            localStorage.removeItem(`setup_complete_${state.user.id}`);
            console.log('Setup wizard flag cleared for current user');
          } else {
            console.log('No user ID provided or user not logged in');
          }
        },
        checkSetupWizard: () => {
          if (state.user?.id) {
            const setupComplete = localStorage.getItem(`setup_complete_${state.user.id}`);
            console.log('Setup wizard status:', {
              userId: state.user.id,
              setupComplete: setupComplete,
              userRole: state.userRole?.name,
              canManageTeam: state.userRole?.permissions?.can_manage_team
            });
            return { setupComplete: !!setupComplete, userRole: state.userRole };
          } else {
            console.log('No user logged in');
            return null;
          }
        },
        getOrganization: () => {
          console.log('Current organization:', state.currentOrganization);
          return state.currentOrganization;
        },
        getUser: () => {
          console.log('Current user:', state.user);
          return state.user;
        }
      };
    }
  }, [state]);

  useEffect(() => {
    // Check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
          // Handle invalid refresh token error
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            console.warn('Invalid refresh token detected, clearing session');
            await supabaseClient.auth.signOut();
            dispatch({ type: 'SET_USER', payload: null });
          } else {
            console.error('Error getting session:', error);
          }
        } else if (session?.user) {
          dispatch({ type: 'SET_USER', payload: session.user });
          // Restore cached data immediately when user is set, but preserve current activeView
          const cachedData = loadStateFromStorage(session.user.id);
          if (cachedData) {
            // Preserve current activeView if it's already set (user is navigating)
            const activeViewToUse = currentActiveViewRef.current && currentActiveViewRef.current !== 'Dashboard' 
              ? currentActiveViewRef.current 
              : (cachedData.activeView || 'Dashboard');
            dispatch({ type: 'SET_DATA', payload: { 
              ...cachedData, 
              activeView: activeViewToUse,
              isLoading: false 
            } });
          }
        }
      } catch (error) {
          // Handle invalid refresh token error in catch block
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            console.warn('Invalid refresh token detected, clearing session');
            await supabaseClient.auth.signOut();
            dispatch({ type: 'SET_USER', payload: null });
            // Clear cached data on logout
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_USER_KEY);
          } else {
            console.error('Error getting session:', error);
          }
      } finally {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // Handle token refresh errors
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.warn('Token refresh failed, signing out');
            await supabaseClient.auth.signOut();
            dispatch({ type: 'SET_USER', payload: null });
            // Clear cached data on logout
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_USER_KEY);
          } else if (session?.user) {
            dispatch({ type: 'SET_USER', payload: session.user });
            // Restore cached data immediately when user is set, but preserve current activeView
            const cachedData = loadStateFromStorage(session.user.id);
            if (cachedData) {
              // Preserve current activeView if it's already set (user is navigating)
              const activeViewToUse = currentActiveViewRef.current && currentActiveViewRef.current !== 'Dashboard' 
                ? currentActiveViewRef.current 
                : (cachedData.activeView || 'Dashboard');
              dispatch({ type: 'SET_DATA', payload: { 
                ...cachedData, 
                activeView: activeViewToUse,
                isLoading: false 
              } });
            }
          } else {
            dispatch({ type: 'SET_USER', payload: null });
            // Clear cached data on logout
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_USER_KEY);
          }
        } catch (error) {
          // Handle invalid refresh token errors
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            console.warn('Invalid refresh token detected, clearing session');
            await supabaseClient.auth.signOut();
            dispatch({ type: 'SET_USER', payload: null });
            // Clear cached data on logout
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_USER_KEY);
          } else {
            console.error('Error handling auth state change:', error);
          }
        } finally {
          dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        }
      }
    );

    // Listen for Electron OAuth callbacks
    const handleElectronOAuthCallback = (event) => {
      const { session } = event.detail;
      if (session) {
        console.log('Setting Supabase session from OAuth callback:', session);
        // Set the session in Supabase client
        supabaseClient.auth.setSession(session);
      }
    };

    // Listen for postMessage from OAuth callback window
    const handlePostMessage = (event) => {
      if (event.data && event.data.type === 'supabase-oauth-callback') {
        console.log('Received OAuth callback via postMessage:', event.data);
        const { hash } = event.data;
        
        if (hash) {
          // Parse hash parameters
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const expiresAt = hashParams.get('expires_at');
          const tokenType = hashParams.get('token_type') || 'bearer';
          
          if (accessToken) {
            // Parse user from token
            let user = null;
            try {
              const payload = JSON.parse(atob(accessToken.split('.')[1]));
              user = {
                id: payload.sub,
                email: payload.email,
                user_metadata: payload.user_metadata || {},
                app_metadata: payload.app_metadata || {}
              };
            } catch (error) {
              console.error('Error parsing token:', error);
            }

            const session = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt ? parseInt(expiresAt) : null,
              token_type: tokenType,
              user: user
            };

            console.log('Setting session from postMessage:', session);
            supabaseClient.auth.setSession(session);
          }
        }
      }
    };

    window.addEventListener('supabase-oauth-callback', handleElectronOAuthCallback);
    window.addEventListener('message', handlePostMessage);

    // Global error handler for unhandled Supabase auth errors
    const handleUnhandledError = (event) => {
      const error = event.reason || event.error;
      if (!error) return;
      
      // Check if it's a Supabase auth error about invalid refresh token
      const errorMessage = error.message || error.toString() || '';
      const isInvalidTokenError = 
        errorMessage.includes('Invalid Refresh Token') || 
        errorMessage.includes('Refresh Token Not Found') ||
        (error.name === 'AuthApiError' && errorMessage.includes('refresh'));
      
      if (isInvalidTokenError) {
        console.warn('Caught invalid refresh token error, clearing session');
        // Prevent the error from showing in console as an unhandled error
        event.preventDefault();
        // Clear the invalid session silently
        supabaseClient.auth.signOut().catch(() => {
          // Ignore errors during sign out
        });
        dispatch({ type: 'SET_USER', payload: null });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledError);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('supabase-oauth-callback', handleElectronOAuthCallback);
      window.removeEventListener('message', handlePostMessage);
      window.removeEventListener('unhandledrejection', handleUnhandledError);
    };
  }, []);

  useEffect(() => {
    if (!state.authLoading && state.user) {
      // Only fetch data if user is authenticated
      async function fetchInitialData() {
        try {
          // First, check if user has a profile
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', state.user.id)
            .maybeSingle();
          
          console.log('User profile:', profile);
          if (profileError) {
            console.error('Profile error:', profileError);
          }
          
          let finalProfile = profile;
          let contactId = profile?.contact_id;
          
          // If no profile exists, create one and ensure contact exists
          if (!profile && !profileError) {
            console.log('Creating profile for user:', state.user.id);
            
            // First, check if contact exists by email
            let contactIdToLink = null;
            if (state.user.email) {
              const { data: existingContact } = await supabaseClient
                .from('contacts')
                .select('id')
                .ilike('email', state.user.email)
                .maybeSingle();
              
              if (existingContact) {
                contactIdToLink = existingContact.id;
                console.log('Found existing contact for new profile:', contactIdToLink);
              } else {
                // Create contact for new user
                const { data: newContact, error: contactError } = await supabaseClient
                .from('contacts')
                .insert({
                    name: state.user.user_metadata?.full_name || state.user.email.split('@')[0] || 'User',
                    email: state.user.email,
                    type: 'Team',
                    role: 'Team Member',
                    status: 'Available',
                    created_by_user_id: state.user.id,
                    organization_id: finalProfile?.organization_id || null
                  })
                  .select('id')
                  .single();
                
                if (!contactError && newContact) {
                  contactIdToLink = newContact.id;
                  console.log('Created new contact for new profile:', contactIdToLink);
                } else {
                  console.error('Error creating contact for new profile:', contactError);
                }
              }
            }
            
            const { error: createProfileError } = await supabaseClient
              .from('profiles')
              .upsert({
                id: state.user.id,
                role_id: null, // Will be assigned when user joins organization
                contact_id: contactIdToLink,
                organization_id: null // Will be assigned via invitation
              }, {
                onConflict: 'id'
              });
            
            if (createProfileError) {
              console.error('Error creating profile:', createProfileError);
            } else {
              console.log('Profile created successfully with contact_id:', contactIdToLink);
              // Re-fetch the profile
              const { data: newProfile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', state.user.id)
                .single();
              finalProfile = newProfile;
              contactId = contactIdToLink;
            }
          }
          
          // If profile exists but no contact_id, ensure user has a contact
          if (finalProfile && !finalProfile.contact_id && state.user.email) {
            console.log('Profile exists but no contact_id. Ensuring contact exists for email:', state.user.email);
            
            // First, try to find existing contact by email
            const { data: existingContact } = await supabaseClient
              .from('contacts')
              .select('id')
              .ilike('email', state.user.email)
              .maybeSingle();
            
            if (existingContact) {
              console.log('Found existing contact, linking to profile:', existingContact.id);
              const { error: linkError } = await supabaseClient
                .from('profiles')
                .update({ contact_id: existingContact.id })
                .eq('id', state.user.id);
              
              if (linkError) {
                console.error('Error linking contact to profile:', linkError);
              } else {
                contactId = existingContact.id;
                console.log('Successfully linked contact to profile');
              }
            } else {
              // No existing contact found - create one for the user
              console.log('No existing contact found. Creating new contact for user:', state.user.email);
              const { data: newContact, error: createContactError } = await supabaseClient
                .from('contacts')
                .insert({
                  name: state.user.user_metadata?.full_name || state.user.email.split('@')[0] || 'User',
                  email: state.user.email,
                  type: finalProfile.role === 'Client' ? 'Client' : 'Team',
                  role: finalProfile.role === 'PM' ? 'PM' : finalProfile.role === 'Admin' ? 'Admin' : 'Team Member',
                  status: 'Available',
                  created_by_user_id: state.user.id,
                  organization_id: finalProfile?.organization_id || null
                })
                .select('id')
                .single();
              
              if (createContactError) {
                console.error('Error creating contact:', createContactError);
              } else if (newContact) {
                console.log('Created new contact:', newContact.id);
                // Link the new contact to the profile
                const { error: linkError } = await supabaseClient
                  .from('profiles')
                  .update({ contact_id: newContact.id })
                  .eq('id', state.user.id);
                
                if (linkError) {
                  console.error('Error linking new contact to profile:', linkError);
                } else {
                  contactId = newContact.id;
                  console.log('Successfully created and linked contact to profile');
                }
              }
            }
          } else if (finalProfile?.contact_id) {
            contactId = finalProfile.contact_id;
          }
          
          // Load organization and user role
          const { data: profileWithOrg } = await supabaseClient
            .from('profiles')
            .select(`
              organization_id,
              role_id,
              roles (
                id,
                name,
                permissions,
                is_system_role
              )
            `)
            .eq('id', state.user.id)
            .single();
          
          // Check must_change_password separately (column may not exist in older schemas)
          let mustChangePassword = false;
          try {
            const { data: profileCheck } = await supabaseClient
              .from('profiles')
              .select('must_change_password')
              .eq('id', state.user.id)
              .single();
            mustChangePassword = profileCheck?.must_change_password || false;
          } catch (error) {
            // Column doesn't exist yet, default to false
            console.warn('must_change_password column not found, defaulting to false:', error);
            mustChangePassword = false;
          }

          let organization = null;
          if (profileWithOrg?.organization_id) {
            const { data: orgData } = await supabaseClient
              .from('organizations')
              .select('*')
              .eq('id', profileWithOrg.organization_id)
              .single();
            organization = orgData;
            dispatch({ type: 'SET_ORGANIZATION', payload: orgData });
            dispatch({ type: 'SET_USER_ROLE', payload: profileWithOrg.roles });
            // Clear any organization errors if org is found
            dispatch({ type: 'SET_ORGANIZATION_ERROR', payload: null });
            dispatch({ type: 'SET_COLLABORATOR_STATUS', payload: { isCollaborator: false, projects: [] } });
          } else {
            // No organization found - check for project collaborations
            dispatch({ type: 'SET_ORGANIZATION_LOADING', payload: true });
            try {
              const { getUserCollaborationProjects } = await import('../utils/projectCollaborationService');
              const collaborations = await getUserCollaborationProjects(supabaseClient, state.user.id);
              
              if (collaborations && collaborations.length > 0) {
                // User is a collaborator - allow access
                const collaborationProjects = collaborations.map(c => c.projects).filter(Boolean);
                dispatch({ 
                  type: 'SET_COLLABORATOR_STATUS', 
                  payload: { 
                    isCollaborator: true, 
                    projects: collaborationProjects 
                  } 
                });
                dispatch({ type: 'SET_ORGANIZATION_ERROR', payload: null });
                console.log('User is a project collaborator with', collaborations.length, 'project(s)');
              } else {
                // No organization AND no collaborations
                dispatch({ type: 'SET_ORGANIZATION_ERROR', payload: 'No organization or project access found. Please contact your administrator.' });
                dispatch({ type: 'SET_COLLABORATOR_STATUS', payload: { isCollaborator: false, projects: [] } });
              }
            } catch (error) {
              console.error('Error checking for project collaborations:', error);
              // On error, still set organization error
              dispatch({ type: 'SET_ORGANIZATION_ERROR', payload: 'No organization found. Please contact your administrator.' });
              dispatch({ type: 'SET_COLLABORATOR_STATUS', payload: { isCollaborator: false, projects: [] } });
            } finally {
              dispatch({ type: 'SET_ORGANIZATION_LOADING', payload: false });
            }
          }
          
          // Check if user must change password
          if (mustChangePassword) {
            dispatch({ type: 'SET_MUST_CHANGE_PASSWORD', payload: true });
          }

          // Fetch projects - RLS policy handles filtering automatically by organization_id
          // The RLS policy allows:
          // - Organization members: projects in their organization
          // - Project collaborators: specific projects they're invited to
          const [{ data: projects }, { data: tasks }, { data: files }, {data: calendarEvents}, {data: messageChannels}, {data: messages}, { data: userPreferences, error: userPrefsError }, { data: activityLog }] = await Promise.all([
            supabaseClient.from('projects').select('*'),
            supabaseClient.from('tasks').select('*'),
            supabaseClient.from('files').select('*'),
            supabaseClient.from('calendar_events').select('*'),
            supabaseClient.from('message_channels').select('*'),
            supabaseClient.from('messages').select('*').order('created_at', { ascending: true }),
            supabaseClient.from('user_preferences').select('*').eq('user_id', state.user.id).maybeSingle(),
            supabaseClient.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
          ]);
          
          // RLS policy automatically filters projects based on user role
          // No need for manual filtering - RLS handles it
          const finalProjects = projects || [];
          console.log('Loaded projects:', finalProjects.length);
          
          // Fetch virtual contacts (Organization Directory + Project Collaborators)
          // Import virtual contacts service
          const { getVirtualContacts, getProjectContactsForContacts } = await import('../utils/virtualContactsService');
          const userProjectIds = finalProjects.map(p => p.id);
          const organizationId = organization?.id || null;
          
          let finalContacts = [];
          try {
            finalContacts = await getVirtualContacts(
              supabaseClient,
              state.user.id,
              organizationId,
              userProjectIds
            );
            
            // Populate project_contacts for internal members who might have project assignments
            const internalContactIds = finalContacts
              .filter(c => c.is_internal && c.id)
              .map(c => c.id);
            
            if (internalContactIds.length > 0) {
              const projectContacts = await getProjectContactsForContacts(supabaseClient, internalContactIds);
              
              // Attach project_contacts to internal contacts
              finalContacts = finalContacts.map(contact => {
                if (contact.is_internal) {
                  const contactProjectContacts = projectContacts
                    .filter(pc => pc.contact_id === contact.id)
                    .map(pc => ({ project_id: pc.project_id }));
                  
                  // Merge with existing project_contacts from collaborators
                  const existingProjectContacts = contact.project_contacts || [];
                  const mergedProjectContacts = [...existingProjectContacts];
                  
                  contactProjectContacts.forEach(pc => {
                    if (!mergedProjectContacts.some(epc => epc.project_id === pc.project_id)) {
                      mergedProjectContacts.push(pc);
                    }
                  });
                  
                  return {
                    ...contact,
                    project_contacts: mergedProjectContacts
                  };
                }
                return contact;
              });
            }
            
            console.log('Loaded virtual contacts:', finalContacts.length);
          } catch (error) {
            console.error('Error fetching virtual contacts:', error);
            finalContacts = [];
          }
          
          // Preserve current activeView when fetching data
          dispatch({ type: 'SET_DATA', payload: { 
            projects: finalProjects, 
            contacts: finalContacts, 
            tasks: tasks || [], 
            files: files || [], 
            calendarEvents: calendarEvents || [], 
            messageChannels: messageChannels || [], 
            messages: messages || [],
            activityLog: activityLog || [],
            activeView: currentActiveViewRef.current || state.activeView
          } });
          
          // Handle user preferences with error checking
          if (userPrefsError) {
            console.warn('User preferences table may not exist yet:', userPrefsError.message);
            dispatch({ type: 'SET_USER_PREFERENCES', payload: null });
          } else {
            dispatch({ type: 'SET_USER_PREFERENCES', payload: userPreferences });
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
          // Still set loading to false even if there's an error
          dispatch({ type: 'SET_DATA', payload: { projects: [], contacts: [], tasks: [], files: [], calendarEvents: [], messageChannels: [], messages: [] } });
          dispatch({ type: 'SET_USER_PREFERENCES', payload: null });
        }
      }
    fetchInitialData();

    // --- REAL-TIME SUBSCRIPTIONS ---
    const projectsSubscription = supabaseClient.channel('public:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_PROJECT', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_PROJECT', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_PROJECT', payload: payload.old.id });
        }
      })
      .subscribe();

    const filesSubscription = supabaseClient.channel('public:files')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files' }, (payload) => {
        dispatch({ type: 'ADD_FILE', payload: payload.new });
      })
      .subscribe();

    const calendarEventsSubscription = supabaseClient.channel('public:calendar_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_events' }, (payload) => {
        dispatch({ type: 'ADD_EVENT', payload: payload.new });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendar_events' }, (payload) => {
        dispatch({ type: 'UPDATE_EVENT', payload: payload.new });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'calendar_events' }, (payload) => {
        dispatch({ type: 'DELETE_EVENT', payload: payload.old.id });
      })
      .subscribe();

    const contactsSubscription = supabaseClient.channel('public:contacts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contacts' }, async (payload) => {
        // Re-fetch the contact with relationships to match initial load structure
        const { data: fullContact } = await supabaseClient
          .from('contacts')
          .select('*, project_contacts!fk_project_contacts_contact_id(project_id)')
          .eq('id', payload.new.id)
          .single();
        if (fullContact) {
          dispatch({ type: 'ADD_CONTACT', payload: fullContact });
        } else {
          // Fallback to payload.new if re-fetch fails
          dispatch({ type: 'ADD_CONTACT', payload: payload.new });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contacts' }, async (payload) => {
        // Re-fetch the contact with relationships
        const { data: fullContact } = await supabaseClient
          .from('contacts')
          .select('*, project_contacts!fk_project_contacts_contact_id(project_id)')
          .eq('id', payload.new.id)
          .single();
        if (fullContact) {
          dispatch({ type: 'UPDATE_CONTACT', payload: fullContact });
        } else {
          // Fallback to payload.new if re-fetch fails
          dispatch({ type: 'UPDATE_CONTACT', payload: payload.new });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'contacts' }, (payload) => {
        dispatch({ type: 'DELETE_CONTACT', payload: payload.old.id });
      })
      .subscribe();

    const projectContactsSubscription = supabaseClient.channel('public:project_contacts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_contacts' }, (payload) => {
        dispatch({ type: 'ADD_PROJECT_CONTACT', payload: payload.new });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'project_contacts' }, (payload) => {
        dispatch({ type: 'REMOVE_PROJECT_CONTACT', payload: payload.old });
      })
      .subscribe();
    
    const tasksSubscription = supabaseClient.channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data: updatedTask } = await supabaseClient.from('tasks').select('*, contacts(name, avatar_url)').eq('id', payload.new.id).single();
          if (updatedTask) dispatch({ type: 'ADD_TASK', payload: updatedTask });
        } else if (payload.eventType === 'UPDATE') {
          const { data: updatedTask } = await supabaseClient.from('tasks').select('*, contacts(name, avatar_url)').eq('id', payload.new.id).single();
          if (updatedTask) dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_TASK', payload: payload.old.id });
        }
      })
      .subscribe();

    const messagesSubscription = supabaseClient.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const { data: newMessage } = await supabaseClient.from('messages').select('*').eq('id', payload.new.id).single();
        if (newMessage && newMessage.user_id) {
          // Fetch user info from contacts via profiles (using separate queries to avoid relationship ambiguity)
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, contact_id')
            .eq('id', newMessage.user_id)
            .maybeSingle();
          
          if (profile?.contact_id) {
            const { data: contact } = await supabaseClient
              .from('contacts')
              .select('id, name, avatar_url')
              .eq('id', profile.contact_id)
              .maybeSingle();
            
            if (contact) {
              newMessage.user = {
                id: profile.id,
                name: contact.name,
                avatar_url: contact.avatar_url
              };
            }
          }
        }
        if (newMessage) dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, async (payload) => {
        // Update message instantly when edited
        const updatedMessage = payload.new;
        // Preserve user info if it exists in the current message
        const currentMessage = state.messages.find(m => m.id === updatedMessage.id);
        if (currentMessage?.user) {
          updatedMessage.user = currentMessage.user;
        }
        dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
      })
      .subscribe();

    const messageChannelsSubscription = supabaseClient.channel('public:message_channels')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_channels' }, (payload) => {
        dispatch({ type: 'ADD_CHANNEL', payload: payload.new });
      })
      .subscribe();

    const userPreferencesSubscription = supabaseClient.channel('public:user_preferences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          dispatch({ type: 'SET_USER_PREFERENCES', payload: payload.new });
        }
      })
      .subscribe();

    const activityLogSubscription = supabaseClient.channel('public:activity_log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        dispatch({ type: 'ADD_ACTIVITY', payload: payload.new });
      })
      .subscribe();

      return () => supabaseClient.removeAllChannels();
    }
  }, [state.authLoading, state.user]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);

