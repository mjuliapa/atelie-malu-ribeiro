import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const tables = ['system_settings', 'pieces', 'clay_sales', 'package_charges', 'profiles', 'firing_types']
  const results: Record<string, any> = {}

  for (const t of tables) {
    const { error, count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    results[t] = error ? { ok: false, error: error.message, code: (error as any).code } : { ok: true, count }
  }

  const { data: sample } = await supabase.from('package_charges').select('*').limit(1)
  results['package_charges_sample'] = sample

  return NextResponse.json(results)
}