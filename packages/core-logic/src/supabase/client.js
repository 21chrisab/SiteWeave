import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client instance
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} supabaseAnonKey - Supabase anonymous key
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client instance
 */
export function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Using fallback values for demo mode.');
    const fallbackUrl = 'https://demo.supabase.co';
    const fallbackKey = 'demo-key';
    
    return createClient(
      supabaseUrl || fallbackUrl,
      supabaseAnonKey || fallbackKey
    );
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Gets Supabase client with environment variables
 * Works for both web (import.meta.env) and mobile (process.env)
 */
export function getSupabaseClient() {
  // Try different environment variable sources
  let supabaseUrl;
  let supabaseAnonKey;
  
  // Check for Vite/ES module environment
  // In ES modules, import.meta is always available
  // eslint-disable-next-line no-undef
  if (import.meta && import.meta.env) {
    // eslint-disable-next-line no-undef
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    // eslint-disable-next-line no-undef
    supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  
  // Fallback to process.env if not found
  if (typeof process !== 'undefined' && process.env) {
    supabaseUrl = supabaseUrl || 
      process.env.VITE_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;
      
    supabaseAnonKey = supabaseAnonKey || 
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

