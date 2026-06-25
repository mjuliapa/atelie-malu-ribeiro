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
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const studentId = searchParams.get('student_id')
  const supabase = getSupabase()

  let query = supabase
    .from('attendance')
    .select('id, status, notes, recorded_at, appointment_id, appointments(student_id, modality, slot_id, profiles:student_id(full_name), schedule_slots(start_time, end_time))')
    .order('recorded_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let result = (data ?? []).map((a: any) => ({
    id: a.id,
    status: a.status,
    notes: a.notes,
    aluna: a.appointments?.profiles?.full_name ?? 'Aluna',
    student_id: a.appointments?.student_id,
    modality: a.appointments?.modality,
    start_time: a.appointments?.schedule_slots?.start_time,
    end_time: a.appointments?.schedule_slots?.end_time,
  }))

  if (studentId) result = result.filter(r => r.student_id === studentId)
  if (from) result = result.filter(r => r.start_time && r.start_time.split('T')[0] >= from)
  if (to) result = result.filter(r => r.start_time && r.start_time.split('T')[0] <= to)

  return NextResponse.json(result)
}