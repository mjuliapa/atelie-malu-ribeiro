import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const ADMIN_ID = 'afc3ca0e-6ee7-48b8-9eec-2d7abb509554'
const INTERNO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

const VENDAS_AVULSAS = ['Venda livre (sem cálculo)', 'Venda Loja', 'Venda Site', 'Venda Encomenda', 'Venda Workshop Interno', 'Venda Workshop Externo']
function isVendaAvulsa(nome: string | undefined) {
  const n = (nome ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return VENDAS_AVULSAS.some(v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === n)
}

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

  if (!from || !to) {
    return NextResponse.json({ error: 'from e to são obrigatórios' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Peças no período
  let pecasQuery = supabase
    .from('pieces')
    .select('id, name, calculated_value, status, piece_date, student_id, profiles:student_id(full_name), firing_types(name)')
    .gte('piece_date', from)
    .lte('piece_date', to)
    .neq('student_id', INTERNO_ID)
  if (studentId) pecasQuery = pecasQuery.eq('student_id', studentId)
  const { data: pecasRaw } = await pecasQuery
  // Vendas Loja/Site/Encomenda são gravadas com student_id = admin; só essas entram
  const pecas = (pecasRaw ?? []).filter(p =>
    p.student_id !== ADMIN_ID || isVendaAvulsa((p.firing_types as { name?: string } | null)?.name))

  // Argila no período
  let argilaQuery = supabase
    .from('clay_sales')
    .select('id, quantity, total_value, status, sale_date, student_id, profiles:student_id(full_name), clay_types(name)')
    .gte('sale_date', from)
    .lte('sale_date', to)
    .neq('student_id', ADMIN_ID)
    .neq('student_id', INTERNO_ID)
  if (studentId) argilaQuery = argilaQuery.eq('student_id', studentId)
  const { data: argilas } = await argilaQuery

  // Pacotes no período (excluindo custos e internos)
  let pacotesQuery = supabase
    .from('package_charges')
    .select('id, package_type, credits, value, status, created_at, student_id, profiles:student_id(full_name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .neq('status', 'cancelled')
    .not('package_type', 'like', 'custo:%')
    .neq('student_id', ADMIN_ID)
    .neq('student_id', INTERNO_ID)
  if (studentId) pacotesQuery = pacotesQuery.eq('student_id', studentId)
  const { data: pacotes } = await pacotesQuery

  // Custos do período
  const { data: custosNoPeriodo } = await supabase
    .from('package_charges')
    .select('id, value, created_at, package_type')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .like('package_type', 'custo:%')

  // Custos fixos recorrentes criados antes do período
  const { data: custosRecorrentes } = await supabase
    .from('package_charges')
    .select('id, value, created_at, package_type')
    .lt('created_at', `${from}T00:00:00`)
    .like('package_type', 'custo:%')

  const custosRecorrentesAtivos = (custosRecorrentes ?? []).filter(c => {
    try {
      const meta = JSON.parse(c.package_type.replace('custo:', ''))
      return meta.recorrente === true
    } catch { return false }
  })

  const custosRows = [...(custosNoPeriodo ?? []), ...custosRecorrentesAtivos]
  const totalCustos = custosRows.reduce((s, c) => s + c.value, 0)

  // Fechamentos criados no período
  let fechamentosQuery = supabase
    .from('monthly_closings')
    .select('id, reference_month, total_value, status, created_at, paid_at, student_id, profiles:student_id(full_name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .neq('student_id', ADMIN_ID)
    .neq('student_id', INTERNO_ID)
  if (studentId) fechamentosQuery = fechamentosQuery.eq('student_id', studentId)
  const { data: fechamentos } = await fechamentosQuery

  // Fechamentos pagos no período (por paid_at) — fluxo de caixa real
  let fechamentosPagosQuery = supabase
    .from('monthly_closings')
    .select('id, total_value, paid_at, student_id')
    .gte('paid_at', `${from}T00:00:00`)
    .lte('paid_at', `${to}T23:59:59`)
    .eq('status', 'paid')
    .neq('student_id', ADMIN_ID)
    .neq('student_id', INTERNO_ID)
  if (studentId) fechamentosPagosQuery = fechamentosPagosQuery.eq('student_id', studentId)
  const { data: fechamentosPagos } = await fechamentosPagosQuery

  // Vendas a clientes (Loja/Site/Encomenda) pagas não passam por fechamento
  const vendasClientePagas = pecas
    .filter(p => p.student_id === ADMIN_ID && p.status === 'paid')
    .reduce((s, p) => s + p.calculated_value, 0)
  const recebido = (fechamentosPagos ?? []).reduce((s, f) => s + f.total_value, 0) + vendasClientePagas

  // Agregação por aluna
  const porAluna: Record<string, {
    student_id: string
    nome: string
    totalPecas: number
    totalArgila: number
    totalPacotes: number
    totalGeral: number
    totalPago: number
    totalAberto: number
    totalAguardando: number
    totalFechamento: number
  }> = {}

  function ensureAluna(student_id: string, nome: string) {
    if (!porAluna[student_id]) {
      porAluna[student_id] = {
        student_id, nome,
        totalPecas: 0, totalArgila: 0, totalPacotes: 0,
        totalGeral: 0, totalPago: 0, totalAberto: 0,
        totalAguardando: 0, totalFechamento: 0,
      }
    }
    return porAluna[student_id]
  }

  const NOMES_VENDA_AVULSA: Record<string, string> = {
    'Venda livre (sem cálculo)': 'Aluna',
    'Venda Loja': 'Loja',
    'Venda Site': 'Site',
    'Venda Encomenda': 'Encomenda',
    'Venda Workshop Interno': 'Workshop interno',
    'Venda Workshop Externo': 'Workshop externo',
  }
  function semAcento(s: string) {
    return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }
  const porCanal: Record<string, { aguardando: number; fechamento: number; pago: number; total: number }> = {
    Queima: { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    Aluna: { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    Loja: { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    Site: { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    Encomenda: { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    'Workshop interno': { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
    'Workshop externo': { aguardando: 0, fechamento: 0, pago: 0, total: 0 },
  }

  for (const p of pecas) {
    const nome = p.student_id === ADMIN_ID
      ? 'Clientes (Loja/Site/Encomenda/Workshop)'
      : (p.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(p.student_id, nome)
    a.totalPecas += p.calculated_value
    a.totalGeral += p.calculated_value
    if (p.status === 'paid') a.totalPago += p.calculated_value
    else if (p.status === 'closed') a.totalFechamento += p.calculated_value
    else { a.totalAberto += p.calculated_value; a.totalAguardando += p.calculated_value }

    const firingName = (p as any).firing_types?.name ?? ''
    const canalEntry = Object.entries(NOMES_VENDA_AVULSA).find(([n]) => semAcento(n) === semAcento(firingName))
    const canal = canalEntry ? canalEntry[1] : 'Queima'
    porCanal[canal].total += p.calculated_value
    if (p.status === 'paid') porCanal[canal].pago += p.calculated_value
    else if (p.status === 'closed') porCanal[canal].fechamento += p.calculated_value
    else porCanal[canal].aguardando += p.calculated_value
  }

  for (const c of argilas ?? []) {
    const nome = (c.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(c.student_id, nome)
    a.totalArgila += c.total_value
    a.totalGeral += c.total_value
    if (c.status === 'paid') a.totalPago += c.total_value
    else if (c.status === 'closed') a.totalFechamento += c.total_value
    else { a.totalAberto += c.total_value; a.totalAguardando += c.total_value }
  }

  for (const pk of pacotes ?? []) {
    const nome = (pk.profiles as any)?.full_name ?? 'Sem nome'
    const a = ensureAluna(pk.student_id, nome)
    a.totalPacotes += pk.value
    a.totalGeral += pk.value
    if (pk.status === 'paid') a.totalPago += pk.value
    else if (pk.status === 'closed') a.totalFechamento += pk.value
    else { a.totalAberto += pk.value; a.totalAguardando += pk.value }
  }

  // Fechamentos awaiting_payment entram no aguardando
  for (const f of fechamentos ?? []) {
    if (f.status === 'awaiting_payment') {
      const nome = (f.profiles as any)?.full_name ?? 'Sem nome'
      const a = ensureAluna(f.student_id, nome)
      a.totalAguardando += f.total_value
      a.totalAberto += f.total_value
    }
  }

  const resumoPorAluna = Object.values(porAluna)
    .sort((x, y) => y.totalGeral - x.totalGeral)

  const totalGeral = {
    pecas: pecas.reduce((s, p) => s + p.calculated_value, 0),
    argila: (argilas ?? []).reduce((s, c) => s + c.total_value, 0),
    pacotes: (pacotes ?? []).reduce((s, p) => s + p.value, 0),
    custos: totalCustos,
    recebido,
    pago: resumoPorAluna.reduce((s, a) => s + a.totalPago, 0),
    aberto: resumoPorAluna.reduce((s, a) => s + a.totalAberto, 0),
    fechamento: resumoPorAluna.reduce((s, a) => s + a.totalFechamento, 0),
    aguardando: resumoPorAluna.reduce((s, a) => s + a.totalAguardando, 0),
    get total() { return this.pecas + this.argila + this.pacotes },
    get fluxoCaixa() { return this.recebido - this.custos },
  }

  return NextResponse.json({
    periodo: { from, to },
    pecas,
    argilas: argilas ?? [],
    pacotes: pacotes ?? [],
    fechamentos: fechamentos ?? [],
    fechamentosPagos: fechamentosPagos ?? [],
    resumoPorAluna,
    porCanal,
    totalGeral,
  })
}