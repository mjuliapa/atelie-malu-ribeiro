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
    const [{ data: fechamento, error: fErr }, { data: items }] = await Promise.all([
      supabase.from('monthly_closings').select('*').eq('id', id).single(),
      supabase.from('closing_items').select('*, pieces(name, piece_date)').eq('closing_id', id).order('id'),
    ])

    if (fErr || !fechamento) {
      return NextResponse.json({ error: fErr?.message ?? 'not found' }, { status: 404 })
    }

    // busca profile separado
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, package_type')
      .eq('id', fechamento.student_id)
      .single()

    return NextResponse.json({
      fechamento: { ...fechamento, profiles: profile ?? { full_name: null, phone: null } },
      items: items ?? [],
    })
  }

  const { data, error } = await supabase
    .from('monthly_closings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // busca profiles para lista
  const studentIds = [...new Set((data ?? []).map((f: any) => f.student_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', studentIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
  const result = (data ?? []).map((f: any) => ({
    ...f,
    profiles: profileMap[f.student_id] ?? { full_name: null, phone: null },
  }))

  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, piece_ids, argila_ids, ...update } = body
  const supabase = getSupabase()

  const { error } = await supabase.from('monthly_closings').update(update).eq('id', id)
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