import { createClient } from '@/lib/supabase/server'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AlunaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: aluna } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!aluna) notFound()

  const { data: pecas } = await supabase
    .from('pieces')
    .select('*, firing_types(name)')
    .eq('student_id', id)
    .order('created_at', { ascending: false })

  const { data: fechamentos } = await supabase
    .from('monthly_closings')
    .select('*')
    .eq('student_id', id)
    .order('created_at', { ascending: false })

  const pecasAbertas = pecas?.filter(p => p.status === 'open') ?? []
  const totalAberto = pecasAbertas.reduce((sum, p) => sum + p.calculated_value, 0)

  const statusLabel: Record<string, string> = { open: 'Em aberto', closed: 'Fechada', paid: 'Paga', cancelled: 'Cancelada' }
  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
    cancelled: 'bg-brand-cream text-brand-muted',
  }

  return (
    <>
      <AdminNavHeader title={aluna.full_name} showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">

        {/* Cabeçalho */}
        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-medium text-brand-mauve">
              {aluna.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl text-brand-text">{aluna.full_name}</h1>
            <p className="text-sm text-brand-muted">{aluna.phone ?? 'Sem telefone'}</p>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-blush rounded-xl p-4">
            <p className="text-xs text-brand-mauve mb-1">Em aberto</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Peças</p>
            <p className="font-display text-2xl text-brand-text">{pecas?.length ?? 0}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/pecas/nova?aluna=${id}`}
            className="flex items-center justify-center gap-2 bg-brand-ink text-brand-cream px-4 py-3 rounded-xl text-sm font-medium">
            + Nova peça
          </Link>
          <Link href={`/admin/fechamentos/novo?aluna=${id}`}
            className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
            📋 Fechamento
          </Link>
        </div>

        {/* Peças */}
        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Peças</h2>
          {!pecas?.length ? (
            <div className="bg-white rounded-xl p-6 text-center shadow-card">
              <p className="text-sm text-brand-muted">Nenhuma peça cadastrada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {pecas.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                    <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(p.calculated_value)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fechamentos */}
        {fechamentos && fechamentos.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display text-base text-brand-text">Fechamentos</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {fechamentos.map((f) => (
                <Link key={f.id} href={`/admin/fechamentos/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-text">{f.reference_month}</p>
                    <p className="text-xs text-brand-muted">{formatDate(f.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(f.total_value)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      f.status === 'paid' ? 'bg-status-paid-bg text-status-paid-text' : 'bg-status-open-bg text-status-open-text'
                    }`}>
                      {f.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
