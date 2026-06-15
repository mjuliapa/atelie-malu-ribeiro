import { createClient } from '@/lib/supabase/server'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: openPieces },
    { data: openValue },
    { count: todaySlots },
    { count: activeStudents },
    { data: openClay },
    { data: recentPieces },
  ] = await Promise.all([
    supabase.from('pieces').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('pieces').select('calculated_value').eq('status', 'open'),
    supabase.from('schedule_slots').select('*', { count: 'exact', head: true })
      .gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`).eq('is_blocked', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'active'),
    supabase.from('clay_sales').select('total_value').eq('status', 'open'),
    supabase.from('pieces')
      .select('id, name, calculated_value, status, piece_date, profiles:student_id(full_name)')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const totalOpen = openValue?.reduce((sum, p) => sum + p.calculated_value, 0) ?? 0
  const totalClay = openClay?.reduce((sum, c) => sum + c.total_value, 0) ?? 0
  const openClayCount = openClay?.length ?? 0
  const totalReceiver = totalOpen + totalClay

  return (
    <>
      <AdminNavHeader title="Ateliê Malu Ribeiro" />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl text-brand-text">Olá, Malu 🌸</h1>
          <p className="text-sm text-brand-muted">
            {formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM")}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/pecas" className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Peças em aberto</p>
            <p className="font-display text-3xl text-brand-text">{openPieces ?? 0}</p>
            <p className="text-xs text-brand-muted mt-1">{formatCurrency(totalOpen)}</p>
          </Link>

          <Link href="/admin/fechamentos" className="bg-brand-blush rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-mauve mb-1">A receber (total)</p>
            <p className="font-display text-xl text-brand-mauve">{formatCurrency(totalReceiver)}</p>
          </Link>

          <Link href="/admin/agenda" className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Aulas hoje</p>
            <p className="font-display text-3xl text-brand-text">{todaySlots ?? 0}</p>
          </Link>

          <Link href="/admin/alunos" className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Alunas ativas</p>
            <p className="font-display text-3xl text-brand-text">{activeStudents ?? 0}</p>
          </Link>
        </div>

        {/* Argila em aberto */}
        <Link href="/admin/argila" className="flex items-center justify-between bg-white rounded-xl p-4 shadow-card">
          <div>
            <p className="text-xs text-brand-muted mb-0.5">Argila em aberto</p>
            <p className="font-display text-xl text-brand-text">
              {openClayCount > 0 ? formatCurrency(totalClay) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-mauve">{openClayCount} venda{openClayCount !== 1 ? 's' : ''}</p>
            <span className="text-xs text-brand-mauve">Ver →</span>
          </div>
        </Link>

        {/* Ações rápidas */}
        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/pecas/nova"
              className="flex items-center gap-2 bg-brand-ink text-brand-cream px-4 py-3 rounded-xl text-sm font-medium">
              + Nova peça
            </Link>
            <Link href="/admin/argila/nova"
              className="flex items-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🏺 Nova Argila
            </Link>
            <Link href="/admin/fechamentos/novo"
              className="flex items-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium col-span-2 justify-center">
              📋 Gerar fechamento
            </Link>
          </div>
        </div>

        {/* Últimas peças */}
        {recentPieces && recentPieces.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base text-brand-text">Últimas peças</h2>
              <Link href="/admin/pecas" className="text-xs text-brand-mauve">Ver todas</Link>
            </div>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {recentPieces.map((piece) => (
                <div key={piece.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{piece.name}</p>
                    <p className="text-xs text-brand-muted">
                      {(piece.profiles as unknown as { full_name: string })?.full_name ?? '—'} · {formatDate(piece.piece_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(piece.calculated_value)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      piece.status === 'open' ? 'bg-status-open-bg text-status-open-text'
                      : piece.status === 'paid' ? 'bg-status-paid-bg text-status-paid-text'
                      : 'bg-status-closed-bg text-status-closed-text'
                    }`}>
                      {piece.status === 'open' ? 'Em aberto' : piece.status === 'paid' ? 'Paga' : 'Fechada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}