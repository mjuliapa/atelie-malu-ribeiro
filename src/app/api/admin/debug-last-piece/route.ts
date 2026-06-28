import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await supabase
    .from('pieces')
    .select('id, name, calculated_value, status, piece_date, created_at, firing_types(name)')
    .order('created_at', { ascending: false })
    .limit(5)
  return NextResponse.json({ data, error: error?.message })
}