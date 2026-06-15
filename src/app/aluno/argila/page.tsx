'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

type ArgilaSale = {
  id: string
  quantity: number
  total_value: number
  sale_date: string
  status: string
  clay_types: { name: string } | null
}

const statusLabel: Record<string, string> = {
  open: 'Em aberto', closed: 'Fechada', paid: 'Paga'
}
const statusColor: Record<string, string> = {
  open: 'bg-status-open-bg text-status-open-text',
  closed: 'bg-status-closed-bg text-status-closed-text',
  paid: 'bg-status-paid-bg text-status-paid-text',
}

export default function AlunoArgilaPage() {
  const [argilas, setArgilas] = useState<ArgilaSale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch(`/api/admin/argila?student_id=${user.id}`)
      const data = await res.json()
      setArgilas(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalAberto = argilas.filter(a => a.status === 'open').reduce((s, a) => s + a.total_value, 0)

  return (
    <div className="px-4 pb-4 space-y-5">
      <div className="pt-20">
        <h1 className="font-display text-2xl text-brand-text">Minha argila</h1>
      </div>

      {totalAberto > 0 && (
        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-brand-mauve mb-0.5">Saldo em aberto</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalAberto)}</p>
          </div>
          <p className="text-xs text-brand-mauve">
            {argilas.filter(a => a.status === 'open').length} compra{argilas.filter(a => a.status === 'open').length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : argilas.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-card">
          <div className="text-4xl mb-3">🪨</div>
          <p className="font-display text-base text-brand-text">Nenhuma compra ainda</p>
          <p className="text-sm text-brand-muted mt-1">Suas compras de argila aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
          {argilas.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">
                  {a.quantity}x {(a.clay_types as any)?.name ?? 'Argila'}
                </p>
                <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-brand-text">{formatCurrency(a.total_value)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[a.status] ?? 'bg-brand-cream text-brand-muted'}`}>
                  {statusLabel[a.status] ?? a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}