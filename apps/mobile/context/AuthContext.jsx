import React, { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseClient } from '@siteweave/core-logic';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext();

const SESSION_KEY = 'supabase_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get Supabase credentials from environment
  // Expo uses EXPO_PUBLIC_ prefix for environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
    Constants.expoConfig?.extra?.supabaseUrl;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
    Constants.expoConfig?.extra?.supabaseAnonKey;
  
  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
        } else {
          setUser(null);
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Error checking session:', error);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, supabase }}>
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

