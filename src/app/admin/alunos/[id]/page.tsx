import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { AlunaStatusToggle } from '@/components/admin/AlunaStatusToggle'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PecaRowActions } from '@/components/admin/PecaRowActions'
import { ArgilaRowActions } from '@/components/admin/ArgilaRowActions'
import { PackageRowActions } from '@/components/admin/PackageRowActions'
import { FechamentoRowActions } from '@/components/admin/FechamentoRowActions'

export default async function AlunaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: aluna } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!aluna) notFound()

  const [{ data: pecas }, { data: argilas }, { data: fechamentos }, { data: packageCharges }] = await Promise.all([
    admin.from('pieces').select('*, firing_types(name)').eq('student_id', id).order('created_at', { ascending: false }),
    admin.from('clay_sales').select('*, clay_types(name)').eq('student_id', id).order('created_at', { ascending: false }),
    admin.from('monthly_closings').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    admin.from('package_charges').select('*').eq('student_id', id).order('created_at', { ascending: false }),
  ])

  const isVendaLivre = (p: any) => (p.firing_types as any)?.name === 'Venda livre (sem cálculo)'
  const queimas = (pecas ?? []).filter(p => !isVendaLivre(p))
  const pecasAvulsas = (pecas ?? []).filter(p => isVendaLivre(p))

  const credits = aluna.credits ?? 0
  const isNegative = credits < 0
  const packageType = aluna.package_type ?? 'manual'
  const packageValue = packageType === 'torno' ? 460 : 420

  const totalQueimaAberto = queimas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const totalQueimaFechado = queimas.filter(p => p.status === 'closed').reduce((s, p) => s + p.calculated_value, 0)
  const totalQueimaPago = queimas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const totalPecaAberto = pecasAvulsas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const totalPecaFechado = pecasAvulsas.filter(p => p.status === 'closed').reduce((s, p) => s + p.calculated_value, 0)
  const totalPecaPago = pecasAvulsas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const totalArgilaAberto = (argilas ?? []).filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)
  const totalArgilaFechado = (argilas ?? []).filter(a => a.status === 'closed').reduce((s, a) => s + a.total_value, 0)
  const totalArgilaPago = (argilas ?? []).filter(a => a.status === 'paid').reduce((s, a) => s + a.total_value, 0)

  const totalPacoteAberto = (packageCharges ?? []).filter(c => c.status === 'awaiting_payment').reduce((s, c) => s + c.value, 0)
  const totalPacotePago = (packageCharges ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + c.value, 0)

  // Dívida por crédito negativo (aulas usadas sem pacote pago)
  const valorPorAula = packageType === 'torno' ? 115 : 105
  const dividaCredito = isNegative ? Math.abs(credits) * valorPorAula : 0
  const totalPacoteAbertoComDivida = totalPacoteAberto + dividaCredito

  const totalAberto = totalQueimaAberto + totalPecaAberto + totalArgilaAberto + totalPacoteAbertoComDivida
  const totalFechado = totalQueimaFechado + totalPecaFechado + totalArgilaFechado
  const totalPago = totalQueimaPago + totalPecaPago + totalArgilaPago + totalPacotePago

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

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-medium text-brand-mauve">{aluna.full_name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl text-brand-text">{aluna.full_name}</h1>
            <p className="text-sm text-brand-muted">{aluna.phone ?? 'Sem telefone'}</p>
          </div>
          <AlunaStatusToggle id={id} currentStatus={aluna.status ?? 'active'} />
        </div>

        {/* Créditos */}
        <div className={`rounded-xl p-4 flex items-center justify-between ${isNegative ? 'bg-status-open-bg' : credits > 0 ? 'bg-status-paid-bg' : 'bg-status-open-bg'}`}>
          <div>
            <p className={`text-xs mb-0.5 ${isNegative || credits === 0 ? 'text-status-open-text' : 'text-status-paid-text'}`}>
              Créditos de aula · pacote {packageType}
            </p>
            <p className={`font-display text-2xl ${isNegative || credits === 0 ? 'text-status-open-text' : 'text-status-paid-text'}`}>
              {credits} {isNegative ? '(devendo)' : `crédito${credits !== 1 ? 's' : ''}`}
            </p>
            {isNegative && (
              <p className="text-xs text-status-open-text mt-1">
                Dívida estimada: {formatCurrency(dividaCredito)}
              </p>
            )}
          </div>
          <Link href={`/admin/alunos/${id}/creditos`}
            className="text-xs px-3 py-1.5 bg-white rounded-lg border border-brand-line text-brand-text font-medium">
            Editar
          </Link>
        </div>

        {(credits <= 0) && (
          <Link href={`/admin/fechamentos/pacote?aluna=${id}&tipo=${packageType}`}
            className="block bg-brand-blush rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-brand-mauve">+ Gerar cobrança de pacote</p>
            <p className="text-xs text-brand-mauve/70">{formatCurrency(packageValue)} · 4 aulas</p>
          </Link>
        )}

        {/* Resumo financeiro separado por categoria */}
        <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">Resumo financeiro</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text">🔥 Queima</p>
              <div className="flex gap-3 text-xs">
                <span className="text-status-open-text">{formatCurrency(totalQueimaAberto)}</span>
                <span className="text-status-paid-text">{formatCurrency(totalQueimaPago)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text">🪨 Argila</p>
              <div className="flex gap-3 text-xs">
                <span className="text-status-open-text">{formatCurrency(totalArgilaAberto)}</span>
                <span className="text-status-paid-text">{formatCurrency(totalArgilaPago)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text">💎 Peça</p>
              <div className="flex gap-3 text-xs">
                <span className="text-status-open-text">{formatCurrency(totalPecaAberto)}</span>
                <span className="text-status-paid-text">{formatCurrency(totalPecaPago)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text">🎓 Aula (pacote)</p>
              <div className="flex gap-3 text-xs">
                <span className="text-status-open-text">{formatCurrency(totalPacoteAbertoComDivida)}</span>
                <span className="text-status-paid-text">{formatCurrency(totalPacotePago)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 text-[10px] text-brand-muted border-t border-brand-line pt-2">
            <span>● Em aberto</span>
            <span>● Pago</span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-brand-line pt-3">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Total em aberto</p>
              <p className="font-display text-base text-status-open-text">{formatCurrency(totalAberto)}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Total pago</p>
              <p className="font-display text-base text-status-paid-text">{formatCurrency(totalPago)}</p>
            </div>
          </div>
        </div>

        {/* Ações — criar novo item por categoria */}
        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Adicionar</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/admin/pecas/nova?aluna=${id}`}
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🔥 Queima
            </Link>
            <Link href={`/admin/argila/nova?aluna=${id}`}
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🪨 Argila
            </Link>
            <Link href={`/admin/financeiro/pecas-avulsas/nova?aluna=${id}`}
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              💎 Peça
            </Link>
            <Link href={`/admin/fechamentos/pacote?aluna=${id}`}
              className="flex items-center justify-center gap-2 bg-white text-brand-text border border-brand-line px-4 py-3 rounded-xl text-sm font-medium">
              🎓 Aula (pacote)
            </Link>
          </div>
          <Link href={`/admin/fechamentos/novo?aluna=${id}`}
            className="flex items-center justify-center gap-2 bg-brand-ink text-brand-cream px-4 py-3 rounded-xl text-sm font-medium">
            📋 Gerar fechamento
          </Link>
        </div>

        {/* Queima */}
        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Queima</h2>
          {!queimas.length ? (
            <div className="bg-white rounded-xl p-6 text-center shadow-card">
              <p className="text-sm text-brand-muted">Nenhuma queima cadastrada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {queimas.map(p => (
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
                  <PecaRowActions id={p.id} name={p.name} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peças avulsas */}
        {pecasAvulsas.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display text-base text-brand-text">Peças</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {pecasAvulsas.map(p => (
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
                  <PecaRowActions id={p.id} name={p.name} isAvulsa />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Argila */}
        {argilas && argilas.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display text-base text-brand-text">Argila</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {argilas.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text">{a.quantity}x {(a.clay_types as any)?.name}</p>
                    <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(a.total_value)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[a.status] ?? ''}`}>
                      {statusLabel[a.status] ?? a.status}
                    </span>
                  </div>
                  <ArgilaRowActions id={a.id} currentValue={a.total_value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pacotes */}
        {packageCharges && packageCharges.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display text-base text-brand-text">Aula (pacotes)</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {packageCharges.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-text">Pacote {c.package_type} · {c.credits} aulas</p>
                    <p className="text-xs text-brand-muted">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-brand-text">{formatCurrency(c.value)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.status === 'paid' ? 'bg-status-paid-bg text-status-paid-text' : 'bg-status-open-bg text-status-open-text'}`}>
                        {c.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                    <PackageRowActions id={c.id} currentValue={c.value} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fechamentos */}
        {fechamentos && fechamentos.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display text-base text-brand-text">Fechamentos</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {fechamentos.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/admin/fechamentos/${f.id}`} className="flex-1 hover:opacity-70 transition-opacity">
                    <p className="text-sm font-medium text-brand-text">{f.reference_month}</p>
                    <p className="text-xs text-brand-muted">{formatDate(f.created_at)}</p>
                  </Link>
                  <div className="text-right">
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(f.total_value)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${f.status === 'paid' ? 'bg-status-paid-bg text-status-paid-text' : 'bg-status-open-bg text-status-open-text'}`}>
                      {f.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <FechamentoRowActions id={f.id} currentStatus={f.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}