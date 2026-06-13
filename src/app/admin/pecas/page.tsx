'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

type Peca = {
  id: string
  name: string
  calculated_value: number
  status: string
  piece_date: string
  profiles: { full_name: string } | null
}

export default function AdminPecasPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'paid'>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('pieces')
        .select('id, name, calculated_value, status, piece_date, profiles:student_id(full_name)')
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query
      setPecas((data as unknown as Peca[]) ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  const statusLabel: Record<string, string> = { open: 'Em aberto', closed: 'Fechada', paid: 'Paga', cancelled: 'Cancelada' }
  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
    cancelled: 'bg-brand-cream text-brand-muted',
  }

  return (
    <>
      <AdminNavHeader title="Peças" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Peças</h1>
            <p className="text-sm text-brand-muted">{pecas.length} encontradas</p>
          </div>
          <Link href="/admin/pecas/nova"
            className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Nova peça
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'open', 'closed', 'paid'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-brand-ink text-brand-cream'
                  : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : pecas.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="font-display text-base text-brand-text mb-1">Nenhuma peça encontrada</p>
            <Link href="/admin/pecas/nova" className="text-sm text-brand-mauve hover:underline">
              Cadastrar primeira peça
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {pecas.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                  <p className="text-xs text-brand-muted">
                    {p.profiles?.full_name ?? '—'} · {formatDate(p.piece_date)}
                  </p>
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
    </>
  )
}
