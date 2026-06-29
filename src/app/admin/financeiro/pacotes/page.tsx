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

type AlunaNegativada = { id: string; full_name: string; credits: number }

export default function PacotesPage() {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [negativadas, setNegativadas] = useState<AlunaNegativada[]>([])
  const [filter, setFilter] = useState<'all' | 'awaiting_payment' | 'closed' | 'paid' | 'negativado'>('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/package-charges').then(r => r.json()),
      fetch('/api/admin/form-data').then(r => r.json()),
    ]).then(([pacotesData, formData]) => {
      setPacotes(Array.isArray(pacotesData) ? pacotesData : [])
      const negs = (formData?.students ?? []).filter((s: any) => (s.credits ?? 0) < 0)
      setNegativadas(negs)
      setLoading(false)
    })
  }, [])

  const porStatus = filter === 'all' || filter === 'negativado' ? pacotes : pacotes.filter(p => p.status === filter)
  const filtrados = porStatus.filter(p => p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()))
  const totalFiltrado = filter === 'negativado' ? 0 : filtrados.reduce((s, p) => s + p.value, 0)

  return (
    <>
      <AdminNavHeader title="Pacotes de aula" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <h1 className="font-display text-2xl text-brand-text">Pacotes de aula</h1>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluna pelo nome..."
          className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'awaiting_payment', 'closed', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
          <button onClick={() => setFilter('negativado')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'negativado' ? 'bg-status-open-text text-white' : 'bg-white text-brand-muted border border-brand-line'
            }`}>
            Negativados ({negativadas.length})
          </button>
        </div>

        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <p className="text-sm text-brand-mauve">Total no filtro</p>
          <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalFiltrado)}</p>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filter === 'negativado' ? (
          negativadas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-card">
              <p className="text-sm text-brand-muted">Nenhuma aluna negativada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {negativadas.map(a => (
                <Link key={a.id} href={`/admin/alunos/${a.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-brand-cream transition-colors">
                  <p className="text-sm font-medium text-brand-text">{a.full_name}</p>
                  <span className="text-sm font-medium text-status-open-text">{a.credits} crédito{a.credits !== -1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          )
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