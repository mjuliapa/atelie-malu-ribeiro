'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleSlot, Appointment, AttendanceStatus } from '@/types'
import { formatSlotTime, cn } from '@/lib/utils'

interface AttendanceModalProps {
  slot: ScheduleSlot
  onClose: () => void
  onSaved: () => void
}

interface AttendanceRecord {
  appointmentId: string
  studentName: string
  status: AttendanceStatus
  modality: 'manual' | 'torno'
  notes: string
  existingAttendanceId?: string
}

export function AttendanceModal({ slot, onClose, onSaved }: AttendanceModalProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, status, student_id, modality,
        profiles:student_id(full_name),
        attendance(id, status, notes)
      `)
      .eq('slot_id', slot.id)
      .eq('status', 'confirmed')

    if (data) {
      setRecords(
        data.map((a: any) => {
          const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
          return {
            appointmentId: a.id,
            studentName: profile?.full_name ?? 'Aluna',
            status: a.attendance?.[0]?.status ?? 'present',
            modality: a.modality ?? 'manual',
            notes: a.attendance?.[0]?.notes ?? '',
            existingAttendanceId: a.attendance?.[0]?.id,
          }
        })
      )
    }
    setLoading(false)
  }

  function updateRecord(appointmentId: string, field: string, value: string) {
    setRecords((prev) =>
      prev.map((r) =>
        r.appointmentId === appointmentId ? { ...r, [field]: value } : r
      )
    )
  }

  // quantas vagas de torno já usadas (excluindo o próprio registro)
  function tornoUsed(excludeId: string) {
    return records.filter(r => r.appointmentId !== excludeId && r.modality === 'torno').length
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    for (const record of records) {
      // atualiza modalidade no appointment
      await supabase.from('appointments')
        .update({ modality: record.modality })
        .eq('id', record.appointmentId)

      const payload = {
        appointment_id: record.appointmentId,
        status: record.status,
        notes: record.notes.trim() || null,
        recorded_by: user?.id,
        recorded_at: new Date().toISOString(),
      }

      if (record.existingAttendanceId) {
        await supabase.from('attendance').update(payload).eq('id', record.existingAttendanceId)
      } else {
        await supabase.from('attendance').insert(payload)
      }
    }

    setSaving(false)
    onSaved()
  }

  const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: 'present', label: 'Presente', color: 'bg-status-paid-bg text-status-paid-text border-status-paid-text' },
    { value: 'absent', label: 'Falta', color: 'bg-status-open-bg text-status-open-text border-status-open-text' },
    { value: 'justified', label: 'Justificada', color: 'bg-status-closed-bg text-status-closed-text border-status-closed-text' },
  ]

  const tornoSpots = slot.torno_spots ?? 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl z-10 max-h-[85vh] flex flex-col">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-brand-line rounded-full sm:hidden" />

        <div className="px-6 py-5 border-b border-brand-line flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-brand-text">Presença</h2>
            <p className="text-xs text-brand-muted">{formatSlotTime(slot.start_time, slot.end_time)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-text rounded-lg hover:bg-brand-cream transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-brand-cream rounded-xl animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-brand-muted">Nenhuma aluna agendada nesta aula.</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.appointmentId} className="bg-brand-cream rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-blush flex items-center justify-center">
                      <span className="text-sm font-medium text-brand-mauve">
                        {record.studentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-brand-text">{record.studentName}</span>
                  </div>

                  {/* Modalidade */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateRecord(record.appointmentId, 'modality', 'manual')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                        record.modality === 'manual'
                          ? 'bg-brand-ink text-brand-cream border-brand-ink'
                          : 'bg-white text-brand-muted border-brand-line'
                      )}>
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (record.modality !== 'torno' && tornoUsed(record.appointmentId) >= tornoSpots) return
                        updateRecord(record.appointmentId, 'modality', 'torno')
                      }}
                      disabled={record.modality !== 'torno' && tornoUsed(record.appointmentId) >= tornoSpots}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                        record.modality === 'torno'
                          ? 'bg-brand-mauve text-white border-brand-mauve'
                          : tornoUsed(record.appointmentId) >= tornoSpots
                            ? 'bg-white text-brand-muted/40 border-brand-line cursor-not-allowed'
                            : 'bg-white text-brand-muted border-brand-line'
                      )}>
                      Torno
                    </button>
                  </div>
                </div>

                {/* Status de presença */}
                <div className="flex gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateRecord(record.appointmentId, 'status', opt.value)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        record.status === opt.value
                          ? opt.color
                          : 'bg-white text-brand-muted border-brand-line hover:border-brand-sand'
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {record.status !== 'present' && (
                  <input
                    type="text"
                    value={record.notes}
                    onChange={(e) => updateRecord(record.appointmentId, 'notes', e.target.value)}
                    placeholder="Observação (opcional)"
                    className="w-full px-3 py-2 rounded-lg border border-brand-line bg-white text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-brand-line">
          {error && <p className="text-sm text-status-open-text mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 bg-white text-brand-muted border border-brand-line rounded-lg font-medium text-sm hover:bg-brand-cream transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || records.length === 0}
              className="flex-1 py-3 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar presença'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}