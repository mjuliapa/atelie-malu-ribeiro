'use client'

import { useState } from 'react'
import { ScheduleSlot } from '@/types'
import { formatSlotTime, formatDate, cn } from '@/lib/utils'

interface ConfirmAgendamentoModalProps {
  slot: ScheduleSlot
  userId: string
  onClose: () => void
  onConfirmed: () => void
}

export function ConfirmAgendamentoModal({ slot, userId, onClose, onConfirmed }: ConfirmAgendamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modality, setModality] = useState<'manual' | 'torno'>('manual')

  async function handleConfirm() {
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slot.id,
        student_id: userId,
        status: 'confirmed',
        modality,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? 'Não foi possível confirmar. Tente novamente.')
      return
    }
    onConfirmed()
  }

  const tornoSpots = slot.torno_spots ?? 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl px-6 py-6 z-10">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-line rounded-full sm:hidden" />

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-blush flex items-center justify-center">
            <span className="text-2xl">🏺</span>
          </div>
        </div>

        <h2 className="font-display text-xl text-brand-text text-center mb-1">Confirmar agendamento</h2>

        <div className="bg-brand-cream rounded-xl p-4 my-4 space-y-1">
          <p className="text-sm text-brand-muted">Dia</p>
          <p className="font-medium text-brand-text">{formatDate(slot.start_time, "EEEE, d 'de' MMMM")}</p>
          <p className="text-sm text-brand-muted mt-2">Horário</p>
          <p className="font-display text-lg text-brand-text">{formatSlotTime(slot.start_time, slot.end_time)}</p>
        </div>

        <div className="space-y-2 mb-4">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Modalidade</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModality('manual')}
              className={cn('py-2.5 rounded-xl border text-sm font-medium transition-colors',
                modality === 'manual' ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text')}>
              ✋ Manual
            </button>
            <button type="button" onClick={() => setModality('torno')}
              className={cn('py-2.5 rounded-xl border text-sm font-medium transition-colors',
                modality === 'torno' ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text')}>
              🏺 Torno {tornoSpots > 0 ? `(${tornoSpots} vaga${tornoSpots !== 1 ? 's' : ''})` : '(lotado)'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white text-brand-muted border border-brand-line rounded-lg font-medium text-sm">Voltar</button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-3 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm disabled:opacity-50">
            {loading ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}