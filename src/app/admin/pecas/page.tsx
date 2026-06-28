'use client'

import { useState, useEffect } from 'react'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    fetch(`/api/admin/pecas?status=${filter}`)
      .then(r => r.json())
      .then(data => { setPecas(data); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/pecas?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Não foi possível excluir.')
      return
    }
    load()
  }

  const statusLabel: Record<string, string> = { open: 'Em aberto', closed: 'Fechada', paid: 'Paga', cancelled: 'Cancelada' }
  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
    cancelled: 'bg-brand-cream text-brand-muted',
  }

  return (
    <>
      <AdminNavHeader title="Queima" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Queima</h1>
            <p className="text-sm text-brand-muted">{pecas.length} encontradas</p>
          </div>
          <Link href="/admin/pecas/nova" className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Nova queima
          </Link>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluna pelo nome..."
          className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />

        {(() => {
          const filtradas = pecas.filter(p => (p.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase()))
          const totalAberto = filtradas.filter(p => p.status === 'open').reduce((s, p) => s + p.calculated_value, 0)
          return totalAberto > 0 ? (
            <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
              <p className="text-xs text-brand-mauve">Total em aberto</p>
              <p className="font-display text-xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
            </div>
          ) : null
        })()}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'open', 'closed', 'paid'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (() => {
          const filtradas = pecas.filter(p => (p.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase()))
          if (filtradas.length === 0) {
            return (
              <div className="bg-white rounded-xl p-8 text-center shadow-card">
                <p className="font-display text-base text-brand-text mb-1">
                  {search ? 'Nenhuma queima encontrada para esse nome' : 'Nenhuma queima encontrada'}
                </p>
                {!search && <Link href="/admin/pecas/nova" className="text-sm text-brand-mauve hover:underline">Cadastrar primeira queima</Link>}
              </div>
            )
          }
          return (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {filtradas.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                  <p className="text-xs text-brand-muted">
                    {(p.profiles as any)?.full_name ?? '—'} · {formatDate(p.piece_date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(p.calculated_value)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
                    {statusLabel[p.status]}
                  </span>
                </div>
                {p.status === 'open' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/admin/pecas/${p.id}/editar`}
                      className="p-2 rounded-lg text-brand-muted hover:text-brand-mauve hover:bg-brand-cream transition-colors"
                      aria-label="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </Link>
                    <button onClick={() => handleDelete(p.id, p.name)} disabled={deletingId === p.id}
                      className="p-2 rounded-lg text-brand-muted hover:text-status-open-text hover:bg-status-open-bg transition-colors disabled:opacity-50"
                      aria-label="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )
        })()}
      </div>
    </>
  )
}