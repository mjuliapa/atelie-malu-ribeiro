import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: pecas },
    { data: argilas },
    { data: fechamentos },
    { data: pacotes },
    { count: todaySlots },
    { count: activeStudents },
    { data: pecasMes },
    { data: argilasMes },
    { data: pacotesMes },
  ] = await Promise.all([
    supabase.from('pieces').select('calculated_value, status, firing_types(name)'),
    supabase.from('clay_sales').select('total_value, status'),
    supabase.from('monthly_closings').select('total_value, status'),
    supabase.from('package_charges').select('value, status').neq('status', 'cancelled'),
    supabase.from('schedule_slots').select('*', { count: 'exact', head: true })
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .eq('is_blocked', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'student').eq('status', 'active'),
    supabase.from('pieces').select('calculated_value, status, firing_types(name)')
      .gte('piece_date', mesInicio).lte('piece_date', mesFim),
    supabase.from('clay_sales').select('total_value, status')
      .gte('sale_date', mesInicio).lte('sale_date', mesFim),
    supabase.from('package_charges').select('value, status')
      .neq('status', 'cancelled')
      .gte('created_at', `${mesInicio}T00:00:00`)
      .lte('created_at', `${mesFim}T23:59:59`),
  ])

  const NOMES_VENDA_AVULSA = ['Venda livre (sem cálculo)', 'Venda Loja', 'Venda Site', 'Venda Encomenda']
