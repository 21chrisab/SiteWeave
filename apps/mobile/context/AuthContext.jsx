import React, { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseClient } from '@siteweave/core-logic';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getPushToken, registerPushToken, setupNotificationListeners } from '../utils/notifications';

const AuthContext = createContext();

// Helper function to parse URL hash fragments
function parseHashParams(url) {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  
  const hash = url.substring(hashIndex + 1);
  const params = {};
  hash.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });
  return params;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [organizationError, setOrganizationError] = useState(null);
  
  // Get Supabase credentials from environment
  // Expo uses EXPO_PUBLIC_ prefix for environment variables
  // Use useMemo to prevent recreating the client on every render
  const supabase = React.useMemo(() => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
      Constants.expoConfig?.extra?.supabaseUrl;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
      Constants.expoConfig?.extra?.supabaseAnonKey;
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }, []);

  // Load user's organization from profiles table
  const loadUserOrganization = async () => {
    if (!user) {
      setActiveOrganization(null);
      setOrganizationError(null);
      return;
    }

    try {
      // Get user's profile with organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          organization_id,
          organizations (
            id,
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading organization:', profileError);
        setOrganizationError('Failed to load organization');
        setActiveOrganization(null);
        return;
      }

      if (!profile?.organization_id || !profile?.organizations) {
        setOrganizationError('No organization found. Please contact your administrator.');
        setActiveOrganization(null);
        return;
      }

      setActiveOrganization({
        id: profile.organizations.id,
        name: profile.organizations.name
      });
      setOrganizationError(null);
    } catch (error) {
      console.error('Error in loadUserOrganization:', error);
      setOrganizationError('Failed to load organization');
      setActiveOrganization(null);
    }
  };

  // Register push token when user is available
  useEffect(() => {
    if (user) {
      const registerToken = async () => {
        try {
          const token = await getPushToken();
          if (token) {
            await registerPushToken(supabase, user.id, token);
          }
        } catch (error) {
          console.error('Error registering push token:', error);
        }
      };
      
      // Register token after a short delay to ensure user is fully loaded
      const timer = setTimeout(registerToken, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, supabase]);

  // Setup notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle foreground notifications if needed
      },
      (response) => {
        console.log('Notification tapped:', response);
        // Handle notification tap navigation if needed
        // const data = response.notification.request.content.data;
        // if (data?.screen) {
        //   router.push(data.screen);
        // }
      }
    );

    return cleanup;
  }, []);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth changes
    // Supabase automatically handles session persistence, no need for SecureStore
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'Has session:', !!session);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            // User is signed in or session refreshed - keep them signed in
            if (session?.user) {
              setUser(session.user);
              // Load organization after user is set
              setTimeout(() => {
                loadUserOrganization();
              }, 100);
            }
            break;
          case 'SIGNED_OUT':
            // Only clear user if explicitly signed out
            setUser(null);
            setActiveOrganization(null);
            setOrganizationError(null);
            break;
          case 'PASSWORD_RECOVERY':
            // Don't change user state for password recovery
            break;
          default:
            // For other events, update user if session exists
            if (session?.user) {
              setUser(session.user);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const checkSession = async () => {
    try {
      // Supabase automatically handles session persistence
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // Don't sign out on error - might be temporary network issue
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('Session found, user:', session.user.email);
        setUser(session.user);
        
        // Refresh the session to ensure it's valid
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Error refreshing session:', refreshError);
          // If refresh fails, check if it's a real error or just expired
          if (refreshError.message?.includes('refresh_token_not_found') || 
              refreshError.message?.includes('invalid_grant')) {
            // Token is truly invalid, sign out
            setUser(null);
            setActiveOrganization(null);
          }
          // Otherwise, keep the existing session
        } else if (refreshedSession?.user) {
          setUser(refreshedSession.user);
          // Load organization after user is set
          setTimeout(() => {
            loadUserOrganization();
          }, 100);
        } else if (session?.user) {
          // If refresh failed but we have a session, still load organization
          setTimeout(() => {
            loadUserOrganization();
          }, 100);
        }
      } else {
        console.log('No session found');
        setUser(null);
        setActiveOrganization(null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Don't sign out on error - might be temporary network issue
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    try {
      // Create redirect URL using the app scheme - must match exactly what's configured
      const redirectUrl = `${Constants.expoConfig?.scheme || 'siteweave'}://`;
      
      // Start OAuth flow with implicit flow (no PKCE) since WebCrypto isn't available in React Native
      // This avoids the "invalid flow state" error caused by PKCE without WebCrypto
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // Manual browser handling
          queryParams: {
            // Force implicit flow by not using PKCE
            access_type: 'offline',
          },
        },
      });
      
      if (error) throw error;
      
      // Open the OAuth URL in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        
        // If user cancelled
        if (result.type === 'cancel') {
          throw new Error('OAuth sign-in was cancelled');
        }
        
        // Process the callback URL
        if (result.type === 'success' && result.url) {
          // Parse the callback URL
          const url = result.url;
          const parsedUrl = Linking.parse(url);
          const hashParams = parseHashParams(url);
          
          // Try hash fragment first (implicit flow)
          if (hashParams.access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token || '',
            });
            if (sessionError) throw sessionError;
            return sessionData;
          }
          
          // Try query params (implicit flow)
          if (parsedUrl.queryParams?.access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: parsedUrl.queryParams.access_token,
              refresh_token: parsedUrl.queryParams.refresh_token || '',
            });
            if (sessionError) throw sessionError;
            return sessionData;
          }
          
          // Try PKCE code exchange - this requires the flow state to be in storage
          // Skip this in React Native since WebCrypto isn't available and PKCE doesn't work properly
          if (parsedUrl.queryParams?.code && Platform.OS === 'web') {
            // Only try code exchange on web where WebCrypto is available
            // Wait a moment to ensure storage is synced
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(
              parsedUrl.queryParams.code
            );
            
            if (sessionError) {
              // If code exchange fails, it might be because flow state is lost
              // Try to get session directly in case Supabase processed it automatically
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                return { user: session.user, session };
              }
              throw sessionError;
            }
            return sessionData;
          }
          
          // If we have a code but we're on React Native, it means implicit flow should have been used
          // This shouldn't happen, but if it does, try to get session anyway
          if (parsedUrl.queryParams?.code) {
            console.warn('Received OAuth code but WebCrypto not available. Trying to get session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              return { user: session.user, session };
            }
            throw new Error('OAuth code received but cannot exchange (WebCrypto not available). Please use implicit flow.');
          }
          
          throw new Error('No valid OAuth tokens or code found in callback URL');
        }
        
        throw new Error('OAuth callback was not successful');
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      // Create redirect URL using the app scheme
      const redirectUrl = `${Constants.expoConfig?.scheme || 'siteweave'}://`;
      
      // Use implicit flow for React Native (no PKCE)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We'll handle the browser redirect manually
          queryParams: {
            // Force implicit flow by not using PKCE
            access_type: 'offline',
          },
        },
      });
      
      if (error) throw error;
      
      // Open the OAuth URL in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        
        if (result.type === 'success' && result.url) {
          // Parse the redirect URL - Supabase uses hash fragments
          const parsedUrl = Linking.parse(result.url);
          
          // Extract tokens from hash fragment (Supabase OAuth flow)
          if (parsedUrl.queryParams?.access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: parsedUrl.queryParams.access_token,
              refresh_token: parsedUrl.queryParams.refresh_token || '',
            });
            
            if (sessionError) throw sessionError;
            return sessionData;
          }
          
          // Fallback: try code exchange (PKCE flow)
          if (parsedUrl.queryParams?.code) {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(
              parsedUrl.queryParams.code
            );
            if (sessionError) throw sessionError;
            return sessionData;
          }
          
          // Try parsing hash fragment manually if queryParams didn't work
          const hashParams = parseHashParams(result.url);
          if (hashParams.access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token || '',
            });
            
            if (sessionError) throw sessionError;
            return sessionData;
          }
        } else if (result.type === 'cancel') {
          throw new Error('OAuth sign-in was cancelled');
        }
      }
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      // Check if Apple Authentication is available on this device
      if (Platform.OS !== 'ios') {
        throw new Error('Sign in with Apple is only available on iOS');
      }

      // Check if Apple Sign In is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }

      // Check if running in Expo Go (development)
      const isExpoGo = Constants.executionEnvironment === 'storeClient' || 
                       Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        throw new Error(
          'Apple Sign In is not available in Expo Go. ' +
          'Please use a development build or production build. ' +
          'Run: npx expo run:ios or build with EAS Build.'
        );
      }

      // Generate a secure random nonce
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Request Apple authentication with the hashed nonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce, // Pass hashed nonce to Apple
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using the Apple credential
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        console.error('Supabase Apple sign in error:', error);
        
        // Provide helpful error message for audience mismatch
        if (error.message && error.message.includes('audience')) {
          throw new Error(
            'Apple Sign In configuration error. ' +
            'This usually happens in Expo Go. ' +
            'Please use a development build (npx expo run:ios) or production build.'
          );
        }
        
        throw new Error(error.message || 'Failed to sign in with Apple');
      }

      // If user provided their name, update the user metadata
      if (credential.fullName && (credential.fullName.givenName || credential.fullName.familyName)) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        
        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName }
          });
        }
      }

      return data;
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        // User canceled Apple Sign in
        throw new Error('Sign in was cancelled');
      }
      console.error('Apple OAuth error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveOrganization(null);
    setOrganizationError(null);
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      // Call Supabase Edge Function to delete the account
      // First, get the current session to use the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call the delete-user edge function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error deleting account:', error);
        throw error;
      }

      // Sign out after successful deletion
      await signOut();
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      activeOrganization,
      organizationError,
      loadUserOrganization,
      signIn, 
      signInWithGoogle, 
      signInWithMicrosoft, 
      signInWithApple,
      signOut,
      deleteAccount,
      supabase 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

