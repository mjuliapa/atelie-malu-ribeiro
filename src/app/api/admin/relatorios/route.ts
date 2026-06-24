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
  const from = searchParams.get('from') // yyyy-MM-dd
  const to = searchParams.get('to')     // yyyy-MM-dd
  const studentId = searchParams.get('student_id') // opcional — relatório por aluna

  if (!from || !to) {
    return NextResponse.json({ error: 'from e to são obrigatórios' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Busca peças no período
  let pecasQuery = supabase
    .from('pieces')
    .select('id, name, calculated_value, status, piece_date, student_id, profiles:student_id(full_name)')
    .gte('piece_date', from)
    .lte('piece_date', to)
  if (studentId) pecasQuery = pecasQuery.eq('student_id', studentId)
  const { data: pecas } = await pecasQuery

  // Busca argila no período
  let argilaQuery = supabase
    .from('clay_sales')
    .select('id, quantity, total_value, status, sale_date, student_id, profiles:student_id(full_name), clay_types(name)')
    .gte('sale_date', from)
    .lte('sale_date', to)
  if (studentId) argilaQuery = argilaQuery.eq('student_id', studentId)
  const { data: argilas } = await argilaQuery

  // Busca pacotes no período
  let pacotesQuery = supabase
    .from('package_charges')
    .select('id, package_type, credits, value, status, created_at, student_id, profiles:student_id(full_name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .neq('status', 'cancelled')
  if (studentId) pacotesQuery = pacotesQuery.eq('student_id', studentId)
  const { data: pacotes } = await pacotesQuery

  // Custos (gravados na mesma tabela package_charges, status 'cancelled', prefixo custo:)
  let custosQuery = supabase
    .from('package_charges')
    .select('id, value, created_at, package_type')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .like('package_type', 'custo:%')
  const { data: custosRows } = await custosQuery
  const totalCustos = (custosRows ?? []).reduce((s, c) => s + c.value, 0)

  // Busca fechamentos no período
  let fechamentosQuery = supabase
    .from('monthly_closings')
    .select('id, reference_month, total_value, status, created_at, paid_at, student_id, profiles:student_id(full_name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
  if (studentId) fechamentosQuery = fechamentosQuery.eq('student_id', studentId)
  const { data: fechamentos } = await fechamentosQuery

  // ── Agregação por aluna (para relatório geral) ──────────────────────
  const porAluna: Record<string, {
    student_id: string
    nome: string
    totalPecas: number
    totalArgila: number
    totalPacotes: number
    totalGeral: number
    totalPago: number
    totalAberto: number
  }> = {}

  function ensureAluna(student_id: string, nome: string) {
    if (!porAluna[student_id]) {
      porAluna[student_id] = {
        student_id, nome,
        totalPecas: 0, totalArgila: 0, totalPacotes: 0,
        totalGeral: 0, totalPago: 0, totalAberto: 0,
      }
    }
    return porAluna[student_id]
  }

  for (const p of pecas ?? []) {
    const nome = (p.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(p.student_id, nome)
    a.totalPecas += p.calculated_value
    a.totalGeral += p.calculated_value
    if (p.status === 'paid') a.totalPago += p.calculated_value
    else a.totalAberto += p.calculated_value
  }

  for (const c of argilas ?? []) {
    const nome = (c.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(c.student_id, nome)
    a.totalArgila += c.total_value
    a.totalGeral += c.total_value
    if (c.status === 'paid') a.totalPago += c.total_value
    else a.totalAberto += c.total_value
  }

  for (const pk of pacotes ?? []) {
    const nome = (pk.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(pk.student_id, nome)
    a.totalPacotes += pk.value
    a.totalGeral += pk.value
    if (pk.status === 'paid') a.totalPago += pk.value
    else a.totalAberto += pk.value
  }

  const resumoPorAluna = Object.values(porAluna).sort((x, y) => y.totalGeral - x.totalGeral)

  const totalGeral = {
    pecas: (pecas ?? []).reduce((s, p) => s + p.calculated_value, 0),
    argila: (argilas ?? []).reduce((s, c) => s + c.total_value, 0),
    pacotes: (pacotes ?? []).reduce((s, p) => s + p.value, 0),
    custos: totalCustos,
    pago: resumoPorAluna.reduce((s, a) => s + a.totalPago, 0),
    aberto: resumoPorAluna.reduce((s, a) => s + a.totalAberto, 0),
  }
  const totalGeralCompleto = {
    ...totalGeral,
    total: totalGeral.pecas + totalGeral.argila + totalGeral.pacotes - totalGeral.custos,
  }

  return NextResponse.json({
    periodo: { from, to },
    pecas: pecas ?? [],
    argilas: argilas ?? [],
    pacotes: pacotes ?? [],
    fechamentos: fechamentos ?? [],
    resumoPorAluna,
    totalGeral: totalGeralCompleto,
  })
}