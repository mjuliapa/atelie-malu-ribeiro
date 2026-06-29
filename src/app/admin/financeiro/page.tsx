import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: pecas, error: pecasError }, { data: argilas }, { data: pacotes }, { data: custosRows }] = await Promise.all([
    supabase.from('pieces').select('calculated_value, status, firing_types(name)'),
    supabase.from('clay_sales').select('total_value, status'),
    supabase.from('package_charges').select('value, status').neq('status', 'cancelled'),
    supabase.from('package_charges').select('value, created_at, package_type').like('package_type', 'custo:%'),
  ])

  const NOMES_VENDA_AVULSA = ['Venda livre (sem cálculo)', 'Venda Loja', 'Venda Site', 'Venda Encomenda']
  const isVendaLivre = (p: any) => NOMES_VENDA_AVULSA.includes((p.firing_types as any)?.name)
  const queimaPecas = (pecas ?? []).filter(p => !isVendaLivre(p))
  const vendaLivrePecas = (pecas ?? []).filter(p => isVendaLivre(p))

  const pecaOpen = queimaPecas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const pecaPaid = queimaPecas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const vendaOpen = vendaLivrePecas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
  const vendaPaid = vendaLivrePecas.filter(p => p.status === 'paid').reduce((s, p) => s + p.calculated_value, 0)

  const argilaOpen = (argilas ?? []).filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)
  const argilaPaid = (argilas ?? []).filter(a => a.status === 'paid').reduce((s, a) => s + a.total_value, 0)

  const pacoteOpen = (pacotes ?? []).filter(p => p.status === 'awaiting_payment').reduce((s, p) => s + p.value, 0)
  const pacotePaid = (pacotes ?? []).filter(p => p.status === 'paid').reduce((s, p) => s + p.value, 0)

  const PREFIX = 'custo:'
  const custosLista = (custosRows ?? []).map(c => ({
    ...JSON.parse(c.package_type.slice(PREFIX.length)),
    valor: c.value,
    data: c.created_at.split('T')[0],
  }))
  const totalFixoMensal = custosLista.filter(c => c.tipo === 'fixo').reduce((s, c) => s + c.valor, 0)
  const hoje = new Date()
  const from = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
  const totalVariavelMes = custosLista
    .filter(c => c.tipo === 'variavel' && c.data >= from && c.data <= to)
    .reduce((s, c) => s + c.valor, 0)
  const totalCustosMes = totalFixoMensal + totalVariavelMes

  const modulos = [
    {
      href: '/admin/pecas',
      label: 'Queima',
      desc: 'Peças com cálculo por dimensão e tipo de queima',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
      ),
      open: pecaOpen,
      paid: pecaPaid,
    },
    {
      href: '/admin/argila',
      label: 'Argila',
      desc: 'Venda de argila por tipo e quantidade',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7V5a2 2 0 0 0-2-2H8" />
        </svg>
      ),
      open: argilaOpen,
      paid: argilaPaid,
    },
    {
      href: '/admin/financeiro/pacotes',
      label: 'Pacote de aulas',
      desc: 'Cobrança de pacotes manual ou torno',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" />
        </svg>
      ),
      open: pacoteOpen,
      paid: pacotePaid,
    },
    {
      href: '/admin/financeiro/pecas-avulsas',
      label: 'Peças',
      desc: 'Venda de peças avulsas — aluna, loja, site ou encomenda',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2.59 12.58a2 2 0 0 1 0-2.83l7.17-7.17a2 2 0 0 1 2.83 0L20.59 10.58a2 2 0 0 1 0 2.83z" />
          <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" />
        </svg>
      ),
      open: vendaOpen,
      paid: vendaPaid,
    },
  ]

  return (
    <>
      <AdminNavHeader title="Financeiro" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div>
          <h1 className="font-display text-2xl text-brand-text">Financeiro</h1>
          <p className="text-sm text-brand-muted">Queima, argila, peças e pacotes de aula</p>
        </div>

        <div className="space-y-3">
          {modulos.map(m => (
            <Link key={m.href} href={m.href}
              className="block bg-white rounded-xl shadow-card p-4 hover:bg-brand-cream transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-blush flex items-center justify-center text-brand-mauve flex-shrink-0">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="font-display text-base text-brand-text">{m.label}</p>
                  <p className="text-xs text-brand-muted mb-2">{m.desc}</p>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-brand-muted">Em aberto</p>
                      <p className="text-sm font-medium text-status-open-text">{formatCurrency(m.open)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-muted">Pago</p>
                      <p className="text-sm font-medium text-status-paid-text">{formatCurrency(m.paid)}</p>
                    </div>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-brand-muted flex-shrink-0 mt-1">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Card de Custos — visual diferente, indica saída de dinheiro */}
          <Link href="/admin/financeiro/custos"
            className="block bg-status-open-bg rounded-xl p-4 hover:opacity-90 transition-opacity">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-status-open-text flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
                  <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-display text-base text-status-open-text">💸 Custos</p>
                <p className="text-xs text-status-open-text/70 mb-2">Produtos, operacional e investimentos</p>
                <p className="text-[10px] text-status-open-text/70">Total estimado do mês</p>
                <p className="text-sm font-medium text-status-open-text">{formatCurrency(totalCustosMes)}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-status-open-text flex-shrink-0 mt-1">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        </div>

        <Link href="/admin/relatorios"
          className="block bg-brand-blush rounded-xl p-4 text-center hover:bg-brand-mauve/10 transition-colors">
          <p className="text-sm font-medium text-brand-mauve">📊 Ver relatórios financeiros</p>
        </Link>
      </div>
    </>
  )
  
}