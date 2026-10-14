import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20))

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const INTERNO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  const { data: studentsRaw, error: e1 } = await supabase.from('profiles').select('id, full_name, credits, package_type').eq('role', 'student').eq('status', 'active').order('full_name')

  const listaBase = (studentsRaw ?? []).some(s => s.id === INTERNO_ID)
    ? (studentsRaw ?? [])
    : [...(studentsRaw ?? []), { id: INTERNO_ID, full_name: 'Uso Interno (Ateliê)', credits: 0, package_type: null }]

  const studentIds = listaBase.map(s => s.id)
  const emailMap: Record<string, string> = {}
  for (const sid of studentIds) {
    if (sid === INTERNO_ID) continue
    const { data: userData } = await supabase.auth.admin.getUserById(sid)
    if (userData?.user?.email) emailMap[sid] = userData.user.email
  }
  const students = listaBase.map(s => ({ ...s, email: emailMap[s.id] ?? null }))
  const { data: firingTypes, error: e2 } = await supabase.from('firing_types').select('id, name, coefficient').eq('is_active', true).order('name')
  const { data: clayTypes, error: e3 } = await supabase.from('clay_types').select('id, name, price').eq('is_active', true).order('price').order('name')

  console.log('E1:', e1?.message)
  console.log('E2:', e2?.message)
  console.log('E3:', e3?.message)
  console.log('students:', students?.length, 'firing:', firingTypes?.length, 'clay:', clayTypes?.length)

  return NextResponse.json({ students: students ?? [], firingTypes: firingTypes ?? [], clayTypes: clayTypes ?? [] })
}