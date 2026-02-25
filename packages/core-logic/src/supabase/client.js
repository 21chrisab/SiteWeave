import { createClient } from '@supabase/supabase-js';

/**
 * Gets storage adapter for React Native (AsyncStorage)
 * @returns {Object|undefined} Storage adapter or undefined if not available
 */
function getStorageAdapter() {
  // Only attempt to load AsyncStorage in React Native environment
  // Skip entirely for web/electron to avoid build-time resolution errors
  try {
    // Detect React Native environment
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      // Use eval to prevent Vite from trying to statically resolve this import
      // This is safe because we only execute this in React Native
      const AsyncStorage = eval("require('@react-native-async-storage/async-storage')").default;
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
    // This is fine for web/electron environments
  }
  return undefined; // Use default storage (localStorage for web/electron)
}

/**
 * In React Native, polyfill global crypto so PKCE can be used (recommended over implicit flow).
 * Requires: react-native-get-random-values; for PKCE code challenge also expo-crypto.
 */
function polyfillReactNativeCrypto() {
  if (typeof navigator === 'undefined' || navigator.product !== 'ReactNative') return;
  try {
    if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
      require('react-native-get-random-values');
    }
    if (globalThis.crypto && !globalThis.crypto.subtle) {
      try {
        const Crypto = require('expo-crypto').default;
        const algoMap = { 'SHA-256': Crypto.CryptoDigestAlgorithm?.SHA256 ?? 'SHA-256' };
        globalThis.crypto.subtle = {
          digest: (alg, data) => Crypto.digest(algoMap[alg] || alg, data),
        };
      } catch (_) {
        // expo-crypto not available; flow will fall back to implicit if PKCE needs digest
      }
    }
  } catch (_) {
    // Polyfill failed; will fall back to implicit flow
  }
}

/**
 * Creates a Supabase client instance
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseAnonKey - Supabase anonymous key
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client instance
 */
export function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  const storageAdapter = getStorageAdapter();
  polyfillReactNativeCrypto();

  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  const hasWebCrypto = typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle;

  const authOptions = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isReactNative,
    storageKey: 'supabase.auth.token',
    flowType: hasWebCrypto ? 'pkce' : 'implicit',
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

