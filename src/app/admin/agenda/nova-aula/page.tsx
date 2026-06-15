'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const FIXED_DURATION = 150

function NovaAulaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const today = dateParam ?? format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [maxStudents, setMaxStudents] = useState(8)
  const [tornoSpots, setTornoSpots] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function calculateEndTime(): string {
    const [h, m] = startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + FIXED_DURATION
    const endH = Math.floor(totalMinutes / 60)
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    const startISO = `${date}T${startTime}:00`
    const endISO = `${date}T${calculateEndTime()}:00`

    const res = await fetch('/api/admin/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: startISO,
        end_time: endISO,
        max_students: maxStudents,
        torno_spots: tornoSpots,
        is_blocked: false,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json()
      if (err.error?.includes('overlap') || err.error?.includes('unique')) {
        setError('Já existe uma aula neste horário.')
      } else {
        setError(err.error ?? 'Não foi possível criar a aula.')
      }
      return
    }

    const slot = await res.json()
    router.push(`/admin/agenda/slot/${slot.id}`)
  }

  return (
    <>
      <AdminNavHeader title="Nova aula" showBack />
      <div className="px-4 pt-4 pb-24 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Nova aula</h1>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve text-base" />
        </div>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Início</label>
          <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve text-base" />
        </div>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Duração</label>
          <div className="px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-muted text-sm">
            02h30 (padrão) — término às {calculateEndTime()}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Total de vagas</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMaxStudents(n => Math.max(1, n - 1))}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text font-bold text-xl flex items-center justify-center">−</button>
            <span className="text-3xl font-display text-brand-text w-10 text-center">{maxStudents}</span>
            <button type="button" onClick={() => setMaxStudents(n => Math.min(20, n + 1))}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text font-bold text-xl flex items-center justify-center">+</button>
            <span className="text-sm text-brand-muted">aluna{maxStudents !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Vagas no torno</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setTornoSpots(n => Math.max(0, n - 1))}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text font-bold text-xl flex items-center justify-center">−</button>
            <span className="text-3xl font-display text-brand-text w-10 text-center">{tornoSpots}</span>
            <button type="button" onClick={() => setTornoSpots(n => Math.min(maxStudents, n + 1))}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text font-bold text-xl flex items-center justify-center">+</button>
            <span className="text-sm text-brand-muted">vaga{tornoSpots !== 1 ? 's' : ''} torno</span>
          </div>
          <p className="text-xs text-brand-muted mt-2">{maxStudents - tornoSpots} manual + {tornoSpots} torno</p>
        </div>

        {error && (
          <div className="bg-status-open-bg rounded-xl px-4 py-3">
            <p className="text-sm text-status-open-text">{error}</p>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-white border-t border-brand-line">
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 bg-brand-ink text-brand-cream rounded-xl font-medium text-base disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar aula'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function NovaAulaPage() {
  return (
    <Suspense>
      <NovaAulaContent />
    </Suspense>
  )
}