const isVendaLivre = (p: any) => NOMES_VENDA_AVULSA.includes((p.firing_types as any)?.name)
  const queimas = (pecas ?? []).filter(p => !isVendaLivre(p))
  const pecasAvulsas = (pecas ?? []).filter(p => isVendaLivre(p))

  const queimaOpen   = queimas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const queimaClosed = queimas.filter(p => p.status === 'closed').reduce((s, p) => s + p.calculated_value, 0)
  const queimaPaid   = queimas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const pecaOpen   = pecasAvulsas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const pecaClosed = pecasAvulsas.filter(p => p.status === 'closed').reduce((s, p) => s + p.calculated_value, 0)
  const pecaPaid   = pecasAvulsas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const argilaOpen   = (argilas ?? []).filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)
  const argilaClosed = (argilas ?? []).filter(a => a.status === 'closed').reduce((s, a) => s + a.total_value, 0)
  const argilaPaid   = (argilas ?? []).filter(a => a.status === 'paid').reduce((s, a) => s + a.total_value, 0)

  const fechOpen = (fechamentos ?? []).filter(f => f.status === 'awaiting_payment').reduce((s, f) => s + f.total_value, 0)
  const fechPaid = (fechamentos ?? []).filter(f => f.status === 'paid').reduce((s, f) => s + f.total_value, 0)

  // Mês vigente
  const queimaMes = (pecasMes ?? []).filter(p => !isVendaLivre(p))
  const pecasMesAvulsas = (pecasMes ?? []).filter(p => isVendaLivre(p))
  const queimaMesPaid = queimaMes.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)
  const queimaMesOpen = queimaMes.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const pecaMesPaid = pecasMesAvulsas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)
  const pecaMesOpen = pecasMesAvulsas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const argilaMesPaid = (argilasMes ?? []).filter(a => a.status === 'paid').reduce((s, a) => s + a.total_value, 0)
  const argilaMesOpen = (argilasMes ?? []).filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)
  const pacoteMesPaid = (pacotesMes ?? []).filter(p => p.status === 'paid').reduce((s, p) => s + p.value, 0)
  const pacoteMesOpen = (pacotesMes ?? []).filter(p => p.status === 'awaiting_payment').reduce((s, p) => s + p.value, 0)
  const totalMesPago = queimaMesPaid + pecaMesPaid + argilaMesPaid + pacoteMesPaid
  const totalMesAberto = queimaMesOpen + pecaMesOpen + argilaMesOpen + pacoteMesOpen

  const pacoteOpen   = (pacotes ?? []).filter(p => p.status === 'awaiting_payment').reduce((s, p) => s + p.value, 0)
  const pacoteClosed = (pacotes ?? []).filter(p => p.status === 'closed').reduce((s, p) => s + p.value, 0)
  const pacotePaid   = (pacotes ?? []).filter(p => p.status === 'paid').reduce((s, p) => s + p.value, 0)

  return (
    <>
      <AdminNavHeader title="Ateliê Malu Ribeiro" />
      <div className="px-4 pt-4 pb-24 space-y-4">
        <div>
          <h1 className="font-display text-2xl text-brand-text">Olá, Malu 🌸</h1>
          <p className="text-sm text-brand-muted">
            {formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM")}
          </p>
        </div>

        <div className="bg-status-open-bg rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium tracking-widest uppercase text-status-open-text">💸 Total voando (em aberto)</p>
          <p className="font-display text-3xl text-status-open-text">
            {formatCurrency(queimaOpen + argilaOpen + pecaOpen + pacoteOpen + fechOpen)}
          </p>
          <p className="text-[10px] text-status-open-text/70">Soma de tudo ainda não pago, sem contar duplicado</p>
        </div>

        <Link href="/admin/pecas" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Queima</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Em aberto</p>
              <p className="font-display text-sm text-status-open-text">{formatCurrency(queimaOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Aguardando</p>
              <p className="font-display text-sm text-status-closed-text">{formatCurrency(queimaClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Pagas</p>
              <p className="font-display text-sm text-status-paid-text">{formatCurrency(queimaPaid)}</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/argila" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🪨</span>
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Argila</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Em aberto</p>
              <p className="font-display text-sm text-status-open-text">{formatCurrency(argilaOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Aguardando</p>
              <p className="font-display text-sm text-status-closed-text">{formatCurrency(argilaClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Paga</p>
              <p className="font-display text-sm text-status-paid-text">{formatCurrency(argilaPaid)}</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/financeiro/pecas-avulsas/nova" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💎</span>
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Peça</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Em aberto</p>
              <p className="font-display text-sm text-status-open-text">{formatCurrency(pecaOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Aguardando</p>
              <p className="font-display text-sm text-status-closed-text">{formatCurrency(pecaClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Pagas</p>
              <p className="font-display text-sm text-status-paid-text">{formatCurrency(pecaPaid)}</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/fechamentos/pacote" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎓</span>
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Aula (Pacote)</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Aguardando</p>
              <p className="font-display text-sm text-status-open-text">{formatCurrency(pacoteOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">No fechamento</p>
              <p className="font-display text-sm text-status-closed-text">{formatCurrency(pacoteClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Pago</p>
              <p className="font-display text-sm text-status-paid-text">{formatCurrency(pacotePaid)}</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/fechamentos" className="block bg-brand-blush rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <p className="text-xs font-medium tracking-widest uppercase text-brand-mauve">Fechamentos</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-brand-mauve/70 mb-0.5">Aguardando</p>
              <p className="font-display text-sm text-brand-mauve">{formatCurrency(fechOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-mauve/70 mb-0.5">Pago</p>
              <p className="font-display text-sm text-brand-mauve">{formatCurrency(fechPaid)}</p>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/agenda" className="bg-white rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">📅</span>
              <p className="text-xs text-brand-muted">Aulas hoje</p>
            </div>
            <p className="font-display text-3xl text-brand-text">{todaySlots ?? 0}</p>
          </Link>
          <Link href="/admin/alunos" className="bg-white rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">👩‍🎨</span>
              <p className="text-xs text-brand-muted">Alunas ativas</p>
            </div>
            <p className="font-display text-3xl text-brand-text">{activeStudents ?? 0}</p>
          </Link>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/pecas/nova"
              className="flex items-center justify-center gap-2 bg-brand-ink text-brand-cream px-4 py-3 rounded-xl text-sm font-medium">
              🔥 Nova queima
            </Link>
            <Link href="/admin/argila/nova"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🪨 Nova argila
            </Link>
            <Link href="/admin/financeiro/pecas-avulsas/nova"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              💎 Nova peça
            </Link>
            <Link href="/admin/fechamentos/pacote"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🎓 Novo pacote
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}