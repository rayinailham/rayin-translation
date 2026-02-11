
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Custom storage adapter to prevent crashes if localStorage is corrupted or disabled
const safeStorage = {
  getItem: (key) => {
    try {
      const stored = localStorage.getItem(key)
      // Check for common corruption strings that might crash parsers
      if (!stored || stored === 'undefined' || stored === 'null') return null
      return stored
    } catch (e) {
      console.warn('[Supabase] LocalStorage access failed, ignoring saved session:', e)
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('[Supabase] LocalStorage write failed:', e)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('[Supabase] LocalStorage remove failed:', e)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: safeStorage
  }
})

console.log(`[Supabase] Initialized with URL: ${supabaseUrl}`)
