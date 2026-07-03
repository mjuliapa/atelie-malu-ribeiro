'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

type Custo = {
  id: string
  grupo: 'produtos' | 'operacional' | 'investimento'
  categoria: string
  tipo: 'fixo' | 'variavel'
  valor: number
  data: string
  descricao?: string | null
  recorrente?: boolean
  dia_do_mes?: number | null
}

const GRUPO_LABEL: Record<string, string> = {
  produtos: '🏺 Produtos e serviços',
  operacional: '🏢 Operacional',
  investimento: '💼 Investimento',
}

function getFirstDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}
function getLastDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

export default function CustosPage() {
  const [custos, setCustos] = useState<Custo[]>([])
  const [filter, setFilter] = useState<'all' | 'produtos' | 'operacional' | 'investimento'>('all')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mesRef, setMesRef] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [anoStr, mesStr] = mesRef.split('-')
  const ano = parseInt(anoStr), mes = parseInt(mesStr) - 1
  const from = new Date(ano, mes, 1).toISOString().split('T')[0]
  const to = new Date(ano, mes + 1, 0).toISOString().split('T')[0]

  function mesAnterior() {
    const d = new Date(ano, mes - 1, 1)
    setMesRef(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function mesProximo() {
    const d = new Date(ano, mes + 1, 1)
    setMesRef(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('grupo', filter)
    fetch(`/api/admin/custos?${params}`)
      .then(r => r.json())
      .then(data => { setCustos(Array.isArray(data) ? data : []); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  async function handleDelete(id: string, categoria: string) {
    if (!window.confirm(`Excluir custo "${categoria}"?`)) return
    setDeletingId(id)
    await fetch(`/api/admin/custos?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  // Fixos: projeta o valor mensal independente de quando foi lançado (recorrente)
  const fixos = custos.filter(c => c.tipo === 'fixo')
  const totalFixoMensal = fixos.reduce((s, c) => s + c.valor, 0)

  // Variáveis: soma apenas os lançados no mês atual
  const variaveis = custos.filter(c => c.tipo === 'variavel' && c.data >= from && c.data <= to)
  const totalVariavelMes = variaveis.reduce((s, c) => s + c.valor, 0)

  const totalMes = totalFixoMensal + totalVariavelMes

  return (
    <>
      <AdminNavHeader title="Custos" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Custos</h1>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={mesAnterior} className="p-1 text-brand-muted hover:text-brand-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <p className="text-sm text-brand-muted">{formatDate(from, "MMMM 'de' yyyy")}</p>
              <button onClick={mesProximo} className="p-1 text-brand-muted hover:text-brand-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
          <Link href="/admin/financeiro/custos/novo" className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Novo custo
          </Link>
        </div>

        <div className="bg-brand-blush rounded-xl p-4 space-y-2">
          <p className="text-xs text-brand-mauve">Total estimado do mês</p>
          <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalMes)}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-brand-mauve/80 pt-1">
            <p>Fixo: {formatCurrency(totalFixoMensal)}</p>
            <p>Variável: {formatCurrency(totalVariavelMes)}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'produtos', 'operacional', 'investimento'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'all' ? 'Todos' : GRUPO_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : custos.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="font-display text-base text-brand-text mb-1">Nenhum custo cadastrado</p>
            <Link href="/admin/financeiro/custos/novo" className="text-sm text-brand-mauve hover:underline">Registrar primeiro custo</Link>
          </div>
        ) : (
          <>
            {fixos.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-display text-base text-brand-text">Custos fixos (mensais)</h2>
                <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                  {fixos.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">{c.categoria}</p>
                        <p className="text-xs text-brand-muted">{GRUPO_LABEL[c.grupo]} · todo dia {c.dia_do_mes}</p>
                      </div>
                      <p className="text-sm font-medium text-brand-text flex-shrink-0">{formatCurrency(c.valor)}</p>
                      <button onClick={() => handleDelete(c.id, c.categoria)} disabled={deletingId === c.id}
                        className="p-1.5 text-brand-muted hover:text-status-open-text transition-colors disabled:opacity-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                          <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="font-display text-base text-brand-text">Custos variáveis</h2>
              {variaveis.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center shadow-card">
                  <p className="text-sm text-brand-muted">Nenhum custo variável este mês.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                  {variaveis.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">{c.categoria}</p>
                        <p className="text-xs text-brand-muted">{GRUPO_LABEL[c.grupo]} · {formatDate(c.data)}</p>
                      </div>
                      <p className="text-sm font-medium text-brand-text flex-shrink-0">{formatCurrency(c.valor)}</p>
                      <button onClick={() => handleDelete(c.id, c.categoria)} disabled={deletingId === c.id}
                        className="p-1.5 text-brand-muted hover:text-status-open-text transition-colors disabled:opacity-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                          <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}