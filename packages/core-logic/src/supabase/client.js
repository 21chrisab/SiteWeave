import { createClient } from '@supabase/supabase-js';

/**
 * Gets storage adapter for React Native (AsyncStorage)
 * @returns {Object|undefined} Storage adapter or undefined if not available
 */
function getStorageAdapter() {
  // Try to import AsyncStorage for React Native
  try {
    // Check if we're in a React Native/Expo environment
    if (typeof require !== 'undefined') {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (AsyncStorage) {
        return {
          getItem: async (key) => {
            try {
              return await AsyncStorage.getItem(key);
            } catch (error) {
              console.error('Error getting item from AsyncStorage:', error);
              return null;
            }
          },
          setItem: async (key, value) => {
            try {
              await AsyncStorage.setItem(key, value);
            } catch (error) {
              console.error('Error setting item in AsyncStorage:', error);
            }
          },
          removeItem: async (key) => {
            try {
              await AsyncStorage.removeItem(key);
            } catch (error) {
              console.error('Error removing item from AsyncStorage:', error);
            }
          },
        };
      }
    }
  } catch (error) {
    // AsyncStorage not available, will use default storage
    // This is fine for web environments
  }
  return undefined; // Use default storage (localStorage for web)
}

/**
 * Creates a Supabase client instance
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseAnonKey - Supabase anonymous key
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client instance
 */
export function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  const storageAdapter = getStorageAdapter();
  
  // Detect if we're in React Native/Expo environment
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  const hasWebCrypto = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;
  
  const authOptions = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'supabase.auth.token', // Explicit storage key for consistency
    // Use implicit flow for React Native since WebCrypto isn't available for PKCE
    // PKCE requires WebCrypto API which isn't available in React Native
    flowType: (isReactNative || !hasWebCrypto) ? 'implicit' : 'pkce',
  };
  
  // Only add storage if we have a custom adapter (React Native)
  if (storageAdapter) {
    authOptions.storage = storageAdapter;
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Using fallback values for demo mode.');
    const fallbackUrl = 'https://demo.supabase.co';
    const fallbackKey = 'demo-key';
    
    return createClient(
      supabaseUrl || fallbackUrl,
      supabaseAnonKey || fallbackKey,
      {
        auth: authOptions,
      }
    );
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: authOptions,
  });
}

/**
 * Gets Supabase client with environment variables
 * Works for both web and mobile (uses process.env)
 * 
 * Note: For Vite web apps, ensure environment variables are available via process.env
 * or use createSupabaseClient() directly with explicit values.
 */
export function getSupabaseClient() {
  // Try different environment variable sources from process.env
  // This works for both web (if env vars are exposed) and mobile (Expo)
  let supabaseUrl;
  let supabaseAnonKey;
  
  if (typeof process !== 'undefined' && process.env) {
    supabaseUrl = 
      process.env.VITE_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;
      
    supabaseAnonKey = 
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

