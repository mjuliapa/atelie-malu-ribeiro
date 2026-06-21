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
  const slotId = searchParams.get('slot_id')
  const studentId = searchParams.get('student_id')
  const supabase = getSupabase()

  // Busca por slot (fluxo admin — registrar presença de uma aula)
  if (slotId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status, student_id, modality, profiles:student_id(full_name), attendance(id, status, notes)')
      .eq('slot_id', slotId)
      .eq('status', 'confirmed')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data ?? [])
  }

  // Busca por aluna (fluxo aluna — histórico de presença no perfil)
  if (studentId) {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, slot_id, schedule_slots(start_time)')
      .eq('student_id', studentId)

    const appointmentIds = (appointments ?? []).map(a => a.id)
    if (!appointmentIds.length) return NextResponse.json([])

    const { data: attendanceData, error } = await supabase
      .from('attendance')
      .select('id, status, notes, recorded_at, appointment_id')
      .in('appointment_id', appointmentIds)
      .order('recorded_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const apptMap = Object.fromEntries((appointments ?? []).map(a => [a.id, a]))
    const result = (attendanceData ?? []).map(att => ({
      ...att,
      appointments: apptMap[att.appointment_id] ?? null,
    }))

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'slot_id ou student_id obrigatório' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { records, recorded_by } = body
  const supabase = getSupabase()

  for (const record of records) {
    await supabase.from('appointments')
      .update({ modality: record.modality })
      .eq('id', record.appointmentId)

    const payload = {
      appointment_id: record.appointmentId,
      status: record.status,
      notes: record.notes?.trim() || null,
      recorded_by,
      recorded_at: new Date().toISOString(),
    }

    if (record.existingAttendanceId) {
      await supabase.from('attendance').update(payload).eq('id', record.existingAttendanceId)
    } else {
      await supabase.from('attendance').insert(payload)
    }
  }

  return NextResponse.json({ ok: true })
}