'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

type Sale = {
  id: string
  quantity: number
  unit_price: number
  total_value: number
  status: string
  sale_date: string
  clay_types: { name: string } | null
  profiles: { full_name: string } | null
}

export default function AdminArgilaPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/argila?status=${filter}`)
      .then(r => r.json())
      .then(data => { setSales(data); setLoading(false) })
  }, [filter])

  const totalAberto = sales.filter(s => s.status === 'open').reduce((sum, s) => sum + s.total_value, 0)

  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
  }
  const statusLabel: Record<string, string> = { open: 'Em aberto', closed: 'Fechado', paid: 'Pago' }

  return (
    <>
      <AdminNavHeader title="Argila" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Argila</h1>
            <p className="text-sm text-brand-muted">{sales.length} registros</p>
          </div>
          <Link href="/admin/argila/nova" className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Nova venda
          </Link>
        </div>

        {totalAberto > 0 && (
          <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
            <p className="text-xs text-brand-mauve">Total em aberto</p>
            <p className="font-display text-xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
          </div>
        )}

        <div className="flex gap-2">
          {(['all', 'open', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="font-display text-base text-brand-text mb-1">Nenhuma venda ainda</p>
            <Link href="/admin/argila/nova" className="text-sm text-brand-mauve hover:underline">Registrar primeira venda</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {sales.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">
                    {(s.profiles as any)?.full_name} — {(s.clay_types as any)?.name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {s.quantity} pacote{s.quantity !== 1 ? 's' : ''} · {formatDate(s.sale_date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(s.total_value)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[s.status]}`}>
                    {statusLabel[s.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}