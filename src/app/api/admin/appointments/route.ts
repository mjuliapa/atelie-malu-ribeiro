import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // verifica vaga
  const { data: slot } = await supabase
    .from('schedule_slots')
    .select('max_students, torno_spots, appointments(id, status, modality)')
    .eq('id', body.slot_id).single()

  if (!slot) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })

  const confirmed = slot.appointments?.filter((a: any) => a.status === 'confirmed') ?? []
  if (confirmed.length >= slot.max_students)
    return NextResponse.json({ error: 'Aula lotada' }, { status: 400 })

  if (body.modality === 'torno') {
    const tornoCount = confirmed.filter((a: any) => a.modality === 'torno').length
    if (tornoCount >= (slot.torno_spots ?? 1))
      return NextResponse.json({ error: 'Sem vagas no torno' }, { status: 400 })
  }

  // verifica duplicata
  const { data: existing } = await supabase.from('appointments').select('id')
    .eq('slot_id', body.slot_id).eq('student_id', body.student_id).eq('status', 'confirmed').single()
  if (existing) return NextResponse.json({ error: 'Já agendada' }, { status: 400 })

  const { data, error } = await supabase.from('appointments').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...update } = body
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabase.from('appointments').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}