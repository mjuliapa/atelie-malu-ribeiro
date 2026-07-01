import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await supabase
    .from('pieces')
    .select('id, name, student_id, calculated_value, status, firing_types(name)')
    .in('firing_types.name', ['Venda Encomenda', 'Venda Loja', 'Venda Site', 'Venda livre (sem cálculo)'])
    .limit(10)
  return NextResponse.json({ data })
}