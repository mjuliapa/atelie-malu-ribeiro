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
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, student_id, modality, profiles:student_id(full_name), attendance(id, status, notes)')
    .eq('slot_id', slotId!)
    .eq('status', 'confirmed')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data ?? [])
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