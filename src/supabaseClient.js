import { createSupabaseClient } from '@siteweave/core-logic'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  throw new Error('Missing Supabase environment variables. Please create apps/web/.env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createSupabaseClient(url, anon)


