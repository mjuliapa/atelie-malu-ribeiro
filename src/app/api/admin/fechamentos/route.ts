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
  const id = searchParams.get('id')
  const supabase = getSupabase()

  if (id) {
    const [{ data: fechamento, error: fErr }, { data: items }] = await Promise.all([
      supabase.from('monthly_closings').select('*').eq('id', id).single(),
      supabase.from('closing_items').select('*, pieces(name, piece_date)').eq('closing_id', id).order('id'),
    ])

    if (fErr || !fechamento) {
      return NextResponse.json({ error: fErr?.message ?? 'not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, package_type')
      .eq('id', fechamento.student_id)
      .single()

    return NextResponse.json({
      fechamento: { ...fechamento, profiles: profile ?? { full_name: null, phone: null } },
      items: items ?? [],
    })
  }

  const studentId = searchParams.get('student_id')
  let listQuery = supabase
    .from('monthly_closings')
    .select('*')
    .order('created_at', { ascending: false })
  if (studentId) listQuery = listQuery.eq('student_id', studentId)
  const { data, error } = await listQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const studentIds = [...new Set((data ?? []).map((f: any) => f.student_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', studentIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
  const result = (data ?? []).map((f: any) => ({
    ...f,
    profiles: profileMap[f.student_id] ?? { full_name: null, phone: null },
  }))

  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, piece_ids, argila_ids, package_charge_ids, ...update } = body
  const supabase = getSupabase()

  const { data: current } = await supabase
    .from('monthly_closings')
    .select('status')
    .eq('id', id)
    .single()

  const alreadyPaid = current?.status === 'paid'

  const { error } = await supabase.from('monthly_closings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (update.status === 'paid' && !alreadyPaid) {
    if (piece_ids?.length) {
      await supabase.from('pieces').update({ status: 'paid' }).in('id', piece_ids)
    }

    if (argila_ids?.length) {
      await supabase.from('clay_sales').update({ status: 'paid' }).in('id', argila_ids)
    }

    if (package_charge_ids?.length) {
      const { data: pacotesAtuais } = await supabase
        .from('package_charges')
        .select('id, student_id, credits, status')
        .in('id', package_charge_ids)

      const pacotesParaPagar = (pacotesAtuais ?? []).filter(p => p.status !== 'paid')

      if (pacotesParaPagar.length) {
        await supabase
          .from('package_charges')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .in('id', pacotesParaPagar.map(p => p.id))

        const creditosPorAluna: Record<string, number> = {}
        for (const p of pacotesParaPagar) {
          creditosPorAluna[p.student_id] = (creditosPorAluna[p.student_id] ?? 0) + p.credits
        }

        // Soma os créditos do pacote ao saldo ATUAL — se o saldo estiver negativo
        // (dívida de aulas usadas sem crédito), a soma abate a dívida primeiro
        // automaticamente, pois é uma soma simples: -2 + 4 = +2
        for (const [student_id, creditsToAdd] of Object.entries(creditosPorAluna)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', student_id)
            .single()

          if (profile) {
            await supabase
              .from('profiles')
              .update({ credits: (profile.credits ?? 0) + creditsToAdd })
              .eq('id', student_id)
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}