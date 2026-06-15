import { createClient } from '@/lib/supabase/server'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: pecas },
    { data: argilas },
    { data: fechamentos },
    { count: todaySlots },
    { count: activeStudents },
  ] = await Promise.all([
    supabase.from('pieces').select('calculated_value, status'),
    supabase.from('clay_sales').select('total_value, status'),
    supabase.from('monthly_closings').select('total_value, status'),
    supabase.from('schedule_slots').select('*', { count: 'exact', head: true })
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .eq('is_blocked', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'student').eq('status', 'active'),
  ])

  const pecaOpen = (pecas ?? []).filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const pecaClosed = (pecas ?? []).filter(p => p.status === 'closed').reduce((s, p) => s + p.calculated_value, 0)
  const pecaPaid = (pecas ?? []).filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const argilaOpen = (argilas ?? []).filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)
  const argilaClosed = (argilas ?? []).filter(a => a.status === 'closed').reduce((s, a) => s + a.total_value, 0)
  const argilaPaid = (argilas ?? []).filter(a => a.status === 'paid').reduce((s, a) => s + a.total_value, 0)

  const fechAwaiting = (fechamentos ?? []).filter(f => f.status === 'awaiting_payment').reduce((s, f) => s + f.total_value, 0)
  const fechPaid = (fechamentos ?? []).filter(f => f.status === 'paid').reduce((s, f) => s + f.total_value, 0)

  return (
    <>
      <AdminNavHeader title="Atelie Malu Ribeiro" />
      <div className="px-4 pt-4 pb-24 space-y-5">
        <div>
          <h1 className="font-display text-2xl text-brand-text">Ola, Malu</h1>
          <p className="text-sm text-brand-muted">
            {formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM")}
          </p>
        </div>

        {/* Pecas */}
        <Link href="/admin/pecas" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Pecas</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Em aberto</p>
              <p className="font-display text-base text-status-open-text">{formatCurrency(pecaOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Fechadas</p>
              <p className="font-display text-base text-status-closed-text">{formatCurrency(pecaClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Pagas</p>
              <p className="font-display text-base text-status-paid-text">{formatCurrency(pecaPaid)}</p>
            </div>
          </div>
        </Link>

        {/* Argila */}
        <Link href="/admin/argila" className="block bg-white rounded-xl shadow-card p-4 space-y-3">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Argila</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Em aberto</p>
              <p className="font-display text-base text-status-open-text">{formatCurrency(argilaOpen)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Fechada</p>
              <p className="font-display text-base text-status-closed-text">{formatCurrency(argilaClosed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Paga</p>
              <p className="font-display text-base text-status-paid-text">{formatCurrency(argilaPaid)}</p>
            </div>
          </div>
        </Link>

        {/* Fechamentos */}
        <Link href="/admin/fechamentos" className="block bg-brand-blush rounded-xl shadow-card p-4 space-y-3">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-mauve">Fechamentos</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-brand-mauve/70 mb-0.5">Aguardando pagamento</p>
              <p className="font-display text-lg text-brand-mauve">{formatCurrency(fechAwaiting)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-mauve/70 mb-0.5">Pagos</p>
              <p className="font-display text-lg text-brand-mauve">{formatCurrency(fechPaid)}</p>
            </div>
          </div>
        </Link>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/agenda" className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Aulas hoje</p>
            <p className="font-display text-3xl text-brand-text">{todaySlots ?? 0}</p>
          </Link>
          <Link href="/admin/alunos" className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Alunas ativas</p>
            <p className="font-display text-3xl text-brand-text">{activeStudents ?? 0}</p>
          </Link>
        </div>

        {/* Acoes rapidas */}
        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Acoes rapidas</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/pecas/nova"
              className="flex items-center justify-center gap-2 bg-brand-ink text-brand-cream px-4 py-3 rounded-xl text-sm font-medium">
              + Nova peca
            </Link>
            <Link href="/admin/argila/nova"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              Nova argila
            </Link>
            <Link href="/admin/fechamentos/pacote"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              Novo pacote
            </Link>
            <Link href="/admin/fechamentos/novo"
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              Gerar fechamento
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}