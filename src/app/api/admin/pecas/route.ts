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
  const status = searchParams.get('status')
  const studentId = searchParams.get('student_id')

  const supabase = getSupabase()

  if (id) {
    const { data, error } = await supabase
      .from('pieces')
      .select('id, name, height, width, length, firing_type_id, calculated_value, status, piece_date, notes, student_id, firing_types(name, coefficient), profiles:student_id(full_name)')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  }

  let query = supabase
    .from('pieces')
    .select('id, name, calculated_value, status, piece_date, firing_types(name), profiles:student_id(full_name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (studentId) query = query.eq('student_id', studentId)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const body = await request.json()
  const supabase = getSupabase()

  const { error } = await supabase.from('pieces').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = getSupabase()

  // Verifica se a peça está em algum fechamento — se sim, não permite deletar direto
  const { data: closingItem } = await supabase
    .from('closing_items')
    .select('id')
    .eq('piece_id', id)
    .maybeSingle()

  if (closingItem) {
    return NextResponse.json({ error: 'Esta peça já está em um fechamento e não pode ser excluída.' }, { status: 400 })
  }

  const { error } = await supabase.from('pieces').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}