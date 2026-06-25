import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: closing } = await supabase.from('monthly_closings').select('*').eq('id', id).single()
  const { data: pecaItems } = await supabase.from('closing_items').select('value_snapshot, piece_id, pieces(name, calculated_value)').eq('closing_id', id)
  const { data: argilaItems } = await supabase.from('clay_closing_items').select('value_snapshot, clay_sale_id, clay_sales(total_value)').eq('closing_id', id)
  const { data: pacoteItems } = await supabase.from('package_charges').select('id, package_type, value, status').eq('closing_id', id)

  return NextResponse.json({ closing, pecaItems, argilaItems, pacoteItems })
}