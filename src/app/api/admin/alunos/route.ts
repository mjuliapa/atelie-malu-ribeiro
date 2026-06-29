import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const supabase = getSupabase()

  const [pieces, argila, pacotes, fechamentos, presencas, appointments] = await Promise.all([
    supabase.from('pieces').select('id', { count: 'exact', head: true }).eq('student_id', id),
    supabase.from('clay_sales').select('id', { count: 'exact', head: true }).eq('student_id', id),
    supabase.from('package_charges').select('id', { count: 'exact', head: true }).eq('student_id', id),
    supabase.from('monthly_closings').select('id', { count: 'exact', head: true }).eq('student_id', id),
    supabase.from('attendance').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('student_id', id),
  ])

  const totalRegistros =
    (pieces.count ?? 0) + (argila.count ?? 0) + (pacotes.count ?? 0) +
    (fechamentos.count ?? 0) + (appointments.count ?? 0)

  if (totalRegistros > 0) {
    return NextResponse.json({
      error: `Esta aluna tem histórico (${totalRegistros} registro(s) entre peças, argila, pacotes, fechamentos ou aulas) e não pode ser excluída. Use "Ex-aluna" para desativar.`,
    }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}