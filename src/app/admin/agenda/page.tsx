'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { ScheduleSlot, Appointment } from '@/types'
import { cn } from '@/lib/utils'
import {
  addDays, startOfWeek, format, isSameDay, parseISO, isToday, isPast,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SlotCard } from '@/components/admin/SlotCard'
import { useRouter } from 'next/navigation'

type ViewMode = 'week' | 'day'

export default function AdminAgendaPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null)

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const loadSlots = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_slots')
      .select(`*, appointments(id, status, student_id, profiles:student_id(full_name))`)
      .gte('start_time', `${from}T00:00:00`)
      .lte('start_time', `${to}T23:59:59`)
      .order('start_time')

    if (data) {
      const enriched = data.map((slot: ScheduleSlot & { appointments: Appointment[] }) => ({
        ...slot,
        confirmed_count: slot.appointments?.filter(a => a.status === 'confirmed').length ?? 0,
        available_spots: slot.max_students - (slot.appointments?.filter(a => a.status === 'confirmed').length ?? 0),
      }))
      setSlots(enriched)
    }
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadSlots() }, [loadSlots])

  function getSlotsForDay(day: Date) {
    return slots.filter(s => isSameDay(parseISO(s.start_time), day))
  }

  function handleDayClick(day: Date) {
    setCurrentDate(day)
    setViewMode('day')
  }

  function navigateWeek(d: -1 | 1) { setCurrentDate(c => addDays(c, d * 7)); setViewMode('week') }
  function navigateDay(d: -1 | 1) { setCurrentDate(c => addDays(c, d)) }

  const daySlots = getSlotsForDay(currentDate)

  return (
    <>
      <AdminNavHeader title="Agenda" />
      <div className="px-4 pt-4 space-y-4">

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  viewMode === v ? 'bg-brand-mauve text-white' : 'bg-white text-brand-muted border border-brand-line')}>
                {v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => viewMode === 'week' ? navigateWeek(-1) : navigateDay(-1)}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="text-xs text-brand-mauve font-medium">Hoje</button>
            <button onClick={() => viewMode === 'week' ? navigateWeek(1) : navigateDay(1)}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {viewMode === 'week' && (
          <>
            <div className="text-center">
              <p className="text-xs text-brand-muted">{format(weekStart, "'Semana de' d 'de' MMMM", { locale: ptBR })}</p>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => {
                const ds = getSlotsForDay(day)
                const pastDay = isPast(day) && !isToday(day)
                return (
                  <button key={day.toISOString()} onClick={() => handleDayClick(day)}
                    className={cn('flex flex-col items-center py-2 px-1 rounded-xl transition-colors min-h-[72px]',
                      isToday(day) ? 'bg-brand-mauve text-white' : pastDay ? 'bg-white/50 text-brand-muted/60' : 'bg-white text-brand-text hover:bg-brand-blush')}>
                    <span className="text-[10px] font-medium uppercase tracking-wide mb-1">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                    <span className={cn('text-lg font-semibold leading-none', isToday(day) && 'text-white')}>{format(day, 'd')}</span>
                    <div className="mt-1.5 flex flex-col items-center gap-0.5">
                      {ds.length > 0 ? ds.slice(0, 3).map(slot => (
                        <span key={slot.id} className={cn('w-1.5 h-1.5 rounded-full',
                          slot.is_blocked ? 'bg-status-cancelled-text' : (slot.available_spots ?? 0) === 0 ? 'bg-status-open-text' : isToday(day) ? 'bg-white' : 'bg-brand-mauve')} />
                      )) : <span className="text-[9px] text-brand-muted/50 mt-1">—</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-card space-y-3">
              <h3 className="font-display text-base text-brand-text">Esta semana</h3>
              {loading ? (
                [1,2].map(i => <div key={i} className="h-12 bg-brand-cream rounded-lg animate-pulse" />)
              ) : slots.length === 0 ? (
                <p className="text-sm text-brand-muted py-4 text-center">Nenhuma aula agendada.</p>
              ) : slots.map(slot => (
                <SlotCard key={slot.id} slot={slot} onSelect={() => router.push(`/admin/agenda/slot/${slot.id}`)} />
              ))}
            </div>
          </>
        )}

        {viewMode === 'day' && (
          <>
            <div className="text-center">
              <p className={cn('font-display text-lg', isToday(currentDate) ? 'text-brand-mauve' : 'text-brand-text')}>
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              {isToday(currentDate) && <span className="text-xs text-brand-mauve font-medium">Hoje</span>}
            </div>
            {loading ? (
              [1,2].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)
            ) : daySlots.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-card">
                <div className="text-4xl mb-3">🏺</div>
                <p className="text-brand-text font-display text-base mb-1">Nenhuma aula neste dia</p>
                <p className="text-sm text-brand-muted">Toque em "Nova aula" para criar um horário.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {daySlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} expanded
                    onSelect={() => router.push(`/admin/agenda/slot/${slot.id}`)}
                    onMarkAttendance={() => router.push(`/admin/agenda/slot/${slot.id}`)}
                    onBlock={() => router.push(`/admin/agenda/slot/${slot.id}`)}
                    onRefresh={loadSlots} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="fixed bottom-24 right-4">
          <button onClick={() => router.push(`/admin/agenda/nova-aula?date=${format(currentDate, 'yyyy-MM-dd')}`)}
            className="flex items-center gap-2 px-4 py-3 bg-brand-ink text-brand-cream rounded-full shadow-lg font-medium text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
            </svg>
            Nova aula
          </button>
        </div>
      </div>
    </>
  )
}