import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const ids = [
    'b233b748-dd4c-49e3-99fe-880a90d6e235',
    'f0503461-6f90-4d7d-8d74-74167f87f85f',
    '593f93ce-0bd7-4e16-9e8e-1e398f915548',
  ]
  const { error } = await supabase
    .from('package_charges')
    .update({ status: 'paid' })
    .in('id', ids)
  return NextResponse.json({ ok: !error, error: error?.message })
}