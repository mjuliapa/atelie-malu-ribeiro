'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleSlot } from '@/types'
import { formatDate, formatSlotTime, cn } from '@/lib/utils'
import {
  addDays, format, isSameDay, parseISO, isPast, isToday, startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ConfirmAgendamentoModal } from '@/components/aluno/ConfirmAgendamentoModal'
import { WaitlistModal } from '@/components/aluno/WaitlistModal'

const MAX_DAYS_AHEAD = 15

export default function AlunoAgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [myAppointments, setMyAppointments] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)

  const supabase = createClient()

  const availableDays = Array.from({ length: MAX_DAYS_AHEAD }, (_, i) =>
    addDays(startOfDay(new Date()), i)
  )

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const from = format(startOfDay(new Date()), 'yyyy-MM-dd')
    const to = format(addDays(new Date(), MAX_DAYS_AHEAD), 'yyyy-MM-dd')

    // Busca via API route (service role) — vê appointments de TODAS as alunas
    const res = await fetch(`/api/admin/slots?from=${from}&to=${to}`)
    const slotsData: any[] = await res.json()

    if (slotsData) {
      const enriched = slotsData
        .filter((s: any) => !s.is_blocked)
        .map((slot: any) => ({
          ...slot,
          confirmed_count: slot.appointments?.filter(
            (a: any) => a.status === 'confirmed'
          ).length ?? 0,
          available_spots:
            slot.max_students -
            (slot.appointments?.filter(
              (a: any) => a.status === 'confirmed'
            ).length ?? 0),
        }))
      setSlots(enriched)

      const myIds = new Set<string>()
      slotsData.forEach((slot: any) => {
        slot.appointments?.forEach((a: any) => {
          if (a.student_id === user.id && a.status === 'confirmed') {
            myIds.add(slot.id)
          }
        })
      })
      setMyAppointments(myIds)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  function getSlotsForDay(day: Date): ScheduleSlot[] {
    return slots.filter((s) => isSameDay(parseISO(s.start_time), day))
  }

  async function handleCancel(slotId: string) {
    if (!userId) return
    const confirmed = window.confirm('Cancelar este agendamento?')
    if (!confirmed) return

    await fetch('/api/admin/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        student_id: userId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        restore_credit: true,
      }),
    })

    loadData()
  }

  const daySlots = getSlotsForDay(selectedDate)

  return (
    <div className="pt-20 px-4 pb-4 space-y-4">
      <div className="pt-2">
        <h1 className="font-display text-2xl text-brand-text">Agenda</h1>
        <p className="text-sm text-brand-muted">Escolha um dia para ver os horários disponíveis.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {availableDays.map((day) => {
          const daySlotCount = getSlotsForDay(day)
          const hasAvailable = daySlotCount.some((s) => (s.available_spots ?? 0) > 0)
          const hasAny = daySlotCount.length > 0
          const isSelected = isSameDay(day, selectedDate)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-xl transition-colors flex-shrink-0',
                isSelected
                  ? 'bg-brand-ink text-brand-cream border border-brand-ink'
                  : 'bg-white text-brand-text border border-brand-line hover:border-brand-mauve'
              )}
            >
              <span className={cn('text-[10px] font-medium uppercase tracking-wide',
                isSelected ? 'text-white/80' : 'text-brand-muted')}>
                {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
              <span className="text-lg font-semibold leading-none my-0.5">
                {format(day, 'd')}
              </span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full mt-0.5',
                !hasAny ? 'bg-transparent'
                  : hasAvailable ? isSelected ? 'bg-white' : 'bg-brand-mauve'
                  : 'bg-brand-muted/40'
              )} />
            </button>
          )
        })}
      </div>

      <div>
        <p className="font-display text-lg text-brand-text capitalize">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        {isToday(selectedDate) && (
          <span className="text-xs text-brand-mauve font-medium">Hoje</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : daySlots.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-card">
          <div className="text-4xl mb-3">🏺</div>
          <p className="font-display text-base text-brand-text mb-1">Nenhuma aula disponível</p>
          <p className="text-sm text-brand-muted">Não há aulas neste dia. Tente outro horário.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {daySlots.map((slot) => {
            const isBooked = myAppointments.has(slot.id)
            const isFull = (slot.available_spots ?? 0) === 0
            const available = slot.available_spots ?? 0
            const past = isPast(parseISO(slot.start_time))

            return (
              <div key={slot.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-4">
                  <div className={cn(
                    'w-1 self-stretch rounded-full',
                    isBooked ? 'bg-status-paid-text' : isFull ? 'bg-status-open-text' : 'bg-brand-mauve'
                  )} />
                  <div className="flex-1">
                    <p className="font-display text-lg text-brand-text leading-none">
                      {formatSlotTime(slot.start_time, slot.end_time)}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {isBooked
                        ? '✓ Você está agendada'
                        : isFull
                          ? 'Turma completa'
                          : available === 1 ? '1 vaga disponível' : `${available} vagas disponíveis`
                      }
                    </p>
                  </div>
                  {!past && (
                    isBooked ? (
                      <button onClick={() => handleCancel(slot.id)}
                        className="text-xs px-3 py-1.5 bg-white border border-brand-line text-brand-muted rounded-lg hover:border-status-open-text hover:text-status-open-text transition-colors">
                        Cancelar
                      </button>
                    ) : isFull ? (
                      <button onClick={() => { setSelectedSlot(slot); setShowWaitlist(true) }}
                        className="text-xs px-3 py-1.5 bg-status-closed-bg text-status-closed-text border border-status-closed-text rounded-lg hover:opacity-80 transition-opacity">
                        Lista de espera
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedSlot(slot); setShowConfirm(true) }}
                        className="text-xs px-3 py-1.5 bg-brand-ink text-brand-cream rounded-lg hover:bg-brand-text transition-colors font-medium">
                        Agendar
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showConfirm && selectedSlot && userId && (
        <ConfirmAgendamentoModal
          slot={selectedSlot}
          userId={userId}
          onClose={() => { setShowConfirm(false); setSelectedSlot(null) }}
          onConfirmed={() => { setShowConfirm(false); setSelectedSlot(null); loadData() }}
        />
      )}

      {showWaitlist && selectedSlot && userId && (
        <WaitlistModal
          slot={selectedSlot}
          userId={userId}
          onClose={() => { setShowWaitlist(false); setSelectedSlot(null) }}
          onJoined={() => { setShowWaitlist(false); setSelectedSlot(null) }}
        />
      )}
    </div>
  )
}