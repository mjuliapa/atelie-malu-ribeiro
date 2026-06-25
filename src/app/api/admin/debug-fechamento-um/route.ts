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

  const closing = await supabase.from('monthly_closings').select('*').eq('id', id).maybeSingle()
  const pecaItems = await supabase.from('closing_items').select('value_snapshot, piece_id, pieces(name, calculated_value)').eq('closing_id', id)
  const argilaItems = await supabase.from('clay_closing_items').select('value_snapshot, clay_sale_id, clay_sales(total_value)').eq('closing_id', id)
  const pacoteItems = await supabase.from('package_charges').select('id, package_type, value, status').eq('closing_id', id)

  return NextResponse.json({
    closing: closing.data, closingError: closing.error?.message,
    pecaItems: pecaItems.data, pecaItemsError: pecaItems.error?.message,
    argilaItems: argilaItems.data, argilaItemsError: argilaItems.error?.message,
    pacoteItems: pacoteItems.data, pacoteItemsError: pacoteItems.error?.message,
  })
}