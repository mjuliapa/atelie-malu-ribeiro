import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const studentId = searchParams.get('student_id')
  const closingId = searchParams.get('closing_id')

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // busca argilas de um fechamento específico via clay_closing_items
  if (closingId) {
    const { data, error } = await supabase
      .from('clay_closing_items')
      .select('id, value_snapshot, clay_sale_id, clay_sales(id, quantity, unit_price, total_value, sale_date, clay_types(name))')
      .eq('closing_id', closingId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const result = (data ?? []).map((item: any) => ({
      id: item.id,
      clay_sale_id: item.clay_sales?.id,
      quantity: item.clay_sales?.quantity,
      unit_price: item.clay_sales?.unit_price,
      total_value: item.value_snapshot,
      sale_date: item.clay_sales?.sale_date,
      clay_types: item.clay_sales?.clay_types,
    }))

    return NextResponse.json(result)
  }

  let query = supabase
    .from('clay_sales')
    .select('id, quantity, unit_price, total_value, status, sale_date, clay_types(name), profiles:student_id(full_name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (studentId) query = query.eq('student_id', studentId)

  const { data } = await query
  return NextResponse.json(data ?? [])
}
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: closingItem } = await supabase
    .from('clay_closing_items')
    .select('id')
    .eq('clay_sale_id', id)
    .maybeSingle()
  if (closingItem) {
    return NextResponse.json({ error: 'Esta argila já está em um fechamento e não pode ser excluída.' }, { status: 400 })
  }
  const { error } = await supabase.from('clay_sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}