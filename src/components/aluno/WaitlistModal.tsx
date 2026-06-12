'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleSlot } from '@/types'
import { formatSlotTime, formatDate } from '@/lib/utils'

interface WaitlistModalProps {
  slot: ScheduleSlot
  userId: string
  onClose: () => void
  onJoined: () => void
}

export function WaitlistModal({ slot, userId, onClose, onJoined }: WaitlistModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleJoin() {
    setError(null)
    setLoading(true)

    // Verificar se já está na lista
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('slot_id', slot.id)
      .eq('student_id', userId)
      .in('status', ['waiting', 'offered'])
      .single()

    if (existing) {
      setError('Você já está na lista de espera desta aula.')
      setLoading(false)
      return
    }

    // Pegar próxima posição
    const { data: lastEntry } = await supabase
      .from('waitlist')
      .select('position')
      .eq('slot_id', slot.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (lastEntry?.position ?? 0) + 1

    const { error } = await supabase.from('waitlist').insert({
      slot_id: slot.id,
      student_id: userId,
      position,
      status: 'waiting',
    })

    setLoading(false)

    if (error) {
      setError('Não foi possível entrar na lista. Tente novamente.')
      return
    }

    onJoined()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl px-6 py-6 z-10">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-line rounded-full sm:hidden" />

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-blush flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
        </div>

        <h2 className="font-display text-xl text-brand-text text-center mb-1">
          Lista de espera
        </h2>
        <p className="text-sm text-brand-muted text-center mb-5">
          Esta aula está lotada. Se surgir uma vaga, você será avisada por e-mail.
        </p>

        <div className="bg-brand-cream rounded-xl p-4 my-4 space-y-1">
          <p className="text-sm text-brand-muted">Dia</p>
          <p className="font-medium text-brand-text">
            {formatDate(slot.start_time, "EEEE, d 'de' MMMM")}
          </p>
          <p className="text-sm text-brand-muted mt-2">Horário</p>
          <p className="font-display text-lg text-brand-text">
            {formatSlotTime(slot.start_time, slot.end_time)}
          </p>
        </div>

        {error && (
          <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-white text-brand-muted border border-brand-line rounded-lg font-medium text-sm hover:bg-brand-cream transition-colors">
            Voltar
          </button>
          <button onClick={handleJoin} disabled={loading}
            className="flex-1 py-3 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm hover:bg-brand-text transition-colors disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar na fila'}
          </button>
        </div>
      </div>
    </div>
  )
}
