import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const studentId = searchParams.get('student_id')

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let query = supabase
    .from('pieces')
    .select('id, name, calculated_value, status, piece_date, firing_types(name), profiles:student_id(full_name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (studentId) query = query.eq('student_id', studentId)

  const { data } = await query
  return NextResponse.json(data ?? [])
}