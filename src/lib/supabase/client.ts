'use client'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAccessToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  try {
    const raw = document.cookie.split(';').find(c => c.includes('auth-token'))
    if (!raw) return undefined
    const val = raw.split('=').slice(1).join('=')
    const decoded = JSON.parse(atob(val.replace('base64-', '')))
    return decoded.access_token
  } catch {
    return undefined
  }
}

export function createClient() {
  const token = getAccessToken()
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  )
}