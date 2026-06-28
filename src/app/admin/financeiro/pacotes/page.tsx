'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

type Pacote = {
  id: string
  package_type: string
  credits: number
  value: number
  status: string
  created_at: string
  profiles?: { full_name: string }
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Aguardando',
  closed: 'No fechamento',
  paid: 'Pago',
}
const STATUS_COLOR: Record<string, string> = {
  awaiting_payment: 'bg-status-open-bg text-status-open-text',
  closed: 'bg-status-closed-bg text-status-closed-text',
  paid: 'bg-status-paid-bg text-status-paid-text',
}

export default function PacotesPage() {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [filter, setFilter] = useState<'all' | 'awaiting_payment' | 'closed' | 'paid' | 'negativado'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/package-charges')
      .then(r => r.json())
      .then(data => { setPacotes(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const filtrados = filter === 'all' ? pacotes : pacotes.filter(p => p.status === filter)
  const totalFiltrado = filtrados.reduce((s, p) => s + p.value, 0)

  return (
    <>
      <AdminNavHeader title="Pacotes de aula" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <h1 className="font-display text-2xl text-brand-text">Pacotes de aula</h1>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'awaiting_payment', 'closed', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <p className="text-sm text-brand-mauve">Total no filtro</p>
          <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalFiltrado)}</p>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="text-sm text-brand-muted">Nenhum pacote neste filtro.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {filtrados.map(p => (
              <Link key={p.id} href={`/admin/alunos/${(p as any).student_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{p.profiles?.full_name ?? 'Aluna'}</p>
                  <p className="text-xs text-brand-muted">
                    {p.package_type === 'torno' ? 'Torno' : 'Manual'} · {p.credits} aulas · {formatDate(p.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(p.value)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}