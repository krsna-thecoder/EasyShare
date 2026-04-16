import { createClient } from '@supabase/supabase-js'

// Replace these with your Supabase project credentials
// You can find these in your Supabase project settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create client only if we have valid credentials
let supabase = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
    console.warn('Supabase not configured. Please check your .env file.')
    console.warn('VITE_SUPABASE_URL should be like: https://your-project-id.supabase.co')
}

export { supabase }
