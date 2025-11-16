import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
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

const AppContext = createContext();

const initialState = {
  isLoading: true, 
  authLoading: true, // Add separate auth loading state
  activeView: 'Dashboard', 
  selectedProjectId: null, 
  selectedChannelId: null,
  projects: [], contacts: [], tasks: [], files: [], calendarEvents: [], messageChannels: [], messages: [], activityLog: [],
  user: null, // Changed from hardcoded user to null for proper auth
  userPreferences: null, // Add user preferences for onboarding
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA': return { ...state, ...action.payload, isLoading: false };
    case 'SET_VIEW': return { ...state, activeView: action.payload };
    case 'SET_PROJECT': return { ...state, selectedProjectId: action.payload };
    case 'SET_CHANNEL': return { ...state, selectedChannelId: action.payload, activeView: 'Messages' };
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_AUTH_LOADING': return { ...state, authLoading: action.payload };
    case 'ADD_PROJECT': return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT': return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT': return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
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
    default: return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

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
        }
      } catch (error) {
        // Handle invalid refresh token error in catch block
        if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
          console.warn('Invalid refresh token detected, clearing session');
          await supabaseClient.auth.signOut();
          dispatch({ type: 'SET_USER', payload: null });
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
          } else if (session?.user) {
            dispatch({ type: 'SET_USER', payload: session.user });
          } else {
            dispatch({ type: 'SET_USER', payload: null });
          }
        } catch (error) {
          // Handle invalid refresh token errors
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            console.warn('Invalid refresh token detected, clearing session');
            await supabaseClient.auth.signOut();
            dispatch({ type: 'SET_USER', payload: null });
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
          
          // If no profile exists, create one
          if (!profile && !profileError) {
            console.log('Creating profile for user:', state.user.id);
            const { error: createProfileError } = await supabaseClient
              .from('profiles')
              .upsert({
                id: state.user.id,
                role: 'Team',
                contact_id: null
              }, {
                onConflict: 'id'
              });
            
            if (createProfileError) {
              console.error('Error creating profile:', createProfileError);
            } else {
              console.log('Profile created successfully');
            }
          }
          
          const [{ data: projects }, { data: contacts }, { data: tasks }, { data: files }, {data: calendarEvents}, {data: messageChannels}, {data: messages}, { data: userPreferences, error: userPrefsError }, { data: activityLog }] = await Promise.all([
            supabaseClient.from('projects').select('*'),
            supabaseClient.from('contacts').select('*, project_contacts!fk_project_contacts_contact_id(project_id)'),
            supabaseClient.from('tasks').select('*'),
            supabaseClient.from('files').select('*'),
            supabaseClient.from('calendar_events').select('*'),
            supabaseClient.from('message_channels').select('*'),
            supabaseClient.from('messages').select('*').order('created_at', { ascending: true }),
            supabaseClient.from('user_preferences').select('*').eq('user_id', state.user.id).maybeSingle(),
            supabaseClient.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
          ]);
          
          dispatch({ type: 'SET_DATA', payload: { 
            projects: projects || [], 
            contacts: contacts || [], 
            tasks: tasks || [], 
            files: files || [], 
            calendarEvents: calendarEvents || [], 
            messageChannels: messageChannels || [], 
            messages: messages || [],
            activityLog: activityLog || []
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

