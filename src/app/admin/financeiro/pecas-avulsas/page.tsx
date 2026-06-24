'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { PecaRowActions } from '@/components/admin/PecaRowActions'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const CANAL_NOME: Record<string, string> = {
  'Venda livre (sem calculo)': 'Aluna',
  'Venda Loja': 'Loja',
  'Venda Site': 'Site',
  'Venda Encomenda': 'Encomenda',
}

function semAcento(s: string) {
  return s?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

type Peca = {
  id: string
  name: string
  calculated_value: number
  status: string
  piece_date: string
  firing_types?: { name: string }
  profiles?: { full_name: string }
}

export default function PecasAvulsasPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [canal, setCanal] = useState<'all' | 'Aluna' | 'Loja' | 'Site' | 'Encomenda'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pecas')
      .then(r => r.json())
      .then(data => {
        const avulsas = (data ?? []).filter((p: Peca) =>
          Object.keys(CANAL_NOME).some(n => semAcento(p.firing_types?.name ?? '') === semAcento(n))
        )
        setPecas(avulsas)
        setLoading(false)
      })
  }, [])

  const comCanal = pecas.map(p => ({
    ...p,
    canal: Object.entries(CANAL_NOME).find(([n]) => semAcento(n) === semAcento(p.firing_types?.name ?? ''))?.[1] ?? '?',
  }))

  const filtradas = canal === 'all' ? comCanal : comCanal.filter(p => p.canal === canal)

  return (
    <>
      <AdminNavHeader title="Peças avulsas" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-brand-text">Peças avulsas</h1>
          <Link href="/admin/financeiro/pecas-avulsas/nova" className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Nova
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'Aluna', 'Loja', 'Site', 'Encomenda'] as const).map(c => (
            <button key={c} onClick={() => setCanal(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                canal === c ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {c === 'all' ? 'Todos' : c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="text-sm text-brand-muted">Nenhuma peça neste canal.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {filtradas.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                  <p className="text-xs text-brand-muted">{p.canal} · {formatDate(p.piece_date)}</p>
                </div>
                <p className="text-sm font-medium text-brand-text flex-shrink-0">{formatCurrency(p.calculated_value)}</p>
                <PecaRowActions id={p.id} name={p.name} isAvulsa />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}