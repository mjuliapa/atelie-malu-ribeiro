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
  const body = await request.json()
  const { student_id, reference_month, total_value, pecas, argilas, pacotes, created_by } = body

  console.log('CRIAR FECHAMENTO body:', JSON.stringify({ student_id, pacotes, argilas, created_by }))

  const supabase = getSupabase()

  if (!created_by) {
    return NextResponse.json({ error: 'created_by é obrigatório' }, { status: 400 })
  }

  const { data: fechamento, error } = await supabase
    .from('monthly_closings')
    .insert({ student_id, reference_month, total_value, status: 'awaiting_payment', created_by })
    .select()
    .single()

  if (error || !fechamento) {
    console.log('ERRO ao criar fechamento:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 400 })
  }

  console.log('Fechamento criado:', fechamento.id)

  if (pecas?.length) {
    await supabase.from('closing_items').insert(
      pecas.map((p: any) => ({ closing_id: fechamento.id, piece_id: p.id, value_snapshot: p.value_snapshot }))
    )
    await supabase.from('pieces').update({ status: 'closed' }).in('id', pecas.map((p: any) => p.id))
  }

  if (argilas?.length) {
    console.log('Inserindo argilas:', argilas.map((a: any) => a.id))
    const { error: clayItemsError } = await supabase.from('clay_closing_items').insert(
      argilas.map((a: any) => ({ closing_id: fechamento.id, clay_sale_id: a.id, value_snapshot: a.value_snapshot }))
    )
    console.log('clay_closing_items error:', clayItemsError?.message)
    const { error: claySalesError } = await supabase.from('clay_sales').update({ status: 'closed' }).in('id', argilas.map((a: any) => a.id))
    console.log('clay_sales update error:', claySalesError?.message)
  }

  if (pacotes?.length) {
    console.log('Atualizando pacotes:', pacotes.map((p: any) => p.id))
    const { error: pacotesError } = await supabase
      .from('package_charges')
      .update({ status: 'closed', closing_id: fechamento.id })
      .in('id', pacotes.map((p: any) => p.id))
    console.log('package_charges update error:', pacotesError?.message)
  }

  return NextResponse.json({ id: fechamento.id })
}