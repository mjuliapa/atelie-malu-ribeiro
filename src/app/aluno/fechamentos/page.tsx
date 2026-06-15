'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

type Fechamento = {
  id: string
  reference_month: string
  total_value: number
  status: string
  paid_at: string | null
}

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Em aberto',
  closed: 'Fechado',
  paid: 'Pago',
}
const statusColor: Record<string, string> = {
  awaiting_payment: 'bg-status-open-bg text-status-open-text',
  closed: 'bg-status-closed-bg text-status-closed-text',
  paid: 'bg-status-paid-bg text-status-paid-text',
}

export default function AlunoFechamentosPage() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch(`/api/admin/fechamentos?student_id=${user.id}`)
      const data = await res.json()
      setFechamentos(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [])

  const totalAberto = fechamentos
    .filter(f => f.status === 'awaiting_payment')
    .reduce((s, f) => s + f.total_value, 0)

  return (
    <div className="px-4 pb-4 space-y-5">
      <div className="pt-20">
        <h1 className="font-display text-2xl text-brand-text">Cobranças</h1>
      </div>

      {totalAberto > 0 && (
        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-brand-mauve mb-0.5">Aguardando pagamento</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
          </div>
          <p className="text-xs text-brand-mauve">PIX: 46.504.315/0001-77</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : fechamentos.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-card">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-display text-base text-brand-text">Nenhum fechamento ainda</p>
          <p className="text-sm text-brand-muted mt-1">Seus fechamentos mensais aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
          {fechamentos.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-brand-text">{f.reference_month}</p>
                {f.paid_at && (
                  <p className="text-xs text-brand-muted">Pago em {formatDate(f.paid_at)}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-brand-text">{formatCurrency(f.total_value)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[f.status] ?? 'bg-brand-cream text-brand-muted'}`}>
                  {statusLabel[f.status] ?? f.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}