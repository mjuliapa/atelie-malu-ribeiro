'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlunoNav } from '@/components/aluno/AlunoNav'
import { formatCurrency, formatDate } from '@/lib/utils'

type Peca = {
  id: string
  name: string
  calculated_value: number
  status: string
  piece_date: string
  firing_types: { name: string } | null
}

export default function AlunoPecasPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('pieces')
        .select('id, name, calculated_value, status, piece_date, firing_types(name)')
        .eq('student_id', user.id)
        .order('piece_date', { ascending: false })

      setPecas((data as unknown as Peca[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const abertas = pecas.filter(p => p.status === 'open')
  const historico = pecas.filter(p => p.status !== 'open')
  const totalAberto = abertas.reduce((sum, p) => sum + p.calculated_value, 0)

  const statusLabel: Record<string, string> = {
    open: 'Em aberto', closed: 'Fechada', paid: 'Paga', cancelled: 'Cancelada'
  }
  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
    cancelled: 'bg-brand-cream text-brand-muted',
  }

  return (
    <div className="pt-16 px-4 pb-24 space-y-5">
      <div className="pt-2">
        <h1 className="font-display text-2xl text-brand-text">Minhas peças</h1>
      </div>

      {/* Saldo em aberto */}
      {totalAberto > 0 && (
        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-brand-mauve mb-0.5">Saldo em aberto</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
          </div>
          <p className="text-xs text-brand-mauve">{abertas.length} peça{abertas.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : pecas.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-card">
          <div className="text-4xl mb-3">🏺</div>
          <p className="font-display text-base text-brand-text">Nenhuma peça ainda</p>
          <p className="text-sm text-brand-muted mt-1">Suas peças aparecerão aqui após a Malu cadastrá-las.</p>
        </div>
      ) : (
        <>
          {/* Peças em aberto */}
          {abertas.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-display text-base text-brand-text">Em aberto</h2>
              <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                {abertas.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-1 self-stretch rounded-full bg-status-open-text flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                      <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                    </div>
                    <p className="text-sm font-medium text-brand-text flex-shrink-0">
                      {formatCurrency(p.calculated_value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-display text-base text-brand-text">Histórico</h2>
              <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                {historico.map(p => (
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
