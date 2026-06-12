'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleSlot } from '@/types'
import { formatSlotTime } from '@/lib/utils'

interface BlockSlotModalProps {
  slot: ScheduleSlot
  onClose: () => void
  onUpdated: () => void
}

export function BlockSlotModal({ slot, onClose, onUpdated }: BlockSlotModalProps) {
  const [reason, setReason] = useState(slot.block_reason ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBlocked = slot.is_blocked

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase
      .from('schedule_slots')
      .update({
        is_blocked: !isBlocked,
        block_reason: isBlocked ? null : reason.trim() || null,
      })
      .eq('id', slot.id)

    setLoading(false)

    if (error) {
      setError('Não foi possível atualizar a aula.')
      return
    }

    onUpdated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl px-6 py-6 z-10">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-line rounded-full sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-brand-text">
            {isBlocked ? 'Desbloquear aula' : 'Bloquear aula'}
          </h2>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-text rounded-lg hover:bg-brand-cream transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-brand-muted mb-5">
          Aula: <span className="text-brand-text font-medium">
            {formatSlotTime(slot.start_time, slot.end_time)}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBlocked && (
            <div>
              <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
                Motivo (opcional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Feriado, compromisso pessoal..."
                className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors"
              />
            </div>
          )}

          {isBlocked && (
            <div className="bg-brand-cream rounded-xl p-4">
              <p className="text-sm text-brand-text">
                Confirma o desbloqueio desta aula? Ela voltará a aparecer como disponível para as alunas.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 px-4 bg-white text-brand-muted border border-brand-line rounded-lg font-medium text-sm hover:bg-brand-cream transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm hover:bg-brand-text transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
