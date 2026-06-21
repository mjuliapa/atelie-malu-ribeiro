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

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', body.student_id)
      .single()
    if (profile) {
      await supabase.from('profiles')
        .update({ credits: (profile.credits ?? 0) - 1 })
        .eq('id', body.student_id)
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', body.student_id)
    .single()
  if (profile) {
    await supabase.from('profiles')
      .update({ credits: (profile.credits ?? 0) - 1 })
      .eq('id', body.student_id)
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, slot_id, student_id, restore_credit, ...update } = body
  const supabase = getSupabase()

  // Cancelamento por slot_id + student_id (fluxo da aluna)
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

  // Atualização por id (fluxo admin) — usado para remover aluna de uma aula
  // Se o status for alterado para 'cancelled', devolve 1 crédito automaticamente
  if (id) {
    const { data: apptAtual } = await supabase
      .from('appointments')
      .select('student_id, status')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('appointments').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    if (update.status === 'cancelled' && apptAtual && apptAtual.status === 'confirmed') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', apptAtual.student_id)
        .single()
      const current = profile?.credits ?? 0
      await supabase.from('profiles').update({ credits: current + 1 }).eq('id', apptAtual.student_id)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'id ou slot_id+student_id obrigatórios' }, { status: 400 })
}