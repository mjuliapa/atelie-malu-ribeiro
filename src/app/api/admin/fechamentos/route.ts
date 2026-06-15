import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const supabase = getSupabase()

  if (id) {
    const [{ data: fechamento }, { data: items }] = await Promise.all([
      supabase
        .from('monthly_closings')
        .select('*, profiles:student_id(full_name, phone)')
        .eq('id', id)
        .single(),
      supabase
        .from('closing_items')
        .select('*, pieces(name, piece_date)')
        .eq('closing_id', id)
        .order('id'),
    ])

    if (!fechamento) return NextResponse.json(null, { status: 404 })
    return NextResponse.json({ fechamento, items: items ?? [] })
  }

  // lista todos (para /admin/fechamentos se precisar no futuro)
  const { data, error } = await supabase
    .from('monthly_closings')
    .select('*, profiles:student_id(full_name, phone)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, piece_ids, argila_ids, ...update } = body
  const supabase = getSupabase()

  const { error } = await supabase
    .from('monthly_closings')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (update.status === 'paid') {
    if (piece_ids?.length) {
      await supabase.from('pieces').update({ status: 'paid' }).in('id', piece_ids)
    }
    if (argila_ids?.length) {
      await supabase.from('clay_sales').update({ status: 'paid' }).in('id', argila_ids)
    }
  }

  return NextResponse.json({ ok: true })
}