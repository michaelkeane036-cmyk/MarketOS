import { createClient } from '@supabase/supabase-js'

const supabaseUrl = cleanSupabaseEnvValue(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = cleanSupabaseEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function cleanSupabaseEnvValue(value: unknown) {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[^\x20-\x7e]/g, '')
}
