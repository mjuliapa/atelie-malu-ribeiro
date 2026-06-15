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
  const supabase = getSupabase()

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

  // ✅ FIX Bug 3: verifica se existe appointment cancelado para o mesmo slot+aluna
  // Se sim, faz UPDATE para confirmed em vez de INSERT (evita unique constraint)
  const { data: existing } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('slot_id', body.slot_id)
    .eq('student_id', body.student_id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'confirmed') {
      return NextResponse.json({ error: 'Já agendada' }, { status: 400 })
    }
    // estava cancelado — reativa
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        modality: body.modality ?? 'manual',
        cancelled_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  // não existe — INSERT normal
  const { data, error } = await supabase
    .from('appointments')
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, slot_id, student_id, restore_credit, ...update } = body
  const supabase = getSupabase()

  // cancelamento por slot_id + student_id (fluxo da aluna)
  if (slot_id && student_id) {
    const { data: appt } = await supabase
      .from('appointments')
      .select('id')
      .eq('slot_id', slot_id)
      .eq('student_id', student_id)
      .eq('status', 'confirmed')
      .single()

    if (!appt) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: update.cancelled_at })
      .eq('id', appt.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // devolve crédito
    if (restore_credit) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', student_id)
        .single()
      const current = profile?.credits ?? 0
      await supabase.from('profiles').update({ credits: current + 1 }).eq('id', student_id)
    }

    return NextResponse.json({ ok: true })
  }

  // atualização por id (fluxo admin)
  const { error } = await supabase.from('appointments').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}