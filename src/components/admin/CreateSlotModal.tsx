'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface CreateSlotModalProps {
  preselectedDate: Date | null
  onClose: () => void
  onCreated: () => void
}

const DEFAULT_DURATIONS = [60, 90, 120, 150, 180]

export function CreateSlotModal({ preselectedDate, onClose, onCreated }: CreateSlotModalProps) {
  const today = preselectedDate ?? new Date()

  const [date, setDate] = useState(format(today, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(90)
  const [maxStudents, setMaxStudents] = useState(8)
  const [tornoSpots, setTornoSpots] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function calculateEndTime(): string {
    const [h, m] = startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + duration
    const endH = Math.floor(totalMinutes / 60)
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const startISO = `${date}T${startTime}:00`
    const endISO = `${date}T${calculateEndTime()}:00`

    const { error } = await supabase.from('schedule_slots').insert({
      start_time: startISO,
      end_time: endISO,
      max_students: maxStudents,
      torno_spots: tornoSpots,
      is_blocked: false,
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('overlap') || error.message.includes('unique')) {
        setError('Já existe uma aula neste horário.')
      } else {
        setError('Não foi possível criar a aula. Tente novamente.')
      }
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl px-6 py-6 z-10" style={{maxHeight: '85dvh', overflowY: 'auto'}}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-line rounded-full sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-brand-text">Nova aula</h2>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-text rounded-lg hover:bg-brand-cream transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Início</label>
            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Duração — término às {calculateEndTime()}
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    duration === d
                      ? 'bg-brand-mauve text-white border-brand-mauve'
                      : 'bg-white text-brand-muted border-brand-line hover:border-brand-mauve hover:text-brand-mauve'
                  }`}>
                  {`${String(Math.floor(d / 60)).padStart(2, '0')}h${String(d % 60).padStart(2, '0')}`}
                </button>
              ))}
            </div>
          </div>

          {/* Vagas totais */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Total de vagas
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMaxStudents((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-lg border border-brand-line bg-white text-brand-text hover:bg-brand-cream transition-colors font-bold text-lg flex items-center justify-center">
                −
              </button>
              <span className="text-2xl font-display text-brand-text w-8 text-center">{maxStudents}</span>
              <button type="button" onClick={() => setMaxStudents((n) => Math.min(20, n + 1))}
                className="w-10 h-10 rounded-lg border border-brand-line bg-white text-brand-text hover:bg-brand-cream transition-colors font-bold text-lg flex items-center justify-center">
                +
              </button>
              <span className="text-sm text-brand-muted">aluna{maxStudents !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Vagas torno */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Vagas no torno
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setTornoSpots((n) => Math.max(0, n - 1))}
                className="w-10 h-10 rounded-lg border border-brand-line bg-white text-brand-text hover:bg-brand-cream transition-colors font-bold text-lg flex items-center justify-center">
                −
              </button>
              <span className="text-2xl font-display text-brand-text w-8 text-center">{tornoSpots}</span>
              <button type="button" onClick={() => setTornoSpots((n) => Math.min(maxStudents, n + 1))}
                className="w-10 h-10 rounded-lg border border-brand-line bg-white text-brand-text hover:bg-brand-cream transition-colors font-bold text-lg flex items-center justify-center">
                +
              </button>
              <span className="text-sm text-brand-muted">vaga{tornoSpots !== 1 ? 's' : ''} torno</span>
            </div>
            <p className="text-xs text-brand-muted mt-1">
              {maxStudents - tornoSpots} manual + {tornoSpots} torno
            </p>
          </div>

          {error && (
            <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 px-4 bg-white text-brand-muted border border-brand-line rounded-lg font-medium text-sm hover:bg-brand-cream transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm hover:bg-brand-text transition-colors disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar aula'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}