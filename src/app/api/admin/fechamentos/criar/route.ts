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
  const { student_id, reference_month, total_value, pecas, argilas, pacotes, created_by } = await request.json()
  const supabase = getSupabase()

  const createdBy = created_by ?? student_id
  if (!createdBy) {
    return NextResponse.json({ error: 'created_by e student_id ausentes' }, { status: 400 })
  }

  const { data: fechamento, error: fechError } = await supabase
    .from('monthly_closings')
    .insert({ student_id, reference_month, total_value, status: 'awaiting_payment', created_by: createdBy })
    .select()
    .single()

  if (fechError || !fechamento) {
    return NextResponse.json({ error: 'monthly_closings: ' + fechError?.message }, { status: 400 })
  }

  const errors: string[] = []

  if (pecas?.length) {
    const { error: e1 } = await supabase.from('closing_items').insert(
      pecas.map((p: any) => ({ closing_id: fechamento.id, piece_id: p.id, value_snapshot: p.value_snapshot }))
    )
    if (e1) errors.push('closing_items: ' + e1.message)

    const { error: e2 } = await supabase.from('pieces').update({ status: 'closed' }).in('id', pecas.map((p: any) => p.id))
    if (e2) errors.push('pieces update: ' + e2.message)
  }

  if (argilas?.length) {
    const { error: e3 } = await supabase.from('clay_closing_items').insert(
      argilas.map((a: any) => ({ closing_id: fechamento.id, clay_sale_id: a.id, value_snapshot: a.value_snapshot }))
    )
    if (e3) errors.push('clay_closing_items: ' + e3.message)

    const { error: e4 } = await supabase.from('clay_sales').update({ status: 'closed' }).in('id', argilas.map((a: any) => a.id))
    if (e4) errors.push('clay_sales update: ' + e4.message)
  }

  if (pacotes?.length) {
    const { error: e5 } = await supabase
      .from('package_charges')
      .update({ status: 'closed', closing_id: fechamento.id })
      .in('id', pacotes.map((p: any) => p.id))
    if (e5) errors.push('package_charges update: ' + e5.message)
  }

  if (errors.length > 0) {
    return NextResponse.json({ id: fechamento.id, warnings: errors })
  }

  return NextResponse.json({ id: fechamento.id })
}