import { createClient } from '@supabase/supabase-js'

// Validation des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Variables d'environnement Supabase manquantes!
    VITE_SUPABASE_URL: ${supabaseUrl}
    VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey}
  `)
}

// Configuration avec options avancées
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

