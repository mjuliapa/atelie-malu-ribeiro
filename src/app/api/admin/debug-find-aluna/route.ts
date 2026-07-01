import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nome = searchParams.get('nome') ?? ''
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, credits, role, status')
    .ilike('full_name', `%${nome}%`)

  if (!profiles?.length) return NextResponse.json({ profiles: [], pacotes: [] })

  const ids = profiles.map(p => p.id)
  const { data: pacotes } = await supabase
    .from('package_charges')
    .select('id, value, status, created_at, closing_id, student_id')
    .in('student_id', ids)
    .neq('status', 'cancelled')

  const { data: fechamentos } = await supabase
    .from('monthly_closings')
    .select('id, total_value, status, reference_month, created_at, student_id')
    .in('student_id', ids)

  return NextResponse.json({ profiles, pacotes, fechamentos })
}