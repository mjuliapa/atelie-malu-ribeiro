'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatSlotTime, formatDate, cn } from '@/lib/utils'
import { parseISO, isPast, isToday } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import { AttendanceModal } from '@/components/admin/AttendanceModal'

type AttendanceRecord = {
  id: string
  status: string
}

type Appointment = {
  id: string
  status: string
  student_id: string
  modality: string
  profiles: { full_name: string } | null
  attendance: AttendanceRecord[] | AttendanceRecord | null
}

type Slot = {
  id: string
  start_time: string
  end_time: string
  max_students: number
  torno_spots: number
  is_blocked: boolean
  block_reason: string | null
  appointments: Appointment[]
}

export default function SlotPage() {
  const { id } = useParams()
  const router = useRouter()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(true)
  const [blockReason, setBlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [error, setError] = useState(false)

  async function load() {
    setError(false)
    try {
      const res = await fetch(`/api/admin/slots?id=${id}`)
      if (!res.ok) { setError(true); setLoading(false); return }
      const data = await res.json()
      if (!data || data.error) { setError(true); setLoading(false); return }
      setSlot(data as Slot)
      setBlockReason(data.block_reason ?? '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleBlock() {
    if (!slot) return
    setSaving(true)
    await fetch(`/api/admin/slots?id=${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_blocked: !slot.is_blocked,
        block_reason: slot.is_blocked ? null : blockReason.trim() || null,
      }),
    })
    await load()
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Excluir esta aula?')) return
    await fetch(`/api/admin/slots?id=${slot!.id}`, { method: 'DELETE' })
    router.back()
  }

  // normaliza attendance — pode vir como array ou objeto dependendo do Supabase
  function getAttendance(a: Appointment): AttendanceRecord | null {
    if (!a.attendance) return null
    if (Array.isArray(a.attendance)) return a.attendance[0] ?? null
    return a.attendance
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>
  if (error || !slot) return <div className="p-8 text-center text-brand-muted">Aula não encontrada.</div>

  const confirmed = slot.appointments?.filter(a => a.status === 'confirmed') ?? []
  const slotDate = parseISO(slot.start_time)
  const isPastSlot = isPast(slotDate)
  const isSlotToday = isToday(slotDate)

  return (
    <>
      <AdminNavHeader title="Aula" showBack />
      <div className="px-4 pt-4 pb-24 space-y-4">

        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="font-display text-xl text-brand-text">{formatSlotTime(slot.start_time, slot.end_time)}</p>
          <p className="text-sm text-brand-muted capitalize">{formatDate(slot.start_time, "EEEE, d 'de' MMMM")}</p>
          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-brand-cream px-2 py-1 rounded-full text-brand-muted">
              {confirmed.length}/{slot.max_students} alunas
            </span>
            <span className="text-xs bg-brand-cream px-2 py-1 rounded-full text-brand-muted">
              {slot.torno_spots} vaga{slot.torno_spots !== 1 ? 's' : ''} torno
            </span>
            {slot.is_blocked && (
              <span className="text-xs bg-status-open-bg text-status-open-text px-2 py-1 rounded-full">Bloqueada</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">Alunas agendadas</h2>
          {confirmed.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center shadow-card">
              <p className="text-sm text-brand-muted">Nenhuma aluna agendada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {confirmed.map(a => {
                const att = getAttendance(a)
                const attended = att?.status === 'present'
                const absent = att?.status === 'absent'
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-brand-mauve">
                        {a.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-brand-text">{a.profiles?.full_name ?? 'Aluna'}</p>
                      <p className="text-xs text-brand-muted">{a.modality === 'torno' ? '🏺 Torno' : '✋ Manual'}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                      att
                        ? (attended ? 'bg-status-paid-bg text-status-paid-text' : 'bg-status-open-bg text-status-open-text')
                        : 'bg-brand-cream text-brand-muted')}>
                      {att ? (attended ? '✓ Presente' : absent ? 'Falta' : 'Justificada') : 'Sem registro'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {(isPastSlot || isSlotToday) && !slot.is_blocked && confirmed.length > 0 && (
          <button onClick={() => setShowAttendance(true)}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm">
            ✓ Registrar presença
          </button>
        )}

        <div className="space-y-2">
          <h2 className="font-display text-base text-brand-text">
            {slot.is_blocked ? 'Desbloquear aula' : 'Bloquear aula'}
          </h2>
          {!slot.is_blocked && (
            <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          )}
          {slot.is_blocked && slot.block_reason && (
            <div className="bg-brand-cream rounded-xl p-4">
              <p className="text-sm text-brand-muted">Motivo: {slot.block_reason}</p>
            </div>
          )}
          <button onClick={handleBlock} disabled={saving}
            className={cn('w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50',
              slot.is_blocked
                ? 'bg-status-paid-bg text-status-paid-text border border-status-paid-text'
                : 'bg-white text-brand-muted border border-brand-line')}>
            {saving ? 'Salvando...' : slot.is_blocked ? 'Desbloquear' : 'Bloquear aula'}
          </button>
        </div>

        {confirmed.length === 0 && (
          <button onClick={handleDelete}
            className="w-full py-3 bg-white text-status-open-text border border-status-open-text rounded-xl font-medium text-sm">
            Excluir aula
          </button>
        )}
      </div>

      {showAttendance && (
        <AttendanceModal
          slot={slot as any}
          onClose={() => setShowAttendance(false)}
          onSaved={() => { setShowAttendance(false); load() }}
        />
      )}
    </>
  )
}