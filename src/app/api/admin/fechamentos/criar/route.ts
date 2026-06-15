import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { student_id, reference_month, total_value, pecas, argilas } = await request.json()
  const supabase = getSupabase()

  const { data: fechamento, error } = await supabase
    .from('monthly_closings')
    .insert({ student_id, reference_month, total_value, status: 'awaiting_payment' })
    .select()
    .single()

  if (error || !fechamento) return NextResponse.json({ error: error?.message }, { status: 400 })

  if (pecas?.length) {
    await supabase.from('closing_items').insert(
      pecas.map((p: any) => ({ closing_id: fechamento.id, piece_id: p.id, value_snapshot: p.value_snapshot }))
    )
    await supabase.from('pieces').update({ status: 'closed' }).in('id', pecas.map((p: any) => p.id))
  }

  if (argilas?.length) {
    await supabase.from('clay_closing_items').insert(
      argilas.map((a: any) => ({ closing_id: fechamento.id, clay_sale_id: a.id, value_snapshot: a.value_snapshot }))
    )
    await supabase.from('clay_sales').update({ status: 'closed' }).in('id', argilas.map((a: any) => a.id))
  }

  return NextResponse.json({ id: fechamento.id })
